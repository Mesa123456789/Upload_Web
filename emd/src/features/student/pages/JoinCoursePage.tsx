import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enrollStudent } from '../../courses/services/courses.service'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'

// Dedicated page for joining a course via invite code.
export default function JoinCoursePage() {
  const navigate = useNavigate()

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
      setJoinError(err instanceof Error ? err.message : 'Failed to join course')
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
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1.5 transition-colors"
        >
          &larr; Back to Dashboard
        </button>

        {/* Page title */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
            Student
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Join a Course</h1>
          <p className="text-sm text-gray-500 leading-6 mt-1">
            Enter the invite code your instructor gave you
          </p>
        </div>

        <Card>
          {success ? (
            // Success state — shown briefly before redirect
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold mb-1">Joined successfully!</p>
              <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. DG-A4F2"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm font-mono bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400"
                  autoFocus
                />
              </div>

              {joinError && (
                <p className="text-red-600 text-sm">{joinError}</p>
              )}

              <button
                type="submit"
                disabled={joining || !inviteCode.trim()}
                className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
              >
                {joining ? 'Joining...' : 'Join Course'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
