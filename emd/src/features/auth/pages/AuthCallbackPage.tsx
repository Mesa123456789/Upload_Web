import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import Spinner from '../../../shared/components/Spinner'

// This page handles the redirect after Google OAuth.
// Supabase will append the session tokens to the URL hash/query.
// We read the session here, then route based on user role.
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      // getSession() reads the session from URL hash injected by Supabase Auth
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        console.error('Auth callback error:', error?.message)
        navigate('/login')
        return
      }

      // Fetch profile to get the user's role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile && 'role' in profile && profile.role === 'instructor') {
        navigate('/instructor/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }

    handleCallback()
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
