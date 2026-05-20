import { useEffect, useState } from 'react'

type Stage = 'setup' | 'build' | 'guardrail' | 'output'

interface AiSuggestionPanelProps {
  stage: Stage
}

const suggestions: Record<Stage, string[]> = {
  setup: [
    'Start with a clear target audience so monetization choices match player expectations.',
    'Describe the core loop as a journey: start, action, outcome, reward, upgrade.',
    'Avoid vague genre labels when a specific player behavior matters, such as match-3, idle, or collection.',
  ],
  build: [
    'Rewarded ads should feel optional and useful, not required to continue playing.',
    'Set frequency caps before moving to the guardrail check.',
    'For IAP items, make the price and benefit clear in one sentence.',
  ],
  guardrail: [
    'Fix high severity points first, especially missing ad caps or unclear purchase value.',
    'Interstitial ads create more pressure than rewarded ads, so use them sparingly.',
    'A fair plan lets players decline offers without blocking normal progress.',
  ],
  output: [
    'Your pitch should explain why the plan is fair, not only how it earns revenue.',
    'Mention frequency caps and optionality as evidence for player autonomy.',
    'Before submitting, check that every item has a clear price and benefit.',
  ],
}

const titles: Record<Stage, string> = {
  setup: 'AI แนะนำสำหรับ Setup',
  build: 'AI แนะนำสำหรับ Builder',
  guardrail: 'AI แนะนำสำหรับ Guardrail',
  output: 'AI แนะนำสำหรับ Output',
}

export default function AiSuggestionPanel({ stage }: AiSuggestionPanelProps) {
  const [enabled, setEnabled] = useState(() => {
    return window.localStorage.getItem('emd-ai-suggestions') !== 'off'
  })

  useEffect(() => {
    window.localStorage.setItem('emd-ai-suggestions', enabled ? 'on' : 'off')
  }, [enabled])

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">AI Suggestion</p>
          <h2 className="mt-1 text-sm font-black text-ink">{titles[stage]}</h2>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          className={`relative h-8 w-16 rounded-full border p-1 transition ${
            enabled ? 'border-primary bg-primary' : 'border-line bg-white'
          }`}
          aria-pressed={enabled}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow-sm transition ${
              enabled ? 'translate-x-8' : 'translate-x-0'
            }`}
          />
          <span className="sr-only">{enabled ? 'ปิด AI แนะนำ' : 'เปิด AI แนะนำ'}</span>
        </button>
      </div>

      {enabled && (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
          {suggestions[stage].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
