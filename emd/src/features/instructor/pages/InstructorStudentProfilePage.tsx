import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProfile } from '../../profile/services/profiles.service'
import type { Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Spinner from '../../../shared/components/Spinner'

// Read-only view of a student's profile — accessible by instructors only.
// Route: /instructor/student/:studentId
export default function InstructorStudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()

  const [studentProfile, setStudentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!studentId) return
      try {
        const p = await getProfile(studentId)
        if (!p) throw new Error('Student not found')
        setStudentProfile(p)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  if (!studentProfile || error) {
    return (
      <PageContainer>
        <p className="text-red-600 text-sm">{error ?? 'Student not found'}</p>
      </PageContainer>
    )
  }

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
            Read-only
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Profile</h1>
        </div>

        <Card className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Name
            </label>
            <p className="text-sm text-gray-800 font-medium">
              {studentProfile.display_name ?? '—'}
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Email
            </label>
            <p className="text-sm text-gray-700">{studentProfile.email}</p>
          </div>

          {/* Student ID */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Student ID
            </label>
            <p className="text-sm text-gray-700 font-mono">
              {studentProfile.student_code ?? '—'}
            </p>
          </div>

          {/* Major */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Major / Program
            </label>
            <p className="text-sm text-gray-700">{studentProfile.major ?? '—'}</p>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Year of Study
            </label>
            <p className="text-sm text-gray-700">
              {studentProfile.year != null ? `Year ${studentProfile.year}` : '—'}
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
