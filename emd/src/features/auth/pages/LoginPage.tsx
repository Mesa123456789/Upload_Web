import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../../../lib/supabase'

export default function LoginPage() {
  const { session, loading } = useAuth()

  // If user is already logged in, send them to root which will
  // redirect to the appropriate role-based dashboard.
  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  // Placeholder — CMU OAuth integration pending
  function handleCmuLogin() {
    alert('ระบบ CMU OAuth กำลังรอเชื่อมต่อ API ครับ')
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // After Google OAuth, redirect back to /auth/callback
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('OAuth error:', error.message)
      alert('Login failed. Please try again.')
    }
  }

  return (
    // Full-page centered layout — warm cream background
    <div className="min-h-screen flex items-center justify-center bg-background-main">
      {/* Login card — warm off-white, generous padding */}
      <div className="bg-background-card rounded-2xl shadow-md border border-black/5 p-10 w-full max-w-md text-center">

        {/* CMU Logo + app title */}
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/Chiang_Mai_University.svg"
            alt="Chiang Mai University Logo"
            className="w-24 h-24 object-contain mb-5"
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Ethical Monetization Designer
          </h1>
          <p className="mt-2 text-sm text-gray-500 leading-6">
            Design ethical F2P monetization for your game
          </p>
        </div>

        {/* Primary: CMU login button */}
        <button
          onClick={handleCmuLogin}
          className="w-full flex items-center justify-center gap-3 rounded-full bg-primary py-3 px-6 text-white font-bold text-sm hover:bg-primary-light transition-colors active:scale-95 mb-3"
        >
          {/* CMU logo inside button — white circle so logo shows clearly on purple */}
          <img
            src="/Chiang_Mai_University.svg"
            alt="CMU Logo"
            className="w-6 h-6 object-contain bg-white rounded-full p-0.5"
          />
          Login with CMU Account
        </button>

        {/* Secondary: Google login — outlined style */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 rounded-full border-2 border-black/10 py-3 px-6 text-gray-700 font-bold text-sm hover:bg-black/5 transition-colors active:scale-95"
        >
          {/* Google icon SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-gray-400 mt-8">
          CMU Digital Game — SE 2026
        </p>
      </div>
    </div>
  )
}
