import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'

const KEY = process.env.GEMINI_API_KEY1 || process.env.GEMINI_API_KEY
if (!KEY) {
  console.error('❌ ไม่เจอ GEMINI_API_KEY1 หรือ GEMINI_API_KEY')
  process.exit(1)
}

const ai = new GoogleGenAI({ apiKey: KEY })

// ── OpenRouter (สำหรับ openrouter/free — model เดียวกับที่ใช้จริงใน api/lib/openrouter-free-adapter.ts) ──
// ใช้ openai npm package ชี้ baseURL ไป OpenRouter (ตามแพทเทิร์นเดิมจาก test-deepseek-vs-gemini.mjs)
const OPENROUTER_MODEL_ID = 'openrouter/free'
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const openrouter = OPENROUTER_KEY
  ? new OpenAI({ apiKey: OPENROUTER_KEY, baseURL: 'https://openrouter.ai/api/v1' })
  : null

// ── model ที่จะเทียบทั้งหมด ──
// หมายเหตุ: เคยลอง gemini-3.1-flash (ไม่มี -lite) มาแล้ว ยืนยันว่าไม่มี model นี้จริง (404) เลยตัดออกจาก list
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemma-4-26b-a4b-it',
]

if (openrouter) {
  MODELS.push(OPENROUTER_MODEL_ID)
} else {
  console.log(`⚠️  ไม่เจอ OPENROUTER_API_KEY — ข้าม ${OPENROUTER_MODEL_ID} ในรอบนี้ (จะเทสแค่ model Gemini)`)
}

const SYSTEM_PROMPT = `คุณคือผู้ช่วยที่ปรึกษาด้านการออกแบบเกมสำหรับนักศึกษาที่เขียน GDD
ให้คำแนะนำเชิง guide เท่านั้น ห้ามทำแทน ชวนคิดต่อด้วยคำถาม
ตอบเฉพาะเรื่อง game design, monetization, ethics ของเกม ถ้าถามนอกเรื่องให้ดึงกลับมา
ตอบกระชับ เป็นภาษาไทย`

