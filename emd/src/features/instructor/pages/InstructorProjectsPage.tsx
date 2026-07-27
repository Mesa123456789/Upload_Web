import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listInstructorCourses } from '../../courses/services/courses.service'
import {
  listCourseProjects,
  setProjectUnderReview,
} from '../../projects/services/projects.service'
import { getProfile } from '../../profile/services/profiles.service'
import type { Course, Project, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'

// Project row enriched with the student's profile
type ProjectWithStudent = Project & { studentProfile: Profile | null }

function ProjectsTableSkeleton() {
  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="mt-3 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>
      <div>
        <Skeleton className="mb-2 h-3 w-32" />
        <Skeleton className="h-11 w-full max-w-sm rounded-xl" />
      </div>
      <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(48,34,38,0.14)]">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-5 border-b border-black/5 py-4 last:border-0 md:grid-cols-6">
            {Array.from({ length: 6 }).map((__, cell) => (
              <Skeleton key={cell} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}

function stepLabelKey(step: number): string {
  return ['', 'steps.setup', 'steps.build', 'steps.guardrail', 'steps.output'][step] ?? 'common.unknown'
}

function stepVariant(step: number): 'blue' | 'yellow' | 'purple' | 'green' {
  return (['blue', 'blue', 'yellow', 'purple', 'green'] as const)[step] ?? 'blue'
}

// Map status to badge color — covers all 6 statuses
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

export default function InstructorProjectsPage() {
  const navigate = useNavigate()
  const { t, formatDate } = useI18n()

  // Read ?courseId=xxx from URL — CoursesPage "View Projects" button sets this
  const [searchParams] = useSearchParams()
  const courseIdFromUrl = searchParams.get('courseId')

  const [courses, setCourses] = useState<Course[]>([])
  const [projects, setProjects] = useState<ProjectWithStudent[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await listInstructorCourses()
        setCourses(data)

        if (data.length > 0) {
          // Prefer the courseId from URL if it matches a real course
          const matchedId = courseIdFromUrl && data.some((c) => c.id === courseIdFromUrl)
            ? courseIdFromUrl
            : data[0].id
          setSelectedCourseId(matchedId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('instructorProjects.loadCoursesFailed'))
      } finally {
        setLoading(false)
      }
    }
    loadCourses()
    // courseIdFromUrl intentionally omitted from deps — only used for initial selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedCourseId) return

    async function loadProjects() {
      setProjectsLoading(true)
      try {
        const data = await listCourseProjects(selectedCourseId)

        // Enrich each project with its owner's profile — parallel fetches
        const enriched = await Promise.all(
          data.map(async (project) => {
            const studentProfile = await getProfile(project.owner_id).catch(() => null)
            return { ...project, studentProfile }
          })
        )
        setProjects(enriched)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('instructorProjects.loadProjectsFailed'))
      } finally {
        setProjectsLoading(false)
      }
    }
    loadProjects()
  }, [selectedCourseId])

  // Update a single project's status in local state
  function updateProjectInState(projectId: string, updates: Partial<Project>) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
    )
  }

  // Bulk action: set all submitted/resubmitted projects to under_review
  async function handleSetAllUnderReview() {
    const targets = projects.filter(
      (p) => p.status === 'submitted' || p.status === 'resubmitted'
    )
    if (targets.length === 0) return
    setBulkLoading(true)
    try {
      await Promise.all(
        targets.map(async (p) => {
          await setProjectUnderReview(p.id)
          updateProjectInState(p.id, { status: 'under_review' })
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('instructorProjects.bulkUpdateFailed'))
    } finally {
      setBulkLoading(false)
    }
  }

  // Per-row quick action: set project to under_review
  async function handleRowStatusChange(projectId: string, newStatus: string) {
    try {
      if (newStatus === 'under_review') {
        await setProjectUnderReview(projectId)
        updateProjectInState(projectId, { status: 'under_review' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('instructorProjects.statusUpdateFailed'))
    }
  }

  if (loading) {
    return <ProjectsTableSkeleton />
  }

  return (
    <PageContainer>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
            {t('dashboard.instructor.eyebrow')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('instructorProjects.title')}</h1>
          <p className="text-sm text-gray-500 leading-6 mt-1">{t('instructorProjects.subtitle')}</p>
        </div>

        {/* Bulk action: lock all submitted/resubmitted for review */}
        {projects.some((p) => p.status === 'submitted' || p.status === 'resubmitted') && (
          <button
            onClick={handleSetAllUnderReview}
            disabled={bulkLoading}
            className="rounded-full border-2 border-primary/30 px-5 py-2 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors"
          >
            {bulkLoading ? t('instructorProjects.updating') : t('instructorProjects.setAllUnderReview')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Course filter dropdown */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
          {t('instructorProjects.filterByCourse')}
        </label>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-400">{t('instructorProjects.noCourses')}</p>
        ) : (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-card focus:outline-none focus:ring-2 focus:ring-primary/30 w-full max-w-sm"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Projects table */}
      {projectsLoading ? (
        <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(48,34,38,0.14)]">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="grid grid-cols-3 gap-5 border-b border-black/5 py-4 last:border-0 md:grid-cols-6">
              {Array.from({ length: 6 }).map((__, cell) => (
                <Skeleton key={cell} className="h-4" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {projects.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              {t('instructorProjects.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
            <table className="ds-table min-w-[880px] table-fixed text-sm">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">{t('common.student')}</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">{t('projects.table.projectName')}</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">{t('projects.table.currentStep')}</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">{t('projects.table.status')}</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">{t('projects.table.lastUpdated')}</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                    {/* Student info */}
                    <td>
                      <div className="ds-one-line text-sm font-medium text-gray-800">
                        {project.studentProfile?.display_name ?? t('common.unknown')}
                      </div>
                      {project.studentProfile?.student_code && (
                        <div className="ds-one-line font-mono text-xs text-gray-400">
                          {project.studentProfile.student_code}
                        </div>
                      )}
                    </td>
                    <td className="ds-one-line font-medium text-gray-800">{project.title}</td>
                    <td>
                      <Badge variant={stepVariant(project.current_step)} className="max-w-full">
                        {t(stepLabelKey(project.current_step))}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={statusVariant(project.status)} className="max-w-full">
                        {t(`status.${project.status}`)}
                      </Badge>
                    </td>
                    <td className="ds-one-line text-gray-400 text-xs">
                      {formatDate(project.updated_at)}
                    </td>
                    <td>
                      <div className="flex gap-2 items-center flex-wrap">
                        <button
                          onClick={() => navigate(`/instructor/project/${project.id}`)}
                          className="inline-flex min-w-[58px] items-center justify-center rounded-full border-2 border-primary/30 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                        >
                          {t('common.view')}
                        </button>
                        <button
                          onClick={() => navigate(`/instructor/student/${project.owner_id}`)}
                          className="inline-flex min-w-[72px] items-center justify-center rounded-full border-2 border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          {t('common.profile')}
                        </button>
                        {/* Quick action — Under Review only; full grading in ProjectDetail */}
                        {(project.status === 'submitted' || project.status === 'resubmitted') && (
                          <select
                            value=""
                            onChange={(e) => handleRowStatusChange(project.id, e.target.value)}
                            className="max-w-[118px] border border-black/10 rounded-full px-3 py-1 text-xs bg-background-card focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                          >
                            <option value="" disabled>{t('common.actionPlaceholder')}</option>
                            <option value="under_review">{t('instructorProjects.underReview')}</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  )
}
