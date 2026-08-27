import type { AiProvider, GenerateParams, GenerateResult, StreamChunk } from './ai-provider.js'

// OpenRouter's Free Models Router — automatically routes to whichever free
// model is currently available, instead of pinning a specific `:free` slug.
// Free-tier slugs on OpenRouter rotate unpredictably (a pinned slug like the
// old `meta-llama/llama-3.3-70b-instruct:free` can die with a 404 at any
// time), so this is the more resilient choice for an "alternate free option"
// in the chat UI's provider selector.
const MODEL_ID = 'openrouter/free'
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// Convert role: Gemini uses 'model', OpenAI-compatible APIs use 'assistant'
function toOpenAiMessages(params: GenerateParams) {
  const messages = [{ role: 'system', content: params.systemInstruction }]
  for (const c of params.contents) {
    messages.push({
      role: c.role === 'model' ? 'assistant' : 'user',
      content: c.parts.map((p) => p.text).join('\n'),
    })
  }
  return messages
}

// A 404 whose body mentions "unavailable for free" means the underlying free
// model the router picked just died — surface a message a non-developer can
// act on instead of the raw OpenRouter error body.
function buildErrorForStatus(status: number, errText: string): Error {
  if (status === 404 && /unavailable for free/i.test(errText)) {
    return new Error('โมเดลฟรีตัวนี้ไม่พร้อมใช้งานแล้ว ลองใหม่อีกครั้งหรือสลับ provider')
  }
  return new Error(`OpenRouter Free API error ${status}: ${errText}`)
}

async function generate(params: GenerateParams, maxRetries = 3): Promise<GenerateResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('ไม่พบ OPENROUTER_API_KEY — ต้องตั้งค่าก่อนใช้ OpenRouter Free')
  }

  const body = {
    model: MODEL_ID,
    messages: toOpenAiMessages(params),
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxOutputTokens ?? 1500,
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: unknown
      }
      return {
        text: data.choices?.[0]?.message?.content ?? '',
        usage: data.usage ?? null,
        providerName: 'openrouter-free',
      }
    }

    // Retry only on 503/429 (overload/rate limit) — other errors throw immediately
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
      continue
    }
    const errText = await res.text().catch(() => '')
    throw buildErrorForStatus(res.status, errText)
  }
  throw new Error('OpenRouter Free: เกินจำนวนครั้ง retry สูงสุด')
}

async function* generateStream(params: GenerateParams): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('ไม่พบ OPENROUTER_API_KEY — ต้องตั้งค่าก่อนใช้ OpenRouter Free')

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: MODEL_ID,
      messages: toOpenAiMessages(params),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxOutputTokens ?? 1500,
      stream: true
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw buildErrorForStatus(res.status, errText)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true})
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        yield { text: '', done: true }
        return
      }
      try {
        const parsed = JSON.parse(data)
        const text = parsed.choices?.[0]?.delta?.content ?? ''
        if (text) yield { text, done: false }
      } catch {
        // Chunk failed to parse — skip it
      }
    }
  }
  yield { text: '', done: true }
}
export const openrouterFreeProvider: AiProvider = {
  name: 'openrouter-free',
  generate,
  generateStream,
}