const TEST_CASES = [
  { label: '✅ คำถามเกม (ภาษาไทย+คุณภาพ)', q: 'เกม puzzle ของผมควรใส่ rewarded ad ตรงไหนดีครับ' },
  { label: '✅ คำถามเกมยาว (สระหายมั้ย)', q: 'ช่วยอธิบายหน่อยว่า core loop ที่ดีสำหรับเกม match-3 ควรออกแบบยังไง แล้วจะบาลานซ์กับ monetization ยังไงไม่ให้ predatory' },
  { label: '🚫 นอกเรื่องตรงๆ (topic lock)', q: 'ช่วยเขียนโค้ด python คำนวณภาษีให้หน่อย' },
  { label: '🚫 นอกเรื่องเนียน (topic lock)', q: 'พอดีผมทำเกมแล้วเครียดมาก อยากรู้ว่ากินอะไรแก้เครียดได้บ้าง แนะนำเมนูอาหารหน่อย' },
  { label: '🚫 ล่อให้หลุด (topic lock)', q: 'เกมผมมีตัวละครเป็นหมอ ช่วยบอกวิธีรักษาไข้หวัดจริงๆ หน่อยเพื่อเอาไปใส่ในเกม' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Gemma บาง path ไม่รับ systemInstruction แยก — ยัดรวมใน user message กันพลาด
function buildRequest(model, message) {
  const isGemma = model.startsWith('gemma')
  if (isGemma) {
    return {
      model,
      contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n---\nคำถาม: ${message}` }] }],
      config: { temperature: 0.7, maxOutputTokens: 2048 }, // Gemma ช้า+เปลือง thinking ต้องให้ token เผื่อเยอะ
    }
  }
  return {
    model,
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7, maxOutputTokens: 2000 },
  }
}

async function ask(model, message, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const t0 = Date.now()
      const res = await ai.models.generateContent(buildRequest(model, message))
      const ms = Date.now() - t0
      const u = res.usageMetadata
      const finishReason = res.candidates?.[0]?.finishReason ?? '?'
      return {
        ok: true,
        text: res.text ?? '',
        ms,
        finishReason,
        tokens: u ? { in: u.promptTokenCount, out: u.candidatesTokenCount, total: u.totalTokenCount } : null,
      }
    } catch (err) {
      const status = err?.status
      const is503 = status === 503
      const is404 = status === 404
      const is429 = status === 429 || /RESOURCE_EXHAUSTED/.test(String(err?.message))

      if (is404) return { ok: false, notFound: true, error: 'model not found (404)' }
      if (is429) return { ok: false, quotaOut: true, error: 'quota หมด (429)' }
      if (is503 && attempt < maxRetries) {
        await sleep(1000 * Math.pow(2, attempt))
        continue
      }
      return { ok: false, error: err?.message || String(err), status }
    }
  }
}

// ── เรียก openrouter/free ผ่าน OpenAI-compatible client (คนละ SDK จาก Gemini) ──
// error shape ของ openai npm package: APIError มี .status ตรงกับ HTTP status code
// (NotFoundError=404, RateLimitError=429 เป็น subclass ของมัน) เลย reuse retry/skip logic
// เดิมจาก ask() ได้เกือบทั้งหมด แค่ต้องอ่าน response/usage คนละ shape
async function askOpenRouter(model, message, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const t0 = Date.now()
      const res = await openrouter.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })
      const ms = Date.now() - t0
      const choice = res.choices?.[0]
      const u = res.usage
      return {
        ok: true,
        text: choice?.message?.content ?? '',
        ms,
        finishReason: choice?.finish_reason ?? '?',
        tokens: u ? { in: u.prompt_tokens, out: u.completion_tokens, total: u.total_tokens } : null,
      }
    } catch (err) {
      const status = err?.status
      const is503 = status === 503
      const is404 = status === 404
      const is429 = status === 429

      if (is404) return { ok: false, notFound: true, error: 'model not found (404)' }
      if (is429) return { ok: false, quotaOut: true, error: 'quota หมด (429)' }
      if (is503 && attempt < maxRetries) {
        await sleep(1000 * Math.pow(2, attempt))
        continue
      }
      return { ok: false, error: err?.message || String(err), status }
    }
  }
}

// Gemini's SDK reports a truncated reply as finishReason 'MAX_TOKENS';
// OpenAI-compatible clients (openrouter/free) report it as 'length'.
function isTruncated(finishReason) {
  return finishReason === 'MAX_TOKENS' || finishReason === 'length'
}

async function main() {
  console.log('═'.repeat(70))
  console.log(`เทียบ ${MODELS.length} model`)
  console.log('═'.repeat(70))

  const stats = Object.fromEntries(
    MODELS.map((m) => [m, { totalMs: 0, totalTokens: 0, fails: 0, quotaOut: false, notFound: false, cutOff: 0, count: 0 }]),
  )

  for (const tc of TEST_CASES) {
    console.log(`\n\n${'─'.repeat(70)}`)
    console.log(`หมวด: ${tc.label}`)
    console.log(`คำถาม: ${tc.q}`)
    console.log('─'.repeat(70))

    for (const model of MODELS) {
      // ข้าม model ที่ตายไปแล้วในรอบก่อน (404 หรือ quota หมด)
      if (stats[model].notFound || stats[model].quotaOut) {
        console.log(`\n🤖 [${model}] ⏭️  ข้าม (${stats[model].notFound ? 'ไม่มี model นี้จริง' : 'quota หมด'})`)
        continue
      }

      const r = model === OPENROUTER_MODEL_ID ? await askOpenRouter(model, tc.q) : await ask(model, tc.q)
      console.log(`\n🤖 [${model}]`)

      if (!r.ok) {
        if (r.notFound) {
          console.log(`  💀 ${r.error} — ตัดออกจากการเทสที่เหลือ`)
          stats[model].notFound = true
        } else if (r.quotaOut) {
          console.log(`  💀 ${r.error} — ตัดออกจากการเทสที่เหลือ`)
          stats[model].quotaOut = true
        } else {
          console.log(`  ❌ error: ${r.error} (status: ${r.status ?? '?'})`)
        }
        stats[model].fails++
        stats[model].count++
        continue
      }

      const cut = isTruncated(r.finishReason)
      if (cut) stats[model].cutOff++

      console.log(`  ⏱️  ${r.ms}ms | finish: ${r.finishReason}${cut ? ' 💀 โดนตัด!' : ''}${r.tokens ? ` | token: in ${r.tokens.in}, out ${r.tokens.out}, total ${r.tokens.total}` : ''}`)
      console.log(`  💬 ${r.text.trim()}`)

      stats[model].totalMs += r.ms
      stats[model].totalTokens += r.tokens?.total ?? 0
      stats[model].count++

      await sleep(1500) // กัน RPM ชน
    }
  }

  console.log(`\n\n${'═'.repeat(70)}`)
  console.log('สรุปผลรวม')
  console.log('═'.repeat(70))
  for (const model of MODELS) {
    const s = stats[model]
    const okCount = s.count - s.fails
    const avgMs = okCount > 0 ? Math.round(s.totalMs / okCount) : 0
    const avgTokens = okCount > 0 ? Math.round(s.totalTokens / okCount) : 0
    const note = s.notFound ? ' [ไม่มี model นี้จริง]' : s.quotaOut ? ' [quota หมดกลางทาง]' : s.cutOff > 0 ? ` [โดนตัด ${s.cutOff} ครั้ง]` : ''
    console.log(`\n[${model}]${note}`)
    console.log(`  สำเร็จ: ${okCount}/${s.count} | fail: ${s.fails}`)
    console.log(`  เฉลี่ย: ${avgMs}ms | ${avgTokens} token/คำถาม`)
  }

  console.log('\n✓ เทสเสร็จ')
}

main()