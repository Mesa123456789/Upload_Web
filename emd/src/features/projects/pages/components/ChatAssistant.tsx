import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot } from 'lucide-react'
import { useI18n } from '../../../../i18n/I18nProvider'
import { notify } from '../../../../shared/lib/toast'
import { useChat } from '../../context/ChatContext'
import { sendChatMessage, summarizeChat, saveSuggestions, type ChatMessage } from '../../services/chat.service'

// Three bouncing dots shown inside the AI bubble while waiting for the first
// streamed token (after the message is sent, before any text has arrived).
function ThinkingDots() {
  return (
    <span style={styles.thinkingDots} aria-label="AI is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={styles.thinkingDot}
          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

function ResizeGrip() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M12 2L2 12M12 6L6 12M12 10L10 12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

interface ChatAssistantProps {
  projectId: string
}

// ── Floating panel geometry ──
// The panel is draggable/resizable, so position and size live in plain
// pixel state instead of a fixed corner anchor. These helpers keep it inside
// the viewport at all times (initial placement, drag, and resize).
const PANEL_DEFAULT_WIDTH = 360
const PANEL_DEFAULT_HEIGHT = 520
const PANEL_MIN_WIDTH = 300
const PANEL_MIN_HEIGHT = 380
const PANEL_MAX_WIDTH = 560
const PANEL_MAX_HEIGHT = 720
const VIEWPORT_MARGIN = 16
// Vertical clearance from the bottom of the viewport for the default panel
// position — keeps it clear of the FAB and the sticky bottom action bar
// ("Back" / "Continue to ...") that Setup/Build/Guardrail/Output all have.
const FAB_CLEARANCE = 90

function clampSize(width: number, height: number) {
  const maxWidth = Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2))
  const maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2))
  return {
    width: Math.min(Math.max(width, PANEL_MIN_WIDTH), maxWidth),
    height: Math.min(Math.max(height, PANEL_MIN_HEIGHT), maxHeight),
  }
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)
  return {
    x: Math.min(Math.max(x, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(y, VIEWPORT_MARGIN), maxY),
  }
}

function getDefaultPanelPosition(width: number, height: number) {
  const x = Math.max(VIEWPORT_MARGIN, (window.innerWidth - width) / 2)
  const y = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - FAB_CLEARANCE)
  return { x, y }
}

