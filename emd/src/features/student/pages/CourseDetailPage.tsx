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
import { useI18n } from '../../../i18n/I18nProvider'

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { t, formatDate, formatNumber } = useI18n()

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
        if (!courseData) throw new Error(t('courseDetail.notFound'))
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
        setError(err instanceof Error ? err.message : t('courseDetail.loadFailed'))
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
      t('courseDetail.leaveConfirm', { title: course.title })
    )
    if (!confirmed) return

    setLeaving(true)
    setError(null)
    try {
      await leaveCourse(courseId)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('courseDetail.leaveFailed'))
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
        <p className="text-red-600 text-sm">{error ?? t('courseDetail.notFound')}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t('courseDetail.backToDashboard')}
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
          &larr; {t('courseDetail.back')}
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
            {t('common.course')}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{course.title}</h1>
            <Badge variant={course.is_active ? 'green' : 'default'}>
              {course.is_active ? t('common.active') : t('common.closed')}
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
          {t('courseDetail.courseInfo')}
        </p>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-gray-500 block mb-1.5">{t('joinCourse.inviteCode')}</span>
            <code className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono">
              {course.invite_code}
            </code>
          </div>
          <div>
            <span className="text-gray-500 block mb-1.5">{t('common.created')}</span>
            <span className="text-gray-900 font-medium">
              {formatDate(course.created_at)}
            </span>
          </div>
        </div>
      </Card>
      </FadeInCard>

      {/* ── Instructor Info ─────────────────────────────────────── */}
      <FadeInCard index={1}>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          {t('common.instructor')}
        </p>
        {!instructorProfile ? (
          <p className="text-sm text-gray-400">{t('courseDetail.instructorInfoUnavailable')}</p>
        ) : (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-gray-500 block mb-1.5">{t('common.name')}</span>
              <span className="font-bold text-gray-900">
                {instructorProfile.display_name ?? '—'}
              </span>
            </div>
            {instructorProfile.contact_info && (
              <div>
                <span className="text-gray-500 block mb-1.5">{t('common.contact')}</span>
                <span className="text-gray-900">{instructorProfile.contact_info}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500 block mb-1.5">{t('common.email')}</span>
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
            {t('courseDetail.students')}
          </p>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {formatNumber(students.length)}
          </span>
        </div>
        {students.length === 0 ? (
          <p className="text-sm text-gray-400">{t('courseDetail.noStudents')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('common.name')}</th>
                <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('common.studentCode')}</th>
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
          {leaving ? t('courseDetail.leaving') : t('courseDetail.leave')}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          {t('courseDetail.leaveHelp')}
        </p>
      </div>
    </PageContainer>
  )
}
