import {
  getProject,
  getAdsConfig,
  listAdPlacements,
  getIapConfig,
  listIapItems,
} from './projects.service'
import { supabase } from '../../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
  id?: string
}

export interface GddContext {
  title: string
  genre: string[]
  platform: string[]
  target_audience: string | null
  core_mechanic: string | null
  session_length: string | null
  current_step: number
  ads?: {
    ad_network: string | null
    revenue_model: string | null
    placements: Array<{
      placement_type: string
      trigger_point: string | null
      frequency_cap: number | null
    }>
  }
  iap?: {
    store: string | null
    items: Array<{
      name: string
      item_type: string
      price_usd: number | null
      description: string | null
    }>
  }
}

export interface RawSuggestion {
  category: string
  advice: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

export async function buildGddContext(projectId: string): Promise<GddContext> {
  const project = await getProject(projectId)

  const context: GddContext = {
    title: project.title,
    genre: project.genre ?? [],
    platform: project.platform ?? [],
    target_audience: project.target_audience,
    core_mechanic: project.core_mechanic,
    session_length: project.session_length,
    current_step: project.current_step,
  }

  if (project.current_step >= 2) {
    const [adsConfig, iapConfig] = await Promise.all([
      getAdsConfig(projectId),
      getIapConfig(projectId),
    ])

    if (adsConfig) {
      const placements = await listAdPlacements(adsConfig.id)
      context.ads = {
        ad_network: adsConfig.ad_network,
        revenue_model: adsConfig.revenue_model,
        placements: placements.map((p) => ({
          placement_type: p.placement_type,
          trigger_point: p.trigger_point,
          frequency_cap: p.frequency_cap,
        })),
      }
    }

    if (iapConfig) {
      const items = await listIapItems(iapConfig.id)
      context.iap = {
        store: iapConfig.store,
        items: items.map((i) => ({
          name: i.name,
          item_type: i.item_type,
          price_usd: i.price_usd,
          description: i.description,
        })),
      }
    }
  }

  return context
}

function normalizeDraft(draft: Partial<GddContext>): GddContext {
  return {
    title: draft.title ?? '',
    genre: draft.genre ?? [],
    platform: draft.platform ?? [],
    target_audience: draft.target_audience ?? null,
    core_mechanic: draft.core_mechanic ?? null,
    session_length: draft.session_length ?? null,
    current_step: draft.current_step ?? 1,
  }
}

// ── consumeStream: อ่าน SSE ทีละ chunk ──
// onChunk จะได้รับ fullText สะสม (ไม่ใช่แค่ chunk ใหม่)
// เพื่อให้ updateMessage ใน ChatAssistant ใช้ได้ตรงๆ โดยไม่ต้องต่อเอง
async function consumeStream(
  res: Response,
  onChunk: (fullText: string) => void,
): Promise<{ fullText: string; usage: unknown; provider: string }> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let usage: unknown = null
  let provider = 'unknown'

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.error) throw new Error(data.error)
        if (data.done) {
          usage = data.usage ?? null
          provider = data.provider ?? 'unknown'
        } else if (data.text) {
          fullText += data.text
          onChunk(fullText)  // ← ส่ง fullText สะสม ไม่ใช่แค่ chunk ใหม่
        }
      } catch (e: any) {
        if (e.message) throw e
      }
    }
  }

  return { fullText, usage, provider }
}

// ── API Functions ──────────────────────────────────────────────────────────

export async function sendChatMessage(params: {
  projectId: string
  message: string
  history: ChatMessage[]
  liveDraft?: Partial<GddContext> | null
  providerOverride?: string | null
  language?: 'th' | 'en'
  onChunk?: (fullText: string) => void
}): Promise<{ reply: string; usage: unknown; provider: string }> {
  const context: GddContext = params.liveDraft
    ? normalizeDraft(params.liveDraft)
    : await buildGddContext(params.projectId)

  const providerHistory = params.history.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }))

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: context,
      history: providerHistory,
      message: params.message,
      language: params.language ?? 'th',
      ...(params.providerOverride ? { provider: params.providerOverride } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }))
    throw new Error(err.error ?? 'AI ตอบไม่ได้ตอนนี้')
  }

  // stream mode
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('text/event-stream') && params.onChunk) {
    const { fullText, usage, provider } = await consumeStream(res, params.onChunk)
    return { reply: fullText, usage, provider }
  }

  // fallback: JSON ปกติ
  const data = await res.json()
  if (params.onChunk && data.reply) {
    params.onChunk(data.reply)
  }
  return {
    reply: data.reply,
    usage: data.usage,
    provider: typeof data.provider === 'string' ? data.provider : 'unknown',
  }
}

export async function summarizeChat(params: {
  history: ChatMessage[]
  providerOverride?: string | null
  language?: 'th' | 'en'
}): Promise<{ suggestions: RawSuggestion[]; provider: string }> {
  const providerHistory = params.history.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }))

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'summarize',
      history: providerHistory,
      message: 'สรุปคำแนะนำจากบทสนทนาข้างต้นเป็น JSON array ตามรูปแบบที่กำหนด',
      language: params.language ?? 'th',
      ...(params.providerOverride ? { provider: params.providerOverride } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }))
    throw new Error(err.error ?? 'สรุปคำแนะนำไม่ได้ตอนนี้')
  }

  const data = await res.json()
  return {
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    provider: typeof data.provider === 'string' ? data.provider : 'unknown',
  }
}

export async function saveSuggestions(params: {
  projectId: string
  suggestions: RawSuggestion[]
  model?: string
}): Promise<void> {
  if (params.suggestions.length === 0) return

  const rows = params.suggestions.map((s) => ({
    project_id: params.projectId,
    category: s.category,
    advice: s.advice,
    model_used: params.model ?? null,
  }))

  const { error } = await supabase.from('ai_suggestions').insert(rows as any)
  if (error) throw new Error(`บันทึกคำแนะนำไม่สำเร็จ: ${error.message}`)
}

export async function loadSuggestions(projectId: string): Promise<RawSuggestion[]> {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .select('category, advice')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`โหลดคำแนะนำไม่สำเร็จ: ${error.message}`)
  return data ?? []
}