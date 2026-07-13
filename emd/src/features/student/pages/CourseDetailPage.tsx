import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listEnrolledStudents, leaveCourse } from '../../courses/services/courses.service'
import { supabase } from '../../../lib/supabase'
import type { Course, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import FadeInCard from '../../../shared/components/FadeInCard'
import Badge from '../../../shared/components/Badge'
import { Skeleton, SkeletonCard, SkeletonRow} from '../../../shared/components/Skeleton'

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()

  const [course, setCourse] = useState<Course | null>(null)
  const [students, setStudents] = useState<Profile[]>([])
  const [instructorProfile, setInstructorProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!courseId) return
      try {
        // Fetch course row directly — student has SELECT access to active courses
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .maybeSingle()

        if (courseError) throw new Error(courseError.message)
        if (!courseData) throw new Error('Course not found')
        setCourse(courseData)

        // Fetch instructor profile
        const { data: instrData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', courseData.instructor_id)
          .maybeSingle()
        setInstructorProfile(instrData ?? null)

        // Fetch all enrolled students
        const studentList = await listEnrolledStudents(courseId)
        setStudents(studentList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [courseId])

  // Leave course — confirm first, then navigate to dashboard
  async function handleLeave() {
    if (!courseId || !course) return
    const confirmed = window.confirm(
      `Leave "${course.title}"? You will need the invite code to rejoin.`
    )
    if (!confirmed) return

    setLeaving(true)
    setError(null)
    try {
      await leaveCourse(courseId)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave course')
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-start gap-4">
          <Skeleton className="h-9 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </PageContainer>
    )
  }

  if (!course) {
    return (
      <PageContainer>
        <p className="text-red-600 text-sm">{error ?? 'Course not found'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Dashboard
        </button>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Page header with back button */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-1 rounded-full border-2 border-gray-200 px-4 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
        >
          &larr; Back
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
            Course
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{course.title}</h1>
            <Badge variant={course.is_active ? 'green' : 'default'}>
              {course.is_active ? 'Active' : 'Closed'}
            </Badge>
          </div>
          {course.description && (
            <p className="text-sm text-gray-500 leading-6 mt-0.5">{course.description}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* ── Course Info ────────────────────────────────────────── */}
      <FadeInCard index={0}>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          Course Info
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block mb-1.5">Invite Code</span>
            <code className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono">
              {course.invite_code}
            </code>
          </div>
          <div>
            <span className="text-gray-500 block mb-1.5">Created</span>
            <span className="text-gray-900 font-medium">
              {new Date(course.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>
      </FadeInCard>

      {/* ── Instructor Info ─────────────────────────────────────── */}
      <FadeInCard index={1}>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          Instructor
        </p>
        {!instructorProfile ? (
          <p className="text-sm text-gray-400">Instructor info not available.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1.5">Name</span>
              <span className="font-bold text-gray-900">
                {instructorProfile.display_name ?? '—'}
              </span>
            </div>
            {instructorProfile.contact_info && (
              <div>
                <span className="text-gray-500 block mb-1.5">Contact</span>
                <span className="text-gray-900">{instructorProfile.contact_info}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500 block mb-1.5">Email</span>
              <span className="text-gray-900">{instructorProfile.email}</span>
            </div>
          </div>
        )}
      </Card>
      </FadeInCard>

      {/* ── Enrolled Students ───────────────────────────────────── */}
      <FadeInCard index={2}>
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Students
          </p>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {students.length}
          </span>
        </div>
        {students.length === 0 ? (
          <p className="text-sm text-gray-400">No students enrolled yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-xs font-bold text-gray-400 pb-2">Name</th>
                <th className="text-left text-xs font-bold text-gray-400 pb-2">Student Code</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2.5 font-medium text-gray-800">
                    {student.display_name ?? '—'}
                  </td>
                  <td className="py-2.5 text-gray-500 font-mono text-xs">
                    {student.student_code ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      </FadeInCard>

      {/* Leave course — bottom of page, danger zone */}
      <div className="pt-2 border-t border-black/5">
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="rounded-full bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {leaving ? 'Leaving...' : 'Leave Course'}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          You will need the invite code to rejoin this course.
        </p>
      </div>
    </PageContainer>
  )
}