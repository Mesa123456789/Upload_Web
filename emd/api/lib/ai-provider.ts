export interface GenerateParams {
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  systemInstruction: string
  temperature?: number
  maxOutputTokens?: number
}
 
export interface GenerateResult {
  text: string
  usage: unknown
  providerName: string   // ชื่อ provider ที่ตอบจริง (เก็บลง DB ตอน save suggestion)
}

export interface StreamChunk {
  text: string
  done: boolean
  usage?: unknown
}
 
export interface AiProvider {
  name: string
  generate(params: GenerateParams): Promise<GenerateResult>
  generateStream?(params: GenerateParams): AsyncGenerator<StreamChunk>
}
 
// ── เลือก provider จาก env var ──
// AI_PROVIDER=gemini (default) หรือ AI_PROVIDER=owl-alpha
export function getProviderName(): string {
  return process.env.AI_PROVIDER?.trim() || 'gemini'
}
 
const KNOWN_PROVIDERS = ['gemini', 'owl-alpha']
 
// ── คืน adapter จริงตามชื่อ provider ──
// overrideName: ใช้ตอนปุ่มสลับฝั่ง dev ส่ง provider มาทาง request body โดยตรง
//   - ถ้าส่งมาและเป็นชื่อที่รู้จัก (อยู่ใน KNOWN_PROVIDERS) → ใช้ตัวนั้นทันที ไม่ต้อง restart server
//   - ถ้าไม่ส่งมา หรือส่งมาแต่ไม่รู้จัก → fallback ไป env var ตามปกติ (พฤติกรรม production)
// import แบบ dynamic-style (lazy require) กันปัญหา circular import
// เพราะ adapter แต่ละตัว import type จากไฟล์นี้
export async function getProvider(overrideName?: string): Promise<AiProvider> {
  const name =
    overrideName && KNOWN_PROVIDERS.includes(overrideName) ? overrideName : getProviderName()
 
  if (name === 'owl-alpha') {
    const { owlProvider } = await import('./owl-adapter.js')
    return owlProvider
  }
  const { geminiProvider } = await import('./gemini-adapter.js')
  return geminiProvider
}