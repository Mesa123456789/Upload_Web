import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import Spinner from '../../../shared/components/Spinner'

// หน้านี้รับ redirect หลัง Google OAuth
// Supabase แปะ token มาใน URL hash (#access_token=...) แล้วประมวลผลแบบ async
// เราจึง "รอฟัง" onAuthStateChange แทนการเรียก getSession() ทันที
// (getSession() เร็วเกินไป — hash ยังไม่ถูกแลกเป็น session บน localhost)
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let done = false  // กันทำงานซ้ำ (StrictMode ยิง effect 2 รอบ)

    // routeByRole — อ่าน role แล้วพาไปหน้าที่ถูก
    async function routeByRole(userId: string) {
      if (done) return
      done = true

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile && 'role' in profile && profile.role === 'instructor') {
        navigate('/instructor/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }

    // 1) ฟัง event — ตัวนี้จะยิงเมื่อ Supabase แลก hash เป็น session เสร็จ
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          routeByRole(session.user.id)
        }
      }
    )

    // 2) เผื่อ session ถูกแลกเสร็จไปแล้วก่อน listener ติด — เช็คซ้ำอีกชั้น
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        routeByRole(session.user.id)
      }
    })

    // 3) timeout กันค้าง — ถ้า 5 วิยังไม่มี session อะไรเลย กลับ login
    const timer = setTimeout(() => {
      if (!done) {
        console.error('Auth callback timeout — ไม่พบ session')
        navigate('/login', { replace: true })
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">Signing you in...</p>
      </div>
    </div>
  )
}