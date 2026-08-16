import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'

const CALLBACK_TIMEOUT_MS = 10000

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let done = false
    let cancelled = false

    async function routeByRole(session: Session) {
      if (done || cancelled) return
      done = true

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.warn('[Auth callback] Profile lookup failed:', error.message)
      }

      if (cancelled) return

      if (profile?.role === 'instructor') {
        navigate('/instructor/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }

    async function fail(message: string) {
      if (done || cancelled) return
      done = true
      console.error('[Auth callback]', message)
      setErrorMessage(message)
      await supabase.auth.signOut({ scope: 'local' })
      window.setTimeout(() => {
        if (!cancelled) navigate('/login', { replace: true })
      }, 2500)
    }

    async function finishOAuth() {
      const params = new URLSearchParams(window.location.search)
      const oauthError =
        params.get('error_description') ||
        params.get('error') ||
        params.get('error_code')

      if (oauthError) {
        await fail(oauthError)
        return
      }

      const code = params.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          await fail(error.message)
          return
        }

        if (data.session) {
          await routeByRole(data.session)
          return
        }
      }

      if (!window.location.hash) {
        await fail(t('auth.callback.noCode'))
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        await fail(error.message)
        return
      }

      if (session) {
        await routeByRole(session)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          window.setTimeout(() => {
            void routeByRole(session)
          }, 0)
        }
      },
    )

    void finishOAuth()

    const timer = window.setTimeout(() => {
      void fail(t('auth.callback.timeout'))
    }, CALLBACK_TIMEOUT_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [navigate, t])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {errorMessage ? (
          <>
            <p className="text-sm font-semibold text-red-600">{t('auth.callback.failed')}</p>
            <p className="mt-2 max-w-md text-sm text-gray-500">{errorMessage}</p>
            <p className="mt-4 text-xs text-gray-400">{t('auth.callback.returning')}</p>
          </>
        ) : (
          <>
            <div className="mx-auto w-[min(90vw,420px)] space-y-3">
              <Skeleton className="mx-auto h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mx-auto h-4 w-2/3" />
            </div>
            <p className="mt-4 text-gray-500">{t('auth.callback.signingIn')}</p>
          </>
        )}
      </div>
    </div>
  )
}
