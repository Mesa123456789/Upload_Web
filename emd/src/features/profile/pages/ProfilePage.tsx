import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { updateProfile } from '../services/profiles.service'
import { supabase } from '../../../lib/supabase'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import { Skeleton, SkeletonCard } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'

export default function ProfilePage() {
  const { user, profile, setProfile } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  // Local form state — pre-filled from profile once it loads
  const [displayName, setDisplayName] = useState('')
  const [contactInfo, setContactInfo] = useState('')   // instructor only
  const [studentCode, setStudentCode] = useState('')   // student only
  const [major, setMajor] = useState('')               // student only
  const [year, setYear] = useState<string>('')         // student only (string for input, parse on save)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Pre-fill form fields when profile is available
  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setContactInfo(profile.contact_info ?? '')
    setStudentCode(profile.student_code ?? '')
    setMajor(profile.major ?? '')
    setYear(profile.year != null ? String(profile.year) : '')
  }, [profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !profile) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const updates: Parameters<typeof updateProfile>[1] = {
        display_name: displayName.trim() || null,
      }

      if (profile.role === 'instructor') {
        updates.contact_info = contactInfo.trim() || null
      } else {
        // Student-specific fields
        updates.student_code = studentCode.trim() || null
        updates.major = major.trim() || null
        updates.year = year ? parseInt(year) : null
      }

      const updated = await updateProfile(user.id, updates)

      // Sync updated profile into AuthContext so Header shows new name
      setProfile(updated)
      setSaveSuccess(true)

      // Clear success banner after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Show spinner while AuthContext is still loading profile
  if (!profile) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-lg">
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-3 h-4 w-56" />
          <div className="mt-6">
            <SkeletonCard />
          </div>
        </div>
      </PageContainer>
    )
  }

  const isInstructor = profile.role === 'instructor'

  const inputCls = 'ds-input'

  return (
    <PageContainer>
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <p className="ds-eyebrow mb-2">
            {t('profile.eyebrow')}
          </p>
          <h1 className="ds-page-title">{t('profile.title')}</h1>
          <p className="ds-subtitle mt-1">
            {t('profile.subtitle')}
          </p>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-6 text-sm">
            {t('profile.saved')}
          </div>
        )}

        <form onSubmit={handleSave}>
          <Card className="space-y-5">
            {/* Read-only: email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
                {t('common.email')}
              </label>
              <p className="text-sm text-gray-700 bg-background-main rounded-xl px-4 py-2.5">
                {profile.email}
              </p>
            </div>

            {/* Read-only: role */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
                {t('common.role')}
              </label>
              <p className="text-sm text-gray-700 bg-background-main rounded-xl px-4 py-2.5 capitalize">
                {t(`roles.${profile.role}`)}
              </p>
            </div>

            {/* Editable: display name (both roles) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('profile.displayName')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('profile.displayNamePlaceholder')}
                className={inputCls}
              />
            </div>

            {/* Instructor-only field */}
            {isInstructor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('profile.contactInfo')}
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder={t('profile.contactInfoPlaceholder')}
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {t('profile.contactInfoHelp')}
                </p>
              </div>
            )}

            {/* Student-only fields */}
            {!isInstructor && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('profile.studentId')}
                  </label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder={t('profile.studentIdPlaceholder')}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('profile.major')}
                  </label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder={t('profile.majorPlaceholder')}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('profile.year')}
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">{t('profile.selectYear')}</option>
                    <option value="1">{t('profile.yearOption', { year: 1 })}</option>
                    <option value="2">{t('profile.yearOption', { year: 2 })}</option>
                    <option value="3">{t('profile.yearOption', { year: 3 })}</option>
                    <option value="4">{t('profile.yearOption', { year: 4 })}</option>
                    <option value="5">{t('profile.yearPlus')}</option>
                  </select>
                </div>
              </>
            )}
          </Card>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSignOut}
              className="ds-button mr-auto border border-red-200 bg-white text-red-600 hover:bg-red-50"
            >
              {t('common.signOut')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ds-button ds-button-primary disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('profile.save')}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
