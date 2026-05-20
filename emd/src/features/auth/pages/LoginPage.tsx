import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { isSupabaseConfigured, supabase } from '../../../lib/supabase'

export default function LoginPage() {
  const { session, loading } = useAuth()

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  function handleCmuLogin() {
    alert('CMU OAuth is waiting for API configuration.')
  }

  async function handleGoogleLogin() {
    if (!isSupabaseConfigured) {
      alert('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env first.')
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('OAuth error:', error.message)
      alert('Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background-main px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-lg border border-line bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-ink p-8 text-white md:p-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-lg font-black text-ink">
                EMD
              </span>
              <div>
                <p className="text-sm font-bold">Ethical Monetization Designer</p>
                <p className="text-xs text-white/60">Course / Class Workspace</p>
              </div>
            </div>
            <span className="rounded-md border border-white/15 px-3 py-1 text-xs font-bold text-white/80">
              TH | EN
            </span>
          </div>

          <div className="my-16 max-w-xl">
            <p className="mb-4 inline-flex rounded-md bg-primary/25 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-100">
              F2P design guardrails
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Build monetization plans students can defend.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Map ads and in-app purchases, check pressure risks, and export an instructor-ready pitch.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            {['Setup', 'Build', 'Guardrail'].map((item, index) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-xs font-bold">
                  {index + 1}
                </span>
                <p className="font-bold text-white">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <img
                src="/Chiang_Mai_University.svg"
                alt="Chiang Mai University Logo"
                className="mb-5 h-16 w-16 object-contain"
              />
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Sign in to EMD</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select your account to continue into the class workspace.
              </p>
            </div>

            <div className="space-y-3">
              {!isSupabaseConfigured && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-800">
                  Supabase env is missing. Dev server can run, but login and database features need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
                </div>
              )}

              <button
                onClick={handleCmuLogin}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-light active:scale-[0.99]"
              >
                <img
                  src="/Chiang_Mai_University.svg"
                  alt=""
                  className="h-6 w-6 rounded-full bg-white object-contain p-0.5"
                />
                Sign in with University Account
              </button>

              <button
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
