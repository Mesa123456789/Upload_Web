export interface GenerateParams {
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  systemInstruction: string
  temperature?: number
  maxOutputTokens?: number
}

export interface GenerateResult {
  text: string
  usage: unknown
  providerName: string   // actual provider that answered (saved to DB when a suggestion is stored)
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

// ── Provider registry ──
// To add a new provider later (e.g. a university-hosted local LLM):
//   1. Write a new adapter file (e.g. `local-llm-adapter.ts`) implementing the AiProvider interface.
//   2. Add one line to this registry mapping its name to a lazy import of that adapter.
// No other file (getProvider, getProviderChain, api/chat.ts) needs to change.
const PROVIDER_REGISTRY: Record<string, () => Promise<AiProvider>> = {
  gemini: async () => (await import('./gemini-adapter.js')).geminiProvider,
  gemma: async () => (await import('./gemma-adapter.js')).gemmaProvider,
  // Registered here so it stays reachable via AI_PROVIDER / AI_PROVIDER_CHAIN, but deliberately
  // NOT listed in SELECTABLE_PROVIDERS (src/features/projects/services/providers.ts) — live
  // testing showed it breaks topic-lock (answers off-topic requests directly instead of
  // redirecting) and has noticeably worse Thai-language quality than every Gemini model and
  // Gemma. Don't add it back to that user-facing list without addressing those issues first.
  'openrouter-free': async () => (await import('./openrouter-free-adapter.js')).openrouterFreeProvider,
}

// ── Resolve the provider name from env ──
// AI_PROVIDER=gemini (default), 'gemma', or 'openrouter-free'
export function getProviderName(): string {
  return process.env.AI_PROVIDER?.trim() || 'gemini'
}

// ── Resolve the actual adapter for a given provider name ──
// overrideName: the model chosen in the chat UI's provider selector, sent directly in the request body.
// Resolution order: overrideName -> AI_PROVIDER env var -> 'gemini' (only when neither is set).
// Once a name is resolved it MUST exist in PROVIDER_REGISTRY — an unrecognized name throws
// instead of silently falling back to Gemini, so a typo in AI_PROVIDER doesn't go unnoticed.
export async function getProvider(overrideName?: string): Promise<AiProvider> {
  const name = overrideName?.trim() || getProviderName()

  const resolve = PROVIDER_REGISTRY[name]
  if (!resolve) {
    throw new Error(
      `Unknown AI provider "${name}" — must be one of: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`,
    )
  }
  return resolve()
}

// ── Resolve the provider-level fallback chain ──
// This is separate from the model-level MODEL_CHAIN inside gemini-adapter.ts: that one falls
// through models/keys within Gemini, this one falls through entirely different providers
// (e.g. Gemini down for the day -> try OpenRouter Free) once a whole provider is exhausted.
// Reads a comma-separated list from AI_PROVIDER_CHAIN. When unset, falls back to a single-entry
// chain built from AI_PROVIDER (getProviderName()) — which itself defaults to 'gemini' — so a
// deployment that only sets AI_PROVIDER (and never configures AI_PROVIDER_CHAIN) keeps behaving
// exactly as before this refactor.
// Unknown names are silently dropped (the chain is a best-effort list, not a strict override).
export async function getProviderChain(): Promise<AiProvider[]> {
  const raw = process.env.AI_PROVIDER_CHAIN?.trim() || getProviderName()
  const names = raw
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n in PROVIDER_REGISTRY)

  if (names.length === 0) {
    throw new Error(
      `AI_PROVIDER_CHAIN="${raw}" has no known provider names — must include at least one of: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`,
    )
  }

  return Promise.all(names.map((name) => PROVIDER_REGISTRY[name]()))
}

// ── Generic cross-provider quota/overload detection ──
// Used by the provider-level fallback loop in api/chat.ts to decide whether to move to the next
// provider in the chain. Has to work across different providers' error shapes:
//  - Raw Gemini/Gemma SDK errors (same underlying client): err.status 429/503, or message
//    containing "RESOURCE_EXHAUSTED"
//  - gemini-adapter.ts's and gemma-adapter.ts's own "exhausted every key (and, for Gemini, every
//    model)" wrapper errors, which are plain Thai-language Errors without a machine-readable
//    status attached
//  - OpenRouter Free errors: a generic Error with the HTTP status embedded in the message,
//    e.g. "OpenRouter Free API error 429: ..."
// Anything else (bad request, missing API key, invalid config) does NOT match here, so it
// propagates immediately instead of silently moving on to the next provider.
export function isRetryableProviderError(err: any): boolean {
  const status = err?.status
  const msg = String(err?.message ?? '')
  return (
    status === 429 ||
    status === 503 ||
    /RESOURCE_EXHAUSTED/i.test(msg) ||
    /\b(429|503)\b/.test(msg) ||
    /โควต้า/.test(msg)
  )
}
