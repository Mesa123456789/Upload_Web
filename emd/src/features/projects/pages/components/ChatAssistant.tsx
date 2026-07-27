import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../../../i18n/I18nProvider'
import { useChat } from '../../context/ChatContext'
import { sendChatMessage, summarizeChat, saveSuggestions, type ChatMessage } from '../../services/chat.service'

// â”€â”€ Avatar AI (à¸§à¸‡à¸à¸¥à¸¡ Himawari blue + à¸«à¸™à¹‰à¸²à¸¢à¸´à¹‰à¸¡) â”€â”€
function AiAvatar({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="9" fill="#5AAEDB" />
      <circle cx="12.5" cy="15" r="1.6" fill="white" />
      <circle cx="19.5" cy="15" r="1.6" fill="white" />
      <path d="M12 20 Q16 22.5 20 20" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

interface ChatAssistantProps {
  projectId: string
}

export default function ChatAssistant({ projectId }: ChatAssistantProps) {
  const { t } = useI18n()
  const {
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    liveDraft,
    addSuggestions,
    isChatOpen,
    setChatOpen,
  } = useChat()

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)

  const isDevMode = import.meta.env.DEV

  const hasAiReplied = messages.some((m) => m.role === 'model' && m.text !== '')
  const hasProjectId = Boolean(projectId)
  const canSummarize = hasAiReplied && hasProjectId && scoreForSummarize(messages) >= SUMMARIZE_SCORE_THRESHOLD

  const scrollRef = useRef<HTMLDivElement>(null)

  const [satisfyDismissed, setSatisfyDismissed] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  useEffect(() => {
    if (!hasAiReplied || !hasProjectId || canSummarize || isSending) return
    setShowHint(true)
    const timer = setTimeout(() => setShowHint(false), 4000)
    return () => clearTimeout(timer)
  }, [messages, hasAiReplied, hasProjectId, canSummarize, isSending])

  async function handleSend() {
    const text = input.trim()
    if (!text || isSending) return

    setError(null)
    setInput('')
    setSatisfyDismissed(false)
    addMessage({ role: 'user', text })
    setIsSending(true)

    const placeholderId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    addMessage({ role: 'model', text: '', id: placeholderId })

    try {
      const { reply, provider } = await sendChatMessage({
        projectId,
        message: text,
        history: messages,
        liveDraft,
        providerOverride: selectedProvider,
        onChunk: (fullText) => {
          updateMessage(placeholderId, fullText)
        },
      })

      updateMessage(placeholderId, reply)
      setLastProvider(provider)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('chat.errorGeneric')
      setError(msg)
      removeMessage(placeholderId)
    } finally {
      setIsSending(false)
    }
  }

  async function handleSummarize() {
    if (isSummarizing || messages.length === 0) return
    if (!projectId) {
      setError(t('chat.projectRequired'))
      return
    }

    setError(null)
    setIsSummarizing(true)
    try {
      const { suggestions, provider } = await summarizeChat({
        history: messages,
        providerOverride: selectedProvider,
      })
      addSuggestions(suggestions)
      setLastProvider(provider)
      if (suggestions.length > 0) {
        try {
          await saveSuggestions({ projectId, suggestions, model: provider })
        } catch (saveErr) {
          console.error('à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¹à¸™à¸°à¸™à¸³à¸¥à¸‡ DB à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ:', saveErr)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('chat.summarizeFailed')
      setError(msg)
    } finally {
      setIsSummarizing(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!isChatOpen ? (
        <motion.button
          key="fab"
          layoutId="ai-avatar"
          onClick={() => setChatOpen(true)}
          style={styles.fab}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          aria-label={t('chat.openAssistant')}
        >
          <AiAvatar size={28} />
        </motion.button>
      ) : (
        <motion.div
          key="panel"
          style={styles.panel}
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.96 }}
          transition={{ duration: 0.22 }}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <motion.div layoutId="ai-avatar" style={styles.avatarRing}>
                <AiAvatar size={22} />
              </motion.div>
              <div>
                <div style={styles.headerTitleRow}>
                  <span style={styles.headerTitle}>{t('chat.title')}</span>
                  {lastProvider && (
                    <span style={styles.providerBadge}>{lastProvider}</span>
                  )}
                </div>
                <div style={styles.headerSubtitle}>{t('chat.subtitle')}</div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} style={styles.closeBtn} aria-label={t('chat.close')}>×</button>
          </div>

          {/* Dev switcher */}
          {isDevMode && (
            <div style={styles.devSwitcher}>
              <span style={styles.devLabel}>{t('chat.devMode')}</span>
              <select
                value={selectedProvider ?? ''}
                onChange={(e) => setSelectedProvider(e.target.value || null)}
                style={styles.devSelect}
              >
                <option value="">{t('chat.defaultProvider')}</option>
                <option value="gemini">Gemini</option>
                <option value="owl-alpha">Owl Alpha</option>
              </select>
            </div>
          )}

          {/* à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡ */}
          <div ref={scrollRef} style={styles.messages}>
            {messages.length === 0 && (
              <motion.div
                style={styles.empty}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.18 }}
              >
                {t('chat.empty')}
              </motion.div>
            )}

            {messages.map((m, i) => (
              <div
                key={m.id ?? i}
                style={{
                  ...styles.bubble,
                  ...(m.role === 'user' ? styles.bubbleUser : styles.bubbleAi),
                }}
              >
                {m.text}
                {/* cursor à¸à¸£à¸°à¸žà¸£à¸´à¸šà¹€à¸‰à¸žà¸²à¸° placeholder à¸¥à¹ˆà¸²à¸ªà¸¸à¸”à¸—à¸µà¹ˆà¸à¸³à¸¥à¸±à¸‡ stream à¹à¸¥à¸°à¸¡à¸µ text à¹à¸¥à¹‰à¸§ */}
                {isSending &&
                  i === messages.length - 1 &&
                  m.role === 'model' &&
                  m.text !== '' && (
                    <span style={styles.cursor}>▌</span>
                  )}
              </div>
            ))}

            {/* Typing dots while a streaming placeholder has not appeared yet */}
            {isSending && !messages.some((m) => m.role === 'model' && m.id?.startsWith('msg_')) && (
              <div style={{ ...styles.bubble, ...styles.bubbleAi, ...styles.typingBubble }}>
                <span style={styles.typingDot} />
                <span style={styles.typingDot} />
                <span style={styles.typingDot} />
              </div>
            )}
          </div>

          {/* error */}
          {error && <div style={styles.error}>{error}</div>}

          {/* Hint shown after chatting before a real project exists */}
          {hasAiReplied && !hasProjectId && (
            <div style={styles.hint}>
              {t('chat.saveHint')}
            </div>
          )}

          {/* toast hint */}
          {showHint && hasProjectId && !canSummarize && (
            <div style={{ ...styles.hint, ...styles.hintToast }}>
              {t('chat.moreContextHint')}
            </div>
          )}

          {/* à¸›à¸¸à¹ˆà¸¡à¸ªà¸£à¸¸à¸› */}
          {canSummarize && !satisfyDismissed && (
            <div style={styles.satisfyCard}>
              <p style={styles.satisfyText}>{t('chat.satisfiedQuestion')}</p>
              <div style={styles.satisfyBtnRow}>
                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  style={{
                    ...styles.satisfyBtnPrimary,
                    ...(isSummarizing ? styles.btnDisabled : {}),
                  }}
                >
                  {isSummarizing ? t('chat.summarizing') : t('chat.summarizeNow')}
                </button>
                <button
                  onClick={() => setSatisfyDismissed(true)}
                  disabled={isSummarizing}
                  style={styles.satisfyBtnGhost}
                >
                  {t('chat.keepChatting')}
                </button>
              </div>
            </div>
          )}

          {/* à¸Šà¹ˆà¸­à¸‡à¸žà¸´à¸¡à¸žà¹Œ */}
          <motion.div
            style={styles.inputRow}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.14 }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              rows={1}
              style={styles.textarea}
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              style={{
                ...styles.sendBtn,
                ...(isSending || !input.trim() ? styles.btnDisabled : {}),
              }}
            >
              {t('chat.send')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// â”€â”€ Scoring â”€â”€
const TOPIC_KEYWORDS = [
  'genre', 'à¹à¸™à¸§à¹€à¸à¸¡', 'platform', 'à¹à¸žà¸¥à¸•à¸Ÿà¸­à¸£à¹Œà¸¡', 'target audience', 'à¸à¸¥à¸¸à¹ˆà¸¡à¹€à¸›à¹‰à¸²à¸«à¸¡à¸²à¸¢',
  'core loop', 'core mechanic', 'à¸à¸¥à¹„à¸', 'session', 'à¹€à¸‹à¸ªà¸Šà¸±à¸™',
  'ads', 'à¹‚à¸†à¸©à¸“à¸²', 'iap', 'à¹„à¸­à¹€à¸—à¸¡', 'item', 'à¸£à¸²à¸„à¸²', 'price',
  'revenue', 'à¸£à¸²à¸¢à¹„à¸”à¹‰', 'monetization', 'frequency cap',
  'interstitial', 'rewarded', 'guardrail', 'à¸ˆà¸£à¸´à¸¢à¸˜à¸£à¸£à¸¡',
  'gdd', 'design', 'à¸­à¸­à¸à¹à¸šà¸š', 'balance', 'à¸ªà¸¡à¸”à¸¸à¸¥', 'pitch',
]

const JUDGMENT_PATTERNS = [
  'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸', 'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ', 'à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰', 'à¸„à¸§à¸£à¹€à¸žà¸´à¹ˆà¸¡', 'à¸„à¸§à¸£à¹€à¸¥à¸·à¸­à¸', 'à¸„à¸§à¸£à¸›à¸£à¸±à¸š',
  'à¹à¸žà¸‡à¹€à¸à¸´à¸™à¹„à¸›', 'à¸™à¹‰à¸­à¸¢à¹„à¸›', 'à¸¡à¸²à¸à¹„à¸›', 'à¸­à¸²à¸ˆà¸ˆà¸°à¹à¸žà¸‡', 'à¸­à¸²à¸ˆà¸ˆà¸°à¸™à¹‰à¸­à¸¢', 'à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¸•à¹ˆà¸­', 'à¸‚à¸²à¸”à¸«à¸²à¸¢',
]

const SUMMARIZE_SCORE_THRESHOLD = 2

function countTopicKeywords(text: string): number {
  const lower = text.toLowerCase()
  return TOPIC_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase())).length
}

function countJudgmentPatterns(text: string): number {
  return JUDGMENT_PATTERNS.filter((kw) => text.includes(kw)).length
}

function hasConcreteNumber(text: string): boolean {
  return /\d+/.test(text) || /[$%]/.test(text)
}

function scoreForSummarize(messages: ChatMessage[]): number {
  const userText = messages.filter((m) => m.role === 'user').map((m) => m.text).join(' ')
  const aiText = messages.filter((m) => m.role === 'model').map((m) => m.text).join(' ')
  let score = 0
  score += Math.min(2, countTopicKeywords(userText))
  score += Math.min(2, countJudgmentPatterns(aiText))
  score += hasConcreteNumber(aiText) ? 1 : 0
  return score
}

// â”€â”€ Styles â”€â”€
const styles: Record<string, React.CSSProperties> = {
  fab: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: '1.5px solid #B8DCF2',
    background: '#EAF4FC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(90,174,219,0.25)',
    zIndex: 1000,
  },
  panel: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 360,
    maxWidth: 'calc(100vw - 48px)',
    height: 520,
    maxHeight: 'calc(100vh - 48px)',
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #DCEDF8',
    boxShadow: '0 8px 24px rgba(90,174,219,0.22)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(180deg, #EAF4FC, #DCEDF8)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  headerTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: 600, fontSize: 15, color: '#1A4A66' },
  headerSubtitle: { fontSize: 11, color: '#5C8FAD' },
  providerBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    background: 'rgba(90,174,219,0.18)',
    color: '#1A4A66',
  },
  devSwitcher: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    background: '#fef3c7',
    borderBottom: '1px solid #fde68a',
  },
  devLabel: { fontSize: 11, fontWeight: 700, color: '#92400e' },
  devSelect: {
    flex: 1,
    fontSize: 12,
    padding: '3px 6px',
    borderRadius: 6,
    border: '1px solid #fde68a',
    background: '#fff',
    color: '#1c1917',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#5C8FAD',
    fontSize: 16,
    cursor: 'pointer',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  empty: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 1.6,
  },
  bubble: {
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    background: '#5AAEDB',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    background: '#F0F7FC',
    color: '#1A4A66',
    borderBottomLeftRadius: 4,
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '10px 14px',
  },
  cursor: {
    display: 'inline-block',
    animation: 'blink 0.8s step-end infinite',
    color: '#5AAEDB',
    fontWeight: 700,
    marginLeft: 1,
    lineHeight: 1,
  },
  typingDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#5AAEDB',
    animation: 'bounce 1s infinite',
  },
  error: {
    margin: '0 12px 8px',
    padding: '8px 12px',
    background: '#FEE2E2',
    color: '#B91C1C',
    borderRadius: 8,
    fontSize: 13,
  },
  hint: {
    margin: '0 12px 8px',
    padding: '7px 12px',
    background: '#EAF4FC',
    color: '#1A4A66',
    borderRadius: 8,
    fontSize: 12,
  },
  hintToast: {
    background: '#FFF7ED',
    color: '#92400E',
    border: '1px solid #FDE68A',
  },
  satisfyCard: {
    margin: '0 12px 8px',
    padding: '12px',
    background: '#F0F7FC',
    border: '1px solid #DCEDF8',
    borderRadius: 10,
  },
  satisfyText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1A4A66',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  satisfyBtnRow: {
    display: 'flex',
    gap: 8,
  },
  satisfyBtnPrimary: {
    flex: 1,
    padding: '8px 12px',
    background: '#5AAEDB',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  satisfyBtnGhost: {
    flex: 1,
    padding: '8px 12px',
    background: 'transparent',
    color: '#5C8FAD',
    border: '1px solid #B8DCF2',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '10px 12px 14px',
    borderTop: '1px solid #DCEDF8',
  },
  textarea: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #B8DCF2',
    fontSize: 14,
    resize: 'none' as const,
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    color: '#1A4A66',
  },
  sendBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#5AAEDB',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
}
