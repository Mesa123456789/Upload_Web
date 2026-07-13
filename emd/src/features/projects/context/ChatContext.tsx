import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { ChatMessage, GddContext } from '../services/chat.service'

export interface Suggestion {
  id: string
  category: string
  advice: string
  createdAt: number
}

export type LiveDraft = Partial<GddContext>

interface ChatContextValue {
  // -- แชต --
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
  // ── ใหม่ 2 ตัวนี้ สำหรับ streaming ──
  updateMessage: (id: string, text: string) => void   // update text ของ message ที่มี id ตรง
  removeMessage: (id: string) => void                 // ลบ message ที่มี id ตรง

  // -- live draft จาก Setup --
  liveDraft: LiveDraft | null
  setLiveDraft: (draft: LiveDraft | null) => void

  // -- คำแนะนำสรุป (panel) --
  suggestions: Suggestion[]
  addSuggestions: (items: Array<{ category: string; advice: string }>) => void
  setSuggestionsFromDb: (items: Array<{ category: string; advice: string }>) => void
  clearSuggestions: () => void

  // -- สถานะ UI --
  isChatOpen: boolean
  setChatOpen: (open: boolean) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [liveDraft, setLiveDraftState] = useState<LiveDraft | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isChatOpen, setChatOpen] = useState<boolean>(false)

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // อัปเดต text ของ message ที่ id ตรง — ใช้ตอน stream chunk ไหลมาทีละอัน
  const updateMessage = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text } : m))
    )
  }, [])

  // ลบ message ออก — ใช้ตอน stream error แล้วต้องเอา placeholder ทิ้ง
  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const setLiveDraft = useCallback((draft: LiveDraft | null) => {
    setLiveDraftState(draft)
  }, [])

  const addSuggestions = useCallback(
    (items: Array<{ category: string; advice: string }>) => {
      if (items.length === 0) return
      setSuggestions((prev) => [
        ...prev,
        ...items.map((item, i) => ({
          id: `sg_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          category: item.category,
          advice: item.advice,
          createdAt: Date.now(),
        })),
      ])
    },
    [],
  )

  const setSuggestionsFromDb = useCallback(
    (items: Array<{ category: string; advice: string }>) => {
      setSuggestions(
        items.map((item, i) => ({
          id: `sg_db_${i}`,
          category: item.category,
          advice: item.advice,
          createdAt: 0,
        })),
      )
    },
    [],
  )

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  const value: ChatContextValue = {
    messages,
    addMessage,
    clearMessages,
    updateMessage,
    removeMessage,
    liveDraft,
    setLiveDraft,
    suggestions,
    addSuggestions,
    setSuggestionsFromDb,
    clearSuggestions,
    isChatOpen,
    setChatOpen,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChat ต้องอยู่ภายใน <ChatProvider> เท่านั้น')
  }
  return ctx
}