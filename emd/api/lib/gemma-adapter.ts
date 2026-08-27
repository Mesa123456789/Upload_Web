import { GoogleGenAI } from '@google/genai'
import type { AiProvider, GenerateParams, GenerateResult, StreamChunk } from './ai-provider.js'

// Gemma runs through the same Gemini API client/key as gemini-adapter.ts — it's a different
// model id on the same API, not a separate credential or service, so no extra env var is needed.
const MODEL_ID = 'gemma-4-26b-a4b-it'

// Gemma's replies run noticeably longer than Gemini's and got cut off mid-sentence in testing
// with lower limits — always give it at least this many output tokens, regardless of what the
// caller asked for.
const MIN_MAX_OUTPUT_TOKENS = 2048

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean) as string[]

if (API_KEYS.length === 0) {
  console.error('[gemma] No GEMINI_API_KEY found — check .env')
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

// Randomize the key start index so concurrent serverless instances don't all hammer key0 first
// (same reasoning as gemini-adapter.ts's buildKeyOrder — see that file for the full explanation).
function buildKeyOrder(): number[] {
  const start = Math.floor(Math.random() * API_KEYS.length)
  return API_KEYS.map((_, i) => (start + i) % API_KEYS.length)
}

// Gemma does not reliably honor a separate systemInstruction field the way Gemini does — fold it
// into the first turn's text instead. Matches the working pattern verified in
// scripts/test-all-models.mjs's buildRequest() during model comparison testing.
function buildContents(params: GenerateParams): GenerateParams['contents'] {
  const [first, ...rest] = params.contents
  const firstText = first?.parts.map((p) => p.text).join('\n') ?? ''
  const merged = {
    role: first?.role ?? ('user' as const),
    parts: [{ text: `${params.systemInstruction}\n\n---\n${firstText}` }],
  }
  return [merged, ...rest]
}

function resolveMaxOutputTokens(params: GenerateParams): number {
  return Math.max(params.maxOutputTokens ?? 0, MIN_MAX_OUTPUT_TOKENS)
}

async function generate(params: GenerateParams): Promise<GenerateResult> {
  let lastError: any = null
  const contents = buildContents(params)
  const keyOrder = buildKeyOrder()

  for (const i of keyOrder) {
    const ai = getClient(API_KEYS[i])
    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents,
        config: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: resolveMaxOutputTokens(params),
        },
      })
      console.log(`[gemma] request served by key${i + 1}`)
      return {
        text: response.text ?? '',
        usage: response.usageMetadata ?? null,
        providerName: 'gemma',
      }
    } catch (err: any) {
      lastError = err
      if (isQuotaError(err)) {
        console.warn(`[gemma] key${i + 1} quota exhausted, trying next key`)
        continue
      }
      if (isOverloadError(err)) {
        console.warn(`[gemma] key${i + 1} overloaded (503), trying next key`)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err // other errors don't rotate keys
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error('โควต้า Gemma หมดทุก key แล้ววันนี้ ลองใหม่พรุ่งนี้')
  }
  throw lastError ?? new Error('Gemma: ไม่สามารถตอบได้')
}

async function* generateStream(params: GenerateParams): AsyncGenerator<StreamChunk> {
  let lastError: any = null
  const contents = buildContents(params)
  const keyOrder = buildKeyOrder()

  for (const i of keyOrder) {
    const ai = getClient(API_KEYS[i])
    try {
      let finalUsage: unknown = null

      const streamResponse = await ai.models.generateContentStream({
        model: MODEL_ID,
        contents,
        config: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: resolveMaxOutputTokens(params),
        },
      })

      for await (const chunk of streamResponse) {
        const text = chunk.text ?? ''
        if (chunk.usageMetadata) finalUsage = chunk.usageMetadata
        if (text) yield { text, done: false }
      }

      console.log(`[gemma-stream] request served by key${i + 1}`)
      yield { text: '', done: true, usage: finalUsage }
      return // success — exit both loops

    } catch (err: any) {
      lastError = err
      if (isQuotaError(err)) {
        console.warn(`[gemma-stream] key${i + 1} quota exhausted, trying next key`)
        continue
      }
      if (isOverloadError(err)) {
        console.warn(`[gemma-stream] key${i + 1} overloaded, trying next key`)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error('โควต้า Gemma หมดทุก key แล้ววันนี้ ลองใหม่พรุ่งนี้')
  }
  throw lastError ?? new Error('Gemma: ไม่สามารถตอบได้')
}

export const gemmaProvider: AiProvider = {
  name: 'gemma',
  generate,
  generateStream,
}
