import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enrollStudent } from '../../courses/services/courses.service'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import FadeInCard from '../../../shared/components/FadeInCard'
import { useI18n } from '../../../i18n/I18nProvider'

// Dedicated page for joining a course via invite code.
export default function JoinCoursePage() {
  const navigate = useNavigate()
  const { t } = useI18n()

  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setJoining(true)
    setJoinError(null)

    try {
      await enrollStudent(inviteCode.trim())
      setSuccess(true)
      // Brief pause so the user sees the success message, then redirect
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : t('joinCourse.failed'))
    } finally {
      setJoining(false)
    }
  }

  return (
    <PageContainer>
      <div className="max-w-md mx-auto pt-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="ds-button ds-button-secondary mb-6 min-h-0 px-4 py-2"
        >
          &larr; {t('joinCourse.backToDashboard')}
        </button>

        {/* Page title */}
        <div className="mb-6">
          <p className="ds-eyebrow mb-2">
            {t('joinCourse.eyebrow')}
          </p>
          <h1 className="ds-page-title">{t('joinCourse.title')}</h1>
          <p className="ds-subtitle mt-1">
            {t('joinCourse.subtitle')}
          </p>
        </div>

        <FadeInCard index={0}>
        <Card>
          {success ? (
            // Success state — shown briefly before redirect
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold mb-1">{t('joinCourse.success')}</p>
              <p className="text-sm text-gray-400">{t('joinCourse.redirecting')}</p>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
                  {t('joinCourse.inviteCode')}
                </label>
                <input
                  type="text"
                  placeholder={t('joinCourse.placeholder')}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="ds-input font-mono uppercase"
                  autoFocus
                />
              </div>

              {joinError && (
                <p className="text-red-600 text-sm">{joinError}</p>
              )}

              <button
                type="submit"
                disabled={joining || !inviteCode.trim()}
                className="ds-button ds-button-primary w-full disabled:opacity-50"
              >
                {joining ? t('joinCourse.joining') : t('joinCourse.submit')}
              </button>
            </form>
          )}
        </Card>
        </FadeInCard>
      </div>
    </PageContainer>
  )
}
