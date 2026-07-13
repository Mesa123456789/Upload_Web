import { useEffect, useRef, useState } from 'react'
import { useChat } from '../../context/ChatContext'
import { loadSuggestions } from '../../services/chat.service'
 
type Stage = 'setup' | 'build' | 'guardrail' | 'output'
 
interface AiSuggestionPanelProps {
  stage: Stage
  projectId: string
}
 
// tips เริ่มต้นตาม stage (ของเดิม คงไว้เป็นไกด์เริ่มต้น)
const baseTips: Record<Stage, string[]> = {
  setup: [
    'กำหนดกลุ่มเป้าหมายให้ชัด เพื่อให้การออกแบบ monetization ตรงกับความคาดหวังผู้เล่น',
    'อธิบาย core loop เป็นลำดับ: เริ่ม → ลงมือ → ผลลัพธ์ → รางวัล → อัปเกรด',
    'เลี่ยงระบุแนวเกมกว้าง ๆ ถ้าพฤติกรรมผู้เล่นสำคัญ เช่น match-3, idle, collection',
  ],
  build: [
    'Rewarded ad ควรเป็นทางเลือกที่มีประโยชน์ ไม่ใช่บังคับเพื่อเล่นต่อ',
    'ตั้ง frequency cap ให้เรียบร้อยก่อนไปขั้น guardrail',
    'ไอเทม IAP ควรบอกราคาและสิ่งที่ได้รับให้ชัดในประโยคเดียว',
  ],
  guardrail: [
    'แก้จุดความรุนแรงสูงก่อน โดยเฉพาะ ad cap ที่ขาด หรือคุณค่าการซื้อที่ไม่ชัด',
    'Interstitial ad กดดันผู้เล่นมากกว่า rewarded จึงควรใช้อย่างประหยัด',
    'แผนที่เป็นธรรมต้องให้ผู้เล่นปฏิเสธข้อเสนอได้โดยไม่ขวางความก้าวหน้าปกติ',
  ],
  output: [
    'Pitch ควรอธิบายว่าทำไมแผนถึงเป็นธรรม ไม่ใช่แค่บอกว่าหาเงินยังไง',
    'ระบุ frequency cap และความเป็นทางเลือก เป็นหลักฐานเรื่องสิทธิ์ผู้เล่น',
    'ก่อนส่ง ตรวจว่าทุกไอเทมมีราคาและประโยชน์ชัดเจน',
  ],
}
 
const titles: Record<Stage, string> = {
  setup: 'AI แนะนำสำหรับ Setup',
  build: 'AI แนะนำสำหรับ Builder',
  guardrail: 'AI แนะนำสำหรับ Guardrail',
  output: 'AI แนะนำสำหรับ Output',
}
 
// ป้ายหมวด GDD เป็นภาษาไทย (สำหรับ card สรุป)
const categoryLabels: Record<string, string> = {
  title: 'ชื่อเกม',
  genre: 'แนวเกม',
  platform: 'แพลตฟอร์ม',
  target_audience: 'กลุ่มเป้าหมาย',
  core_mechanic: 'Core Loop',
  session_length: 'ความยาว Session',
}
 
export default function AiSuggestionPanel({ stage, projectId }: AiSuggestionPanelProps) {
  const { suggestions, setSuggestionsFromDb } = useChat()
 
  // โหลด suggestion เก่าจาก Supabase ตอนเปิดหน้า (persistent)
  // ใส่ projectId ว่าง = หน้า /project/new ยังไม่มี project จริง ข้ามการโหลด
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    loadSuggestions(projectId)
      .then((items) => {
        if (!cancelled) setSuggestionsFromDb(items)
      })
      .catch((err) => {
        console.error('โหลดคำแนะนำจาก DB ไม่สำเร็จ:', err)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, setSuggestionsFromDb])
 
  // toggle เปิด/ปิด tips เริ่มต้น (เก็บ localStorage เหมือนเดิม)
  const [tipsEnabled, setTipsEnabled] = useState(() => {
    return window.localStorage.getItem('emd-ai-suggestions') !== 'off'
  })
  useEffect(() => {
    window.localStorage.setItem('emd-ai-suggestions', tipsEnabled ? 'on' : 'off')
  }, [tipsEnabled])
 
  // พับ/กาง panel (default พับ)
  const [expanded, setExpanded] = useState(false)
 
  // notification เด้งเมื่อมีคำแนะนำ AI ใหม่จากแชต (ไม่ใช่ของเก่าที่โหลดจาก DB)
  // suggestion จาก DB จะมี createdAt=0 (ดู setSuggestionsFromDb ใน ChatContext)
  const [showNotif, setShowNotif] = useState(false)
  const prevCountRef = useRef(suggestions.length)
 
  useEffect(() => {
    const isNewFromChat = suggestions.length > 0 && suggestions[0].createdAt !== 0
    if (suggestions.length > prevCountRef.current && isNewFromChat) {
      setShowNotif(true)
      const timer = setTimeout(() => setShowNotif(false), 2500) // เด้ง ~2.5 วิ
      prevCountRef.current = suggestions.length
      return () => clearTimeout(timer)
    }
    prevCountRef.current = suggestions.length
  }, [suggestions.length, suggestions])
 
  // คำแนะนำ AI เรียงใหม่สุดอยู่บน
  const aiSuggestions = [...suggestions].reverse()
 
  return (
    <div style={styles.wrap}>
      {/* notification เด้ง */}
      {showNotif && (
        <div style={styles.notif}>
          <span>🔔 มีคำแนะนำใหม่จาก AI</span>
        </div>
      )}
 
      {/* หัว panel — คลิก/hover เพื่อกาง */}
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
          <p style={styles.kicker}>AI Suggestion</p>
          <h2 style={styles.title}>{titles[stage]}</h2>
        </div>
        <div style={styles.headerRight}>
          {aiSuggestions.length > 0 && (
            <span style={styles.badge}>{aiSuggestions.length}</span>
          )}
          <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
 
      {/* เนื้อหา — กางเมื่อ expanded */}
      {expanded && (
        <div style={styles.body}>
          {/* คำแนะนำ AI จริง */}
          {aiSuggestions.length > 0 && (
            <div style={styles.section}>
              <p style={styles.sectionLabel}>คำแนะนำจากบทสนทนา AI</p>
              <ul style={styles.list}>
                {aiSuggestions.map((s) => (
                  <li key={s.id} style={styles.aiCard}>
                    <span style={styles.catBadge}>
                      {categoryLabels[s.category] ?? s.category}
                    </span>
                    <span style={styles.aiAdvice}>{s.advice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
 
          {/* tips เริ่มต้น + toggle */}
          <div style={styles.section}>
            <div style={styles.tipHeader}>
              <p style={styles.sectionLabel}>คำแนะนำเริ่มต้น</p>
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
                <span style={styles.srOnly}>{tipsEnabled ? 'ปิด tips' : 'เปิด tips'}</span>
              </button>
            </div>
            {tipsEnabled && (
              <ul style={styles.list}>
                {baseTips[stage].map((tip) => (
                  <li key={tip} style={styles.tipItem}>
                    <span style={styles.dot} />
                    <span>{tip}</span>
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