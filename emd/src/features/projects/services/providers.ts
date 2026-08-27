// Curated, user-safe subset of api/lib/ai-provider.ts's PROVIDER_REGISTRY.
// The backend registry can hold internal/experimental providers not meant for
// end users to pick — this list is what actually shows up in the chat UI selector.
export interface SelectableProvider {
  id: string
  label: string
  description: string
}

export const SELECTABLE_PROVIDERS: SelectableProvider[] = [
  { id: 'gemini', label: 'Gemini', description: 'Fast, recommended default' },
  { id: 'gemma', label: 'Gemma', description: 'Slower alternative — for testing/comparison' },
]
