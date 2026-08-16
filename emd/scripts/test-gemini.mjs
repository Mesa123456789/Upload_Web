// scripts/test-deepseek-vs-gemini.mjs
// เปลี่ยนส่วน deepseek client เป็นผ่าน 9Router แทน

import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'

const GEMINI_KEY = process.env.GEMINI_API_KEY1
if (!GEMINI_KEY) {
  console.error('❌ ไม่เจอ GEMINI_API_KEY')
  process.exit(1)
}

const gemini = new GoogleGenAI({ apiKey: GEMINI_KEY })

// ── ผ่าน 9Router local proxy — ไม่ต้องมี DeepSeek API key จริง ──
const deepseek = new OpenAI({
  apiKey: 'sk-dummy-9router-key', // 9Router จัดการ auth ให้เอง ไม่ต้องใส่ key จริง
  baseURL: 'http://localhost:20128/v1',
})

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

async function askGemini(message) {
  const t0 = Date.now()
  try {
    const res = await gemini.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7, maxOutputTokens: 800 },
    })
    const ms = Date.now() - t0
    const u = res.usageMetadata
    return { ok: true, text: res.text ?? '', ms, tokens: u?.totalTokenCount ?? 0 }
  } catch (err) {
    return { ok: false, error: err?.message || String(err), ms: Date.now() - t0 }
  }
}

async function askDeepSeek(message) {
  const t0 = Date.now()
  try {
    const res = await deepseek.chat.completions.create({
      // model id ผ่าน 9Router อาจต้องมี prefix เช่น 'oc/deepseek-v4-flash-free'
      // ลองชื่อนี้ก่อน ถ้า error "model not found" ให้เช็คชื่อจริงจาก 9Router dashboard/docs
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })
    const ms = Date.now() - t0
    return {
      ok: true,
      text: res.choices?.[0]?.message?.content ?? '',
      ms,
      tokens: res.usage?.total_tokens ?? 0,
    }
  } catch (err) {
    return { ok: false, error: err?.message || String(err), ms: Date.now() - t0 }
  }
}

async function main() {
  console.log('═'.repeat(70))
  console.log('ชน DeepSeek (ผ่าน 9Router local)  vs  Gemini 3.1 Flash Lite')
  console.log('═'.repeat(70))

  const stats = {
    deepseek: { totalMs: 0, totalTokens: 0, fails: 0, count: 0 },
    gemini: { totalMs: 0, totalTokens: 0, fails: 0, count: 0 },
  }

  for (const tc of TEST_CASES) {
    console.log(`\n\n${'─'.repeat(70)}`)
    console.log(`หมวด: ${tc.label}`)
    console.log(`คำถาม: ${tc.q}`)
    console.log('─'.repeat(70))

    const d = await askDeepSeek(tc.q)
    console.log(`\n🐋 [deepseek via 9router]`)
    if (d.ok) {
      console.log(`  ⏱️  ${d.ms}ms | token: ${d.tokens}`)
      console.log(`  💬 ${d.text.trim()}`)
      stats.deepseek.totalMs += d.ms
      stats.deepseek.totalTokens += d.tokens
    } else {
      console.log(`  ❌ ${d.error}`)
      stats.deepseek.fails++
    }
    stats.deepseek.count++
    await sleep(1500)

    const g = await askGemini(tc.q)
    console.log(`\n✨ [gemini-3.1-flash-lite]`)
    if (g.ok) {
      console.log(`  ⏱️  ${g.ms}ms | token: ${g.tokens}`)
      console.log(`  💬 ${g.text.trim()}`)
      stats.gemini.totalMs += g.ms
      stats.gemini.totalTokens += g.tokens
    } else {
      console.log(`  ❌ ${g.error}`)
      stats.gemini.fails++
    }
    stats.gemini.count++
    await sleep(1500)
  }

  console.log(`\n\n${'═'.repeat(70)}`)
  console.log('สรุปผลรวม')
  console.log('═'.repeat(70))
  for (const [name, s] of Object.entries(stats)) {
    const okCount = s.count - s.fails
    const avgMs = okCount > 0 ? Math.round(s.totalMs / okCount) : 0
    const avgTokens = okCount > 0 ? Math.round(s.totalTokens / okCount) : 0
    console.log(`\n[${name}]`)
    console.log(`  สำเร็จ: ${okCount}/${s.count} | fail: ${s.fails}`)
    console.log(`  เฉลี่ย: ${avgMs}ms | ${avgTokens} token/คำถาม`)
  }
  console.log('\n✓ เทสเสร็จ')
}

main()