export default function ChatAssistant({ projectId }: ChatAssistantProps) {
  const { t, language } = useI18n()
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

  // Panel position/size — kept in this component's state (not context, not
  // localStorage) so it persists across open/close toggles for as long as
  // ChatAssistant stays mounted (it never unmounts within the project flow),
  // without persisting across page reloads.
  const [panelSize, setPanelSize] = useState(() => clampSize(PANEL_DEFAULT_WIDTH, PANEL_DEFAULT_HEIGHT))
  const [panelPos, setPanelPos] = useState(() => {
    const size = clampSize(PANEL_DEFAULT_WIDTH, PANEL_DEFAULT_HEIGHT)
    return getDefaultPanelPosition(size.width, size.height)
  })

  const isDevMode = import.meta.env.DEV

  const hasAiReplied = messages.some((m) => m.role === 'model' && m.text !== '')
  const hasProjectId = Boolean(projectId)
  const canSummarize = hasAiReplied && hasProjectId && scoreForSummarize(messages) >= SUMMARIZE_SCORE_THRESHOLD

  const scrollRef = useRef<HTMLDivElement>(null)

  const [satisfyDismissed, setSatisfyDismissed] = useState(false)

  // The header avatar shares layoutId="ai-avatar" with the FAB only for the
  // brief open transition (so it visibly flies from the FAB to the header).
  // Once that settles, the layoutId is dropped — otherwise framer-motion
  // keeps tracking the avatar's layout and animates every position change,
  // which makes it visibly lag behind the panel while dragging.
  const [justOpened, setJustOpened] = useState(false)

  useEffect(() => {
    if (!isChatOpen) return
    setJustOpened(true)
    const timer = setTimeout(() => setJustOpened(false), 260)
    return () => clearTimeout(timer)
  }, [isChatOpen])

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
        language,
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
        language,
      })
      addSuggestions(suggestions)
      setLastProvider(provider)
      if (suggestions.length > 0) {
        notify.aiSuggestion(t('chat.summarizeSuccess'))
        try {
          await saveSuggestions({ projectId, suggestions, model: provider })
        } catch (saveErr) {
          console.error('Failed to save suggestions to DB:', saveErr)
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

  // Drag the panel from its header. Ignores drags started on the close
  // button so it stays clickable.
  function handleHeaderPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    const startX = e.clientX
    const startY = e.clientY
    const originX = panelPos.x
    const originY = panelPos.y

    function handleMove(ev: PointerEvent) {
      const nextX = originX + (ev.clientX - startX)
      const nextY = originY + (ev.clientY - startY)
      setPanelPos(clampPosition(nextX, nextY, panelSize.width, panelSize.height))
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  // Resize from the bottom-right grip handle.
  function handleResizePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const originWidth = panelSize.width
    const originHeight = panelSize.height

    function handleMove(ev: PointerEvent) {
      const nextWidth = originWidth + (ev.clientX - startX)
      const nextHeight = originHeight + (ev.clientY - startY)
      const clampedSize = clampSize(nextWidth, nextHeight)
      setPanelSize(clampedSize)
      setPanelPos((prev) => clampPosition(prev.x, prev.y, clampedSize.width, clampedSize.height))
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    // No mode="wait" here on purpose: the FAB's exit and the panel's enter
    // need to briefly overlap in the DOM for the shared layoutId="ai-avatar"
    // transition to bridge between them (avatar flies FAB -> header). The
    // panel's own content is then delayed via its transition below so it
    // visibly expands only after the avatar has (almost) arrived.
    <AnimatePresence>
      {!isChatOpen ? (
        <motion.button
          key="fab"
          layoutId="ai-avatar"
          className="no-print"
          onClick={() => setChatOpen(true)}
          style={styles.fab}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          whileHover={{
            scale: 1.08,
            boxShadow: '0 12px 28px rgba(17,24,39,0.36), 0 4px 10px rgba(17,24,39,0.2)',
            transition: { duration: 0.15 },
          }}
          whileTap={{ scale: 0.96 }}
          aria-label={t('chat.openAssistant')}
        >
          <Bot size={28} color="#ffffff" strokeWidth={2.25} />
        </motion.button>
      ) : (
        <motion.div
          key="panel"
          className="no-print"
          style={{
            ...styles.panel,
            left: panelPos.x,
            top: panelPos.y,
            width: panelSize.width,
            height: panelSize.height,
          }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22, delay: 0.15 }}
        >
          {/* Header — also the drag handle */}
          <div style={styles.header} onPointerDown={handleHeaderPointerDown}>
            <div style={styles.headerLeft}>
              <motion.div
                layoutId={justOpened ? 'ai-avatar' : undefined}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={styles.avatarRing}
              >
                <Bot size={20} color="#f97316" strokeWidth={2.25} />
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

          {/* Message list */}
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

            {messages.map((m, i) => {
              const isLast = i === messages.length - 1
              // Placeholder model message added the instant handleSend fires,
              // before the first streamed token arrives — show thinking dots
              // here instead of an empty bubble.
              const isThinking = m.role === 'model' && m.text === '' && isSending && isLast
              return (
                <div
                  key={m.id ?? i}
                  style={{
                    ...styles.bubble,
                    ...(m.role === 'user' ? styles.bubbleUser : styles.bubbleAi),
                  }}
                >
                  {isThinking ? (
                    <ThinkingDots />
                  ) : (
                    <>
                      {m.text}
                      {/* Blinking cursor while this placeholder is still streaming in text */}
                      {isSending && isLast && m.role === 'model' && m.text !== '' && (
                        <span style={styles.cursor}>▌</span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
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

          {/* Summarize card */}
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

          {/* Input row */}
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

          {/* Resize grip */}
          <div
            onPointerDown={handleResizePointerDown}
            style={styles.resizeHandle}
            aria-hidden="true"
          >
            <ResizeGrip />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Scoring ──
// Note: TOPIC_KEYWORDS/JUDGMENT_PATTERNS used to hold Thai text that had been
// saved with the wrong encoding (UTF-8 misread as Windows-1252, then saved
// back as UTF-8), turning them into mojibake that could never match real
// Thai text — countJudgmentPatterns() returned 0 almost always as a result.
// Fixed to the correct Thai text, with English entries added to
// JUDGMENT_PATTERNS so it still works when the assistant replies in EN.
const TOPIC_KEYWORDS = [
  'genre', 'แนวเกม', 'platform', 'แพลตฟอร์ม', 'target audience', 'กลุ่มเป้าหมาย',
  'core loop', 'core mechanic', 'กลไก', 'session', 'เซสชัน',
  'ads', 'โฆษณา', 'iap', 'ไอเทม', 'item', 'ราคา', 'price',
  'revenue', 'รายได้', 'monetization', 'frequency cap',
  'interstitial', 'rewarded', 'guardrail', 'จริยธรรม',
  'gdd', 'design', 'ออกแบบ', 'balance', 'สมดุล', 'pitch',
]

const JUDGMENT_PATTERNS = [
  // Thai
  'ยังไม่ระบุ', 'ยังไม่มี', 'ยังไม่ได้', 'ควรเพิ่ม', 'ควรเลือก', 'ควรปรับ', 'ควรจะ', 'ไม่ควร',
  'แนะนำให้', 'ลองปรับ', 'น่าจะดีกว่า',
  'แพงเกินไป', 'น้อยไป', 'มากไป', 'อาจจะแพง', 'อาจจะน้อย', 'เสี่ยงต่อ', 'ขาดหาย',
  // English — needed since the assistant can now reply in EN (AI response language feature)
  'not specified', 'not yet', "doesn't have", 'should add', 'should choose', 'should adjust',
  'recommend', 'suggest', 'consider', 'too expensive', 'too low', 'too high',
  'might be too', 'risk of', 'missing',
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

// ── Styles ──
// Flat colors only (no gradients), matching the rest of the app's dashboard
// design system. Brand primary (#f97316, matches --color-primary in
// index.css) is used as the AI accent instead of the old pastel blue, since
// the dashboard's own "Integrated AI" bento card already uses orange for AI
// branding — this keeps the assistant's identity consistent across the app.
const styles: Record<string, React.CSSProperties> = {
  fab: {
    // Bottom-center, hugging the viewport edge. The sticky bottom action bar
    // that Setup/Build/Guardrail/Output render ("Back" / "Continue to ...")
    // lives inside the right-hand <aside> column, not full width, so a
    // horizontally-centered FAB clears it on normal/desktop widths without
    // needing a large vertical offset.
    position: 'fixed',
    bottom: 24,
    left: 'calc(50% - 28px)',
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: 'none',
    background: '#f97316',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(17,24,39,0.28), 0 2px 6px rgba(17,24,39,0.14)',
    zIndex: 1000,
  },
  panel: {
    // left/top/width/height are set inline from panelPos/panelSize state.
    position: 'fixed',
    background: '#ffffff',
    borderRadius: 16,
    border: '1.5px solid #e5e7eb',
    boxShadow: '0 24px 60px rgba(17,24,39,0.22), 0 8px 20px rgba(17,24,39,0.12)',
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
    background: '#f97316',
    cursor: 'grab',
    touchAction: 'none',
    flexShrink: 0,
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
  headerTitle: { fontWeight: 700, fontSize: 15, color: '#ffffff' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  providerBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.25)',
    color: '#ffffff',
  },
  devSwitcher: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    background: '#fef3c7',
    borderBottom: '1px solid #fde68a',
    flexShrink: 0,
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    lineHeight: 1,
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
    background: '#f97316',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    background: '#f1f5f9',
    color: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  thinkingDots: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 2px',
  },
  thinkingDot: {
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#f97316',
  },
  cursor: {
    display: 'inline-block',
    animation: 'blink 0.8s step-end infinite',
    color: '#f97316',
    fontWeight: 700,
    marginLeft: 1,
    lineHeight: 1,
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
    background: '#f1f5f9',
    color: '#334155',
    borderRadius: 8,
    fontSize: 12,
  },
  hintToast: {
    background: '#fff7ed',
    color: '#9a3412',
    border: '1px solid #fdba74',
  },
  satisfyCard: {
    margin: '0 12px 8px',
    padding: '12px',
    background: '#fff7ed',
    border: '1px solid #fdba74',
    borderRadius: 10,
  },
  satisfyText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#9a3412',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  satisfyBtnRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  satisfyBtnPrimary: {
    flex: '0 1 auto',
    padding: '8px 14px',
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'normal',
    textAlign: 'center' as const,
    cursor: 'pointer',
  },
  satisfyBtnGhost: {
    flex: '0 1 auto',
    padding: '8px 14px',
    background: 'transparent',
    color: '#c2410c',
    border: '1px solid #fdba74',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'normal',
    textAlign: 'center' as const,
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
    borderTop: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    resize: 'none' as const,
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    color: '#1e293b',
  },
  sendBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#f97316',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
  resizeHandle: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'nwse-resize',
    touchAction: 'none',
  },
}
