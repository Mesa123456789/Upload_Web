import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listInstructorCourses } from '../../courses/services/courses.service'
import { listCourseProjects } from '../../projects/services/projects.service'
import { getProfile } from '../../profile/services/profiles.service'
import type { Course, Profile, Project } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import { ProjectDetailSkeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'

type StudentProject = Project & { courseTitle: string }

function stepLabelKey(step: number): string {
  return ['', 'steps.setup', 'steps.build', 'steps.guardrail', 'steps.output'][step] ?? 'common.unknown'
}

function stepVariant(step: number): 'blue' | 'yellow' | 'purple' | 'green' {
  return (['blue', 'blue', 'yellow', 'purple', 'green'] as const)[step] ?? 'blue'
}

function statusVariant(status: Project['status']): 'default' | 'blue' | 'green' | 'yellow' | 'purple' | 'red' {
  switch (status) {
    case 'submitted': return 'blue'
    case 'resubmitted': return 'yellow'
    case 'under_review': return 'purple'
    case 'returned': return 'red'
    case 'graded': return 'green'
    default: return 'default'
  }
}

export default function InstructorStudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { t, formatDate, formatNumber } = useI18n()

  const [student, setStudent] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [projects, setProjects] = useState<StudentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStudentData() {
      if (!studentId) {
        setError(t('instructorStudent.notFound'))
        setLoading(false)
        return
      }

      try {
        const [profileData, instructorCourses] = await Promise.all([
          getProfile(studentId),
          listInstructorCourses(),
        ])

        setStudent(profileData)
        setCourses(instructorCourses)

        const projectGroups = await Promise.all(
          instructorCourses.map(async (course) => {
            const courseProjects = await listCourseProjects(course.id)
            return courseProjects
              .filter((project) => project.owner_id === studentId)
              .map((project) => ({ ...project, courseTitle: course.title }))
          }),
        )

        setProjects(projectGroups.flat().sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
      } catch (err) {
        setError(err instanceof Error ? err.message : t('instructorStudent.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    void loadStudentData()
  }, [studentId])

  if (loading) {
    return (
      <PageContainer>
        <ProjectDetailSkeleton />
      </PageContainer>
    )
  }

  if (!student) {
    return (
      <PageContainer>
        <Card>
          <p className="text-sm text-red-600">{error ?? t('instructorStudent.notFound')}</p>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('common.student')}</p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{student.display_name ?? student.email}</h1>
        <p className="mt-1 text-sm leading-6 text-gray-500">{t('instructorStudent.subtitle')}</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d9d8d6] text-2xl font-bold text-[#302226]">
              {(student.display_name ?? student.email ?? '?').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-gray-900">{student.display_name ?? t('instructorStudent.unknownStudent')}</p>
              <p className="truncate text-sm text-gray-500">{student.email}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-t border-black/5 pt-4">
              <span className="text-gray-400">{t('common.role')}</span>
              <span className="font-semibold capitalize text-gray-900">{t(`roles.${student.role}`)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">{t('instructorStudent.studentId')}</span>
              <span className="max-w-[60%] truncate font-semibold text-gray-900">{student.student_code ?? '-'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">{t('instructorStudent.major')}</span>
              <span className="max-w-[60%] truncate font-semibold text-gray-900">{student.major ?? '-'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">{t('instructorStudent.year')}</span>
              <span className="font-semibold text-gray-900">{student.year ?? '-'}</span>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">{t('instructorStudent.projects')}</h2>
            <span className="text-sm text-gray-400">
              {t('instructorStudent.projectCount', { projects: formatNumber(projects.length), courses: formatNumber(courses.length), count: projects.length })}
            </span>
          </div>

          {projects.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">{t('instructorStudent.emptyProjects')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="pb-3 text-left text-xs font-bold text-gray-400">{t('projects.table.projectName')}</th>
                    <th className="pb-3 text-left text-xs font-bold text-gray-400">{t('common.course')}</th>
                    <th className="pb-3 text-left text-xs font-bold text-gray-400">{t('projects.table.currentStep')}</th>
                    <th className="pb-3 text-left text-xs font-bold text-gray-400">{t('projects.table.status')}</th>
                    <th className="pb-3 text-left text-xs font-bold text-gray-400">{t('projects.table.lastUpdated')}</th>
                    <th className="pb-3 text-left text-xs font-bold text-gray-400">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                      <td className="truncate py-3 font-semibold text-gray-900">{project.title}</td>
                      <td className="truncate py-3 text-gray-600">{project.courseTitle}</td>
                      <td className="py-3">
                        <Badge variant={stepVariant(project.current_step)}>{t(stepLabelKey(project.current_step))}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={statusVariant(project.status)}>{t(`status.${project.status}`)}</Badge>
                      </td>
                      <td className="py-3 text-xs text-gray-400">{formatDate(project.updated_at)}</td>
                      <td className="py-3">
                        <button
                          onClick={() => navigate(`/instructor/project/${project.id}`)}
                          className="rounded-full border-2 border-primary/30 px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                        >
                          {t('common.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
