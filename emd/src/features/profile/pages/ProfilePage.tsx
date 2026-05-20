import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { updateProfile } from '../services/profiles.service'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Spinner from '../../../shared/components/Spinner'

export default function ProfilePage() {
  const { user, profile, setProfile } = useAuth()
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
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  // Show spinner while AuthContext is still loading profile
  if (!profile) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  const isInstructor = profile.role === 'instructor'

  const inputCls = 'w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400'

  return (
    <PageContainer>
      <div className="max-w-lg mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1.5 transition-colors"
        >
          &larr; Back
        </button>

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
            Account
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 leading-6 mt-1">
            Update your profile information
          </p>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-6 text-sm">
            Profile saved successfully.
          </div>
        )}

        <form onSubmit={handleSave}>
          <Card className="space-y-5">
            {/* Read-only: email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
                Email
              </label>
              <p className="text-sm text-gray-700 bg-background-main rounded-xl px-4 py-2.5">
                {profile.email}
              </p>
            </div>

            {/* Read-only: role */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
                Role
              </label>
              <p className="text-sm text-gray-700 bg-background-main rounded-xl px-4 py-2.5 capitalize">
                {profile.role}
              </p>
            </div>

            {/* Editable: display name (both roles) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className={inputCls}
              />
            </div>

            {/* Instructor-only field */}
            {isInstructor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contact Info
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Phone, email, or LINE ID"
                  className={inputCls}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Visible to students in your courses
                </p>
              </div>
            )}

            {/* Student-only fields */}
            {!isInstructor && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="e.g. 630510123"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Major / Program
                  </label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="e.g. Software Engineering"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Year of Study
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select year</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                    <option value="5">Year 5+</option>
                  </select>
                </div>
              </>
            )}
          </Card>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
