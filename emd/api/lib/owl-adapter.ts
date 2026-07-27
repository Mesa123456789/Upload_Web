import type { AiProvider, GenerateParams, GenerateResult, StreamChunk } from './ai-provider.js'
 
const MODEL_ID = 'openrouter/owl-alpha'
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
 
// แปลง role: Gemini ใช้ 'model' ส่วน OpenAI-compatible ใช้ 'assistant'
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
 
async function generate(params: GenerateParams, maxRetries = 3): Promise<GenerateResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('ไม่พบ OPENROUTER_API_KEY — ต้องตั้งค่าก่อนใช้ Owl Alpha')
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
        providerName: 'owl-alpha',
      }
    }
 
    // retry เฉพาะ 503/429 (overload/rate limit) — error อื่นโยนทันที
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
      continue
    }
    const errText = await res.text().catch(() => '')
    throw new Error(`Owl Alpha API error ${res.status}: ${errText}`)
  }
  throw new Error('Owl Alpha: เกินจำนวนครั้ง retry สูงสุด')
}

async function* generateStream(params: GenerateParams): AsyncGenerator<StreamChunk> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('ไม่พบ OPENROUTER_API_KEY — ต้องตั้งค่าก่อนใช้ Owl Alpha')

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
    throw new Error(`Owl Alpha API error ${res.status}: ${errText}`)
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
        // chunk parse ไม่ออก ข้ามไป
      }
    }
  } 
  yield { text: '', done: true }
}
export const owlProvider: AiProvider = {
  name: 'owl-alpha',
  generate,
  generateStream,
}