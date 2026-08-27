import { createContext, useEffect, useRef, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import type { Profile, AppRole } from '../../../lib/database.types'

const previewAuth = import.meta.env.VITE_PREVIEW_AUTH === 'true'

const previewProfile: Profile = {
  id: 'preview-instructor',
  email: 'preview@emd.local',
  display_name: 'Pimponput Talubnga',
  role: 'instructor',
  contact_info: null,
  student_code: '662110157',
  major: 'Software Engineering',
  year: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const previewSession = {
  access_token: 'preview-access-token',
  refresh_token: 'preview-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: previewProfile.id,
    email: previewProfile.email,
    app_metadata: {},
    user_metadata: { display_name: previewProfile.display_name },
    aud: 'authenticated',
    created_at: previewProfile.created_at,
  },
} as Session
 
interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  roles: AppRole[]
  isAdmin: boolean
  deactivated: boolean
  loading: boolean
  setProfile: (profile: Profile | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function PreviewAuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(previewProfile)
  const roles: AppRole[] = []

  return (
    <AuthContext.Provider
      value={{
        user: previewSession.user,
        session: previewSession,
        profile,
        roles,
        isAdmin: false,
        deactivated: false,
        loading: false,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
 
// เวลาสูงสุดที่รอ getSession() — กันค้างตลอดไปถ้าเจอ deadlock ซ้ำใน edge case อื่น
// (เป็นตาข่ายนิรภัยเสริม ไม่ใช่ทางแก้หลัก — ทางแก้หลักคือแยก fetchProfile ออกแล้ว)
const SESSION_TIMEOUT_MS = 8000
 
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (previewAuth) {
    return <PreviewAuthProvider>{children}</PreviewAuthProvider>
  }

  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [deactivated, setDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)
  // sessionReady = true เมื่อ getSession()/onAuthStateChange ครั้งแรกตอบกลับมาแล้ว
  // (ไม่ว่าจะมี session หรือไม่) ใช้แยกจาก "loading" ของ profile
  const [sessionReady, setSessionReady] = useState(false)
 
  const lastFetchedUserIdRef = useRef<string | null>(null)
 
  async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) {
        console.error('[Auth] Fetch profile error:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.error('[Auth] Fetch profile exception:', err)
      return null
    }
  }

  async function fetchRoles(userId: string): Promise<AppRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      if (error) {
        console.error('[Auth] Fetch roles error:', error.message)
        return []
      }
      return data.map((row) => row.role)
    } catch (err) {
      console.error('[Auth] Fetch roles exception:', err)
      return []
    }
  }

  // ── Effect 1: จัดการ session/user เท่านั้น — ไม่เรียก fetchProfile ที่นี่ ──
  useEffect(() => {
    let mounted = true
 
    // เผื่อ getSession() ค้างจริง (deadlock เคสอื่นที่ยังไม่รู้จัก) — timeout กันไว้
    // ถ้าไม่ resolve ภายในเวลานี้ ให้เคลียร์ session แล้วปล่อยให้ ProtectedRoute
    // ส่งไป /login แทนที่จะค้าง spinner ตลอดไป
    const timeoutId = setTimeout(() => {
      if (mounted && !sessionReady) {
        console.warn('[Auth] getSession timeout — เคลียร์ session แล้วให้ login ใหม่')
        setSession(null)
        setUser(null)
        setSessionReady(true)
      }
    }, SESSION_TIMEOUT_MS)
 
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (!mounted) return
      clearTimeout(timeoutId)
 
      if (error) {
        console.warn('[Auth] getSession error — clearing stale session:', error.message)
        await supabase.auth.signOut({ scope: 'local' })
        if (mounted) {
          setSession(null)
          setUser(null)
          setSessionReady(true)
        }
        return
      }
 
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setSessionReady(true)
      // หมายเหตุ: ไม่เรียก fetchProfile ตรงนี้ — Effect 2 จะจัดการเอง
    })
 
    // callback นี้ทำแค่ sync session/user เข้า state — ไม่มี await supabase.* ใด ๆ
    // ข้างใน เพื่อเลี่ยง deadlock ตามที่อธิบายไว้บนสุดของไฟล์
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'INITIAL_SESSION') return
        if (!mounted) return
 
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setSessionReady(true)
 
        if (!newSession?.user) {
          lastFetchedUserIdRef.current = null
          setProfile(null)
          setRoles([])
        }
        // กรณีมี user — ปล่อยให้ Effect 2 (ผูกกับ user?.id) เป็นคนเรียก
        // fetchProfile เอง ไม่เรียกที่นี่
      },
    )
 
    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])
 
  // ── Effect 2: ดึง profile — แยกออกจาก onAuthStateChange callback โดยสิ้นเชิง ──
  // ผูกกับ user?.id เท่านั้น รันนอก call stack ของ auth event ใด ๆ ตัด deadlock ขาด
  useEffect(() => {
    if (!sessionReady) return // รอให้ session อ่านเสร็จก่อน
 
    if (!user) {
      setLoading(false)
      return
    }
 
    // กัน fetch ซ้ำถ้า user id เดิม (เช่น TOKEN_REFRESHED ที่ user คนเดิม)
    if (user.id === lastFetchedUserIdRef.current) {
      setLoading(false)
      return
    }
 
    let cancelled = false
    setLoading(true)
 
    Promise.all([fetchProfile(user.id), fetchRoles(user.id)]).then(([p, r]) => {
      if (cancelled) return
      lastFetchedUserIdRef.current = user.id

      if (p?.is_active === false) {
        console.warn('[Auth] Account is deactivated — signing out')
        setDeactivated(true)
        setProfile(null)
        setRoles([])
        setSession(null)
        setUser(null)
        setLoading(false)
        void supabase.auth.signOut({ scope: 'local' })
        return
      }

      setDeactivated(false)
      setProfile(p)
      setRoles(r)
      setLoading(false)
    })
 
    return () => {
      cancelled = true
    }
  }, [sessionReady, user])
 
  return (
    <AuthContext.Provider value={{ user, session, profile, roles, isAdmin: roles.includes('admin'), deactivated, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
