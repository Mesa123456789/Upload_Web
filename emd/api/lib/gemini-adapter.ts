import { GoogleGenAI } from '@google/genai'
import type { AiProvider, GenerateParams, GenerateResult, StreamChunk } from './ai-provider.js'

// Model fallback chain — tried in order per request. Falls through to the
// next model once the current one has exhausted every API key (not on the
// first error from a single key; that's handled by the key rotation below).
const MODEL_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
]

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean) as string[]

if (API_KEYS.length === 0) {
  console.error('[gemini] ไม่พบ GEMINI_API_KEY ใดๆ เลย — เช็ค .env ด้วย')
}

const clients = new Map<string, GoogleGenAI>()

function getClient(apiKey: string): GoogleGenAI {
  if (!clients.has(apiKey)) {
    clients.set(apiKey, new GoogleGenAI({ apiKey }))
  }
  return clients.get(apiKey)!
}

function isQuotaError(err: any): boolean {
  return err?.status === 429 || /RESOURCE_EXHAUSTED/.test(String(err?.message))
}

function isOverloadError(err: any): boolean {
  return err?.status === 503 || /503/.test(String(err?.message))
}

// ── สร้างลำดับ key ที่จะลอง โดยสุ่ม start index ──
// ทำไมต้องสุ่ม: Vercel serverless spawn instance ใหม่ทุก request
// ถ้าเริ่มจาก key0 เสมอ ทุก request จะกระแทก key0 พร้อมกัน → key0 เจอ 429 เร็ว
// สุ่ม start ช่วยกระจายโหลดข้าม key ตั้งแต่ request แรก = RPM รวมสูงขึ้นจริง
// (round-robin ด้วย counter ใช้ไม่ได้เพราะ state ไม่ persist ข้าม request)
function buildKeyOrder(): number[] {
  const start = Math.floor(Math.random() * API_KEYS.length)
  return API_KEYS.map((_, i) => (start + i) % API_KEYS.length)
}

// ── ยิงทีละ model → ยิงทีละ key ในแต่ละ model → model ถัดไปถ้า key หมดทั้งชุด ──
async function generate(params: GenerateParams): Promise<GenerateResult> {
  let lastError: any = null

  for (const modelId of MODEL_CHAIN) {
    const keyOrder = buildKeyOrder()
    for (const i of keyOrder) {
      const ai = getClient(API_KEYS[i])
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.7,
            // model ที่ "ฉลาดกว่า" (3.5 Flash) มัก thinking-heavy — กัน token หมดกลางคัน
            maxOutputTokens: modelId === 'gemini-3.5-flash'
              ? 3000
              : (params.maxOutputTokens ?? 1500),
          },
        })
        // Model/key are server-side debug info only — never leak them in
        // providerName, since that value flows to the frontend badge and
        // gets saved to the DB.
        console.log(`[gemini] request served by ${modelId} key${i + 1}`)
        return {
          text: response.text ?? '',
          usage: response.usageMetadata ?? null,
          providerName: 'gemini',
        }
      } catch (err: any) {
        lastError = err
        if (isQuotaError(err)) {
          console.warn(`[gemini] ${modelId} key${i + 1} quota หมด → ลอง key ถัดไป`)
          continue
        }
        if (isOverloadError(err)) {
          console.warn(`[gemini] ${modelId} key${i + 1} server แน่น (503) → ลอง key ถัดไป`)
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
        throw err // error อื่นไม่ rotate
      }
    }
    console.warn(`[gemini] ${modelId} หมดทุก key → ลอง model ถัดไปใน chain`)
  }

  if (isQuotaError(lastError)) {
    throw new Error('โควต้า Gemini หมดทุก model ทุก key แล้ววันนี้ ลองใหม่พรุ่งนี้')
  }
  throw lastError ?? new Error('Gemini: ไม่สามารถตอบได้')
}

// ── generateStream: logic เดียวกัน วนทั้ง model chain + key ──
async function* generateStream(params: GenerateParams): AsyncGenerator<StreamChunk> {
  let lastError: any = null

  for (const modelId of MODEL_CHAIN) {
    const keyOrder = buildKeyOrder()
    for (const i of keyOrder) {
      const ai = getClient(API_KEYS[i])
      try {
        let finalUsage: unknown = null

        const streamResponse = await ai.models.generateContentStream({
          model: modelId,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.7,
            maxOutputTokens: modelId === 'gemini-3.5-flash'
              ? 3000
              : (params.maxOutputTokens ?? 1500),
          },
        })

        for await (const chunk of streamResponse) {
          const text = chunk.text ?? ''
          if (chunk.usageMetadata) finalUsage = chunk.usageMetadata
          if (text) yield { text, done: false }
        }

        console.log(`[gemini-stream] request served by ${modelId} key${i + 1}`)
        yield { text: '', done: true, usage: finalUsage }
        return // สำเร็จ ออกจากทั้ง 2 loop เลย

      } catch (err: any) {
        lastError = err
        if (isQuotaError(err)) {
          console.warn(`[gemini-stream] ${modelId} key${i + 1} quota หมด → ลอง key ถัดไป`)
          continue
        }
        if (isOverloadError(err)) {
          console.warn(`[gemini-stream] ${modelId} key${i + 1} server แน่น → ลอง key ถัดไป`)
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
        throw err
      }
    }
    console.warn(`[gemini-stream] ${modelId} หมดทุก key → ลอง model ถัดไปใน chain`)
  }

  if (isQuotaError(lastError)) {
    throw new Error('โควต้า Gemini หมดทุก model ทุก key แล้ววันนี้ ลองใหม่พรุ่งนี้')
  }
  throw lastError ?? new Error('Gemini: ไม่สามารถตอบได้')
}

export const geminiProvider: AiProvider = {
  name: 'gemini',
  generate,
  generateStream,
}
