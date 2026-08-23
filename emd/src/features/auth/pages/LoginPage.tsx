import { Navigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import { useI18n } from '../../../i18n/I18nProvider'
import LanguageSwitcher from '../../../shared/components/LanguageSwitcher'

export default function LoginPage() {
  const { session, loading } = useAuth()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const isDeactivated = searchParams.get('deactivated') === '1'

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  function handleCmuLogin() {
    alert(t('auth.login.cmuPending'))
  }

  async function handleGoogleLogin() {
    if (!isSupabaseConfigured) {
      alert(t('auth.login.missingSupabase'))
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      console.error('OAuth error:', error.message)
      alert(t('auth.login.googleFailed'))
    }
  }

  return (
    <div className="grid min-h-screen bg-[var(--ds-bg)] lg:grid-cols-[300px_1fr]">
      <aside className="hidden bg-[var(--ds-sidebar)] px-8 py-16 text-white lg:flex lg:flex-col">
        <div className="ds-brand-lock flex items-end gap-2">
          <span className="text-[42px] font-black leading-none drop-shadow-md">{t('brand.name')}</span>
          <span className="pb-1 text-[22px] font-black leading-none">{t('brand.frameworks')}</span>
        </div>

        <div className="mt-24 max-w-[220px]">
          <p className="text-[28px] font-normal leading-tight">{t('auth.login.eyebrow')}</p>
          <p className="mt-4 text-sm leading-6 text-white/55">
            {t('auth.login.asideCopy')}
          </p>
        </div>

        <div className="mt-auto text-center">
          <img src="/camt-mark.png" alt={t('brand.camt')} className="mx-auto h-16 w-20 object-contain drop-shadow-lg" />
          <p className="ds-brand-lock mt-2 text-2xl font-black tracking-widest text-white/20">{t('brand.camt')}</p>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <section className="grid w-full max-w-5xl overflow-hidden rounded-[34px] bg-white shadow-[18px_24px_38px_rgba(17,24,39,0.14)] lg:grid-cols-[1fr_430px]">
          <div className="hidden min-h-[560px] bg-[var(--ds-sidebar)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-white text-2xl font-black text-[#302226]">
                EMD
              </div>
              <h1 className="mt-12 max-w-md text-[44px] font-black leading-tight tracking-tight">
                {t('auth.login.heroTitle')}
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
                {t('auth.login.heroBody')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                t('auth.login.features.courses'),
                t('auth.login.features.projects'),
                t('auth.login.features.guardrail'),
              ].map((item, index) => (
                <div key={item} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#facc15] text-sm font-black text-black">
                    {index + 1}
                  </span>
                  <p className="font-semibold text-white/85">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center p-8 md:p-12">
            <div className="w-full">
              <div className="mb-5 flex justify-end">
                <LanguageSwitcher />
              </div>
              <img
                src="/Chiang_Mai_University.svg"
                alt="Chiang Mai University Logo"
                className="mb-6 h-16 w-16 object-contain"
              />
              <h2 className="text-[32px] font-black tracking-tight text-[var(--ds-ink)]">{t('auth.login.title')}</h2>
              <p className="mt-3 text-sm leading-6 text-[#746e69]">
                {t('auth.login.subtitle')}
              </p>

              {!isSupabaseConfigured && (
                <div className="mt-7 rounded-[22px] border border-[#ffd032]/60 bg-[#fff8db] p-4 text-sm leading-6 text-[#6b5010]">
                  {t('auth.login.missingSupabase')}
                </div>
              )}

              {isDeactivated && (
                <div className="mt-7 rounded-[22px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {t('auth.login.deactivated')}
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button
                  onClick={handleCmuLogin}
                  className="flex h-14 w-full items-center justify-between rounded-full bg-[var(--ds-sidebar)] px-5 text-sm font-bold text-white transition hover:bg-[#23191c]"
                >
                  <span className="flex items-center gap-3">
                    <img
                      src="/Chiang_Mai_University.svg"
                      alt=""
                      className="h-7 w-7 rounded-full bg-white object-contain p-0.5"
                    />
                    {t('auth.login.university')}
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  onClick={handleGoogleLogin}
                  className="flex h-14 w-full items-center justify-between rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-[var(--ds-ink)] transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z" />
                      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                    </svg>
                    {t('auth.login.google')}
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
