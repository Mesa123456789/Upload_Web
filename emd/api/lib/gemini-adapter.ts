import { GoogleGenAI } from '@google/genai'
import type { AiProvider, GenerateParams, GenerateResult, StreamChunk } from './ai-provider.js'

const MODEL_ID = 'gemini-2.5-flash'

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
  const order: number[] = []
  for (let i = 0; i < API_KEYS.length; i++) {
    order.push((start + i) % API_KEYS.length)
  }
  return order
}

async function generate(params: GenerateParams): Promise<GenerateResult> {
  let lastError: any = null
  const keyOrder = buildKeyOrder()

  for (const i of keyOrder) {
    const ai = getClient(API_KEYS[i])
    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxOutputTokens ?? 1500,
        },
      })
      return {
        text: response.text ?? '',
        usage: response.usageMetadata ?? null,
        providerName: `gemini(key${i + 1})`,
      }
    } catch (err: any) {
      lastError = err
      if (isQuotaError(err)) {
        console.warn(`[gemini] key${i + 1} quota หมด → ลอง key ถัดไป`)
        continue
      }
      if (isOverloadError(err)) {
        console.warn(`[gemini] key${i + 1} server แน่น (503) → ลอง key ถัดไป`)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error('โควต้า Gemini หมดทุก key แล้ววันนี้ ลองใหม่พรุ่งนี้')
  }
  throw lastError ?? new Error('Gemini: ไม่สามารถตอบได้')
}

async function* generateStream(params: GenerateParams): AsyncGenerator<StreamChunk> {
  let lastError: any = null
  const keyOrder = buildKeyOrder()

  for (const i of keyOrder) {
    const ai = getClient(API_KEYS[i])
    try {
      let finalUsage: unknown = null

      const streamResponse = await ai.models.generateContentStream({
        model: MODEL_ID,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxOutputTokens ?? 1500,
        },
      })

      for await (const chunk of streamResponse) {
        const text = chunk.text ?? ''
        if (chunk.usageMetadata) finalUsage = chunk.usageMetadata
        if (text) yield { text, done: false }
      }

      yield { text: '', done: true, usage: finalUsage }
      return

    } catch (err: any) {
      lastError = err
      if (isQuotaError(err)) {
        console.warn(`[gemini-stream] key${i + 1} quota หมด → ลอง key ถัดไป`)
        continue
      }
      if (isOverloadError(err)) {
        console.warn(`[gemini-stream] key${i + 1} server แน่น → ลอง key ถัดไป`)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error('โควต้า Gemini หมดทุก key แล้ววันนี้ ลองใหม่พรุ่งนี้')
  }
  throw lastError ?? new Error('Gemini: ไม่สามารถตอบได้')
}

export const geminiProvider: AiProvider = {
  name: 'gemini',
  generate,
  generateStream,
}