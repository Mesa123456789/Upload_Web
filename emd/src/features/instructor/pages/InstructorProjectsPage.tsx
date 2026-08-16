import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { listInstructorCourses } from '../../courses/services/courses.service'
import {
  listCourseProjects,
  setProjectUnderReview,
} from '../../projects/services/projects.service'
import { getProfile } from '../../profile/services/profiles.service'
import type { Course, Project, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Badge from '../../../shared/components/Badge'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import { dropdownVariants, transitions } from '../../../shared/motion'

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
  const reduceMotion = useReducedMotion()

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
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)

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

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)

  return (
    <PageContainer>
      <div className="flex justify-end">
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
      <div className="mb-8 space-y-2">
        <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {t('instructorProjects.filterByCourse')}
        </label>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-400">{t('instructorProjects.noCourses')}</p>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setCourseMenuOpen((open) => !open)}
              className="flex min-h-[66px] w-full items-center justify-between gap-4 rounded-[14px] border border-[#f97316] bg-white px-4 py-3 text-left outline-none transition hover:border-[#ea580c] focus:border-[#ea580c]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-normal leading-5 text-[#252326] sm:text-[17px]">
                  {selectedCourse?.title ?? t('common.noCoursesYet')}
                </span>
                <span className="mt-1 block truncate text-[11px] leading-4 text-[#77716c]">
                  {t('projects.inviteCode', { code: selectedCourse?.invite_code ?? '-' })}
                </span>
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-[#5f5a56] transition ${courseMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {courseMenuOpen && (
                <motion.div
                  initial={reduceMotion ? false : 'initial'}
                  animate={reduceMotion ? undefined : 'animate'}
                  exit={reduceMotion ? undefined : 'exit'}
                  variants={dropdownVariants}
                  transition={transitions.fast}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 origin-top overflow-hidden rounded-[16px] border border-[#ddd9d5] bg-white shadow-[0_14px_28px_rgba(17,24,39,0.14)]"
                >
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => {
                        setSelectedCourseId(course.id)
                        setCourseMenuOpen(false)
                      }}
                      className="block w-full px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className="block truncate text-sm text-[#252326]">{course.title}</span>
                      <span className="mt-1 block truncate text-[11px] text-[#77716c]">{t('projects.inviteCode', { code: course.invite_code })}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
        <div className="overflow-hidden rounded-[24px] bg-white px-6 py-7 shadow-[0_18px_35px_rgba(17,24,39,0.08)] sm:rounded-[28px] sm:px-10">
          {projects.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              {t('instructorProjects.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed text-sm">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('common.student')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.projectName')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.currentStep')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.status')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.lastUpdated')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-[#e5e7eb] last:border-0">
                    {/* Student info */}
                    <td className="py-5 pr-4">
                      <div className="truncate text-sm font-medium text-slate-700">
                        {project.studentProfile?.display_name ?? t('common.unknown')}
                      </div>
                      {project.studentProfile?.student_code && (
                        <div className="truncate font-mono text-xs text-slate-400">
                          {project.studentProfile.student_code}
                        </div>
                      )}
                    </td>
                    <td className="py-5 pr-4">
                      <div className="truncate font-medium text-slate-700">{project.title}</div>
                    </td>
                    <td className="py-5 pr-4">
                      <Badge variant={stepVariant(project.current_step)} className="max-w-full">
                        {t(stepLabelKey(project.current_step))}
                      </Badge>
                    </td>
                    <td className="py-5 pr-4">
                      <Badge variant={statusVariant(project.status)} className="max-w-full">
                        {t(`status.${project.status}`)}
                      </Badge>
                    </td>
                    <td className="py-5 pr-4 text-xs text-slate-400">
                      {formatDate(project.updated_at)}
                    </td>
                    <td className="py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => navigate(`/instructor/project/${project.id}`)}
                          className="inline-flex min-w-[58px] items-center justify-center rounded-full border-2 border-primary/30 px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                        >
                          {t('common.view')}
                        </button>
                        <button
                          onClick={() => navigate(`/instructor/student/${project.owner_id}`)}
                          className="inline-flex min-w-[72px] items-center justify-center rounded-full border-2 border-slate-200 px-3 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50"
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
        </div>
      )}
    </PageContainer>
  )
}
