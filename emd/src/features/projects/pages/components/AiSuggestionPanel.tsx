import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../../i18n/I18nProvider'
import { useChat } from '../../context/ChatContext'
import { loadSuggestions } from '../../services/chat.service'

type Stage = 'setup' | 'build' | 'guardrail' | 'output'

interface AiSuggestionPanelProps {
  stage: Stage
  projectId: string
}

const tipKeys: Record<Stage, string[]> = {
  setup: ['setupAudience', 'setupCoreLoop', 'setupGenre'],
  build: ['buildRewarded', 'buildCap', 'buildIap'],
  guardrail: ['guardrailHighRisk', 'guardrailInterstitial', 'guardrailFairPlan'],
  output: ['outputPitch', 'outputEvidence', 'outputReview'],
}

const categoryLabelKeys: Record<string, string> = {
  title: 'setup.gameTitle',
  genre: 'setup.genre',
  platform: 'setup.platform',
  target_audience: 'setup.targetAudience',
  core_mechanic: 'setup.coreLoop',
  session_length: 'setup.sessionLength',
}

export default function AiSuggestionPanel({ stage, projectId }: AiSuggestionPanelProps) {
  const { suggestions, setSuggestionsFromDb } = useChat()
  const { t } = useI18n()

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    loadSuggestions(projectId)
      .then((items) => {
        if (!cancelled) setSuggestionsFromDb(items)
      })
      .catch((err) => {
        console.error('[AI suggestions] Failed to load suggestions:', err)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, setSuggestionsFromDb])

  const [tipsEnabled, setTipsEnabled] = useState(() => {
    return window.localStorage.getItem('emd-ai-suggestions') !== 'off'
  })

  useEffect(() => {
    window.localStorage.setItem('emd-ai-suggestions', tipsEnabled ? 'on' : 'off')
  }, [tipsEnabled])

  const [expanded, setExpanded] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const prevCountRef = useRef(suggestions.length)

  useEffect(() => {
    const isNewFromChat = suggestions.length > 0 && suggestions[0].createdAt !== 0
    if (suggestions.length > prevCountRef.current && isNewFromChat) {
      setShowNotif(true)
      const timer = setTimeout(() => setShowNotif(false), 2500)
      prevCountRef.current = suggestions.length
      return () => clearTimeout(timer)
    }
    prevCountRef.current = suggestions.length
  }, [suggestions.length, suggestions])

  const aiSuggestions = [...suggestions].reverse()

  return (
    <div style={styles.wrap}>
      {showNotif && (
        <div style={styles.notif}>
          <span>{t('aiSuggestion.newSuggestion')}</span>
        </div>
      )}

      <div
        style={styles.header}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
      >
        <div>
          <p style={styles.kicker}>{t('aiSuggestion.kicker')}</p>
          <h2 style={styles.title}>{t(`aiSuggestion.titles.${stage}`)}</h2>
        </div>
        <div style={styles.headerRight}>
          {aiSuggestions.length > 0 && <span style={styles.badge}>{aiSuggestions.length}</span>}
          <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={styles.body}>
          {aiSuggestions.length > 0 && (
            <div style={styles.section}>
              <p style={styles.sectionLabel}>{t('aiSuggestion.conversationSuggestions')}</p>
              <ul style={styles.list}>
                {aiSuggestions.map((suggestion) => (
                  <li key={suggestion.id} style={styles.aiCard}>
                    <span style={styles.catBadge}>
                      {categoryLabelKeys[suggestion.category]
                        ? t(categoryLabelKeys[suggestion.category])
                        : suggestion.category}
                    </span>
                    <span style={styles.aiAdvice}>{suggestion.advice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={styles.section}>
            <div style={styles.tipHeader}>
              <p style={styles.sectionLabel}>{t('aiSuggestion.starterTips')}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setTipsEnabled((v) => !v)
                }}
                style={{
                  ...styles.toggle,
                  ...(tipsEnabled ? styles.toggleOn : styles.toggleOff),
                }}
                aria-pressed={tipsEnabled}
              >
                <span
                  style={{
                    ...styles.toggleKnob,
                    transform: tipsEnabled ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
                <span style={styles.srOnly}>
                  {tipsEnabled ? t('aiSuggestion.disableTips') : t('aiSuggestion.enableTips')}
                </span>
              </button>
            </div>
            {tipsEnabled && (
              <ul style={styles.list}>
                {tipKeys[stage].map((tipKey) => (
                  <li key={tipKey} style={styles.tipItem}>
                    <span style={styles.dot} />
                    <span>{t(`aiSuggestion.tips.${tipKey}`)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { position: 'relative', width: '100%' },
  notif: {
    position: 'absolute',
    top: -40,
    right: 0,
    background: '#c2410c',
    color: '#fff',
    fontSize: 12,
    padding: '6px 12px',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    whiteSpace: 'nowrap',
    zIndex: 5,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    border: '1px solid #fed7aa',
    background: 'rgba(255,247,237,0.7)',
    cursor: 'pointer',
  },
  kicker: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#c2410c',
    margin: 0,
  },
  title: { fontSize: 14, fontWeight: 800, color: '#1c1917', margin: '4px 0 0' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  badge: {
    background: '#c2410c',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
  },
  chevron: { fontSize: 10, color: '#c2410c' },
  body: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    border: '1px solid #f3f4f6',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  section: {},
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 8px',
  },
  tipHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  aiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 8,
    padding: '10px 12px',
  },
  catBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: 700,
    color: '#c2410c',
    background: '#ffedd5',
    borderRadius: 6,
    padding: '2px 8px',
  },
  aiAdvice: { fontSize: 13, lineHeight: 1.6, color: '#1c1917' },
  tipItem: { display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.6, color: '#44403c' },
  dot: {
    marginTop: 7,
    width: 6,
    height: 6,
    flexShrink: 0,
    borderRadius: '50%',
    background: '#c2410c',
  },
  toggle: {
    position: 'relative',
    height: 24,
    width: 44,
    borderRadius: 12,
    border: '1px solid',
    padding: 2,
    cursor: 'pointer',
  },
  toggleOn: { borderColor: '#c2410c', background: '#c2410c' },
  toggleOff: { borderColor: '#d1d5db', background: '#fff' },
  toggleKnob: {
    display: 'block',
    height: 18,
    width: 18,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
  },
}
