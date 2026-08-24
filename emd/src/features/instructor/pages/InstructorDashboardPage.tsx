import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { listInstructorCourses, listEnrolledStudents } from '../../courses/services/courses.service'
import { listCourseProjects } from '../../projects/services/projects.service'
import { getProfile } from '../../profile/services/profiles.service'
import type { Course, Project, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Badge from '../../../shared/components/Badge'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import Eight from '../../../components/animata/bento-grid/eight'
import { dropdownVariants, transitions } from '../../../shared/motion'

const ALL_COURSES = '__ALL__'

type ProjectWithStudent = Project & { studentProfile: Profile | null }

function normalizeBars(values: number[], minimum = 18) {
  const max = Math.max(...values, 1)
  return values.map((value) => value === 0 ? 8 : Math.max(minimum, Math.round((value / max) * 100)))
}

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

function DashboardSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-10 h-9 w-44" />
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[150px] rounded-[28px]" />
        ))}
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(280px,330px)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <Skeleton className="h-[52px] rounded-[16px]" />
          <div className="mt-5 rounded-[24px] bg-white p-4 shadow-[0_14px_28px_rgba(48,34,38,0.09)]">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 border-b border-black/5 py-3 last:border-0 sm:grid-cols-6">
                {Array.from({ length: 6 }).map((__, cell) => (
                  <Skeleton key={cell} className="h-4" />
                ))}
              </div>
            ))}
          </div>
        </section>
        <aside className="grid gap-6 md:grid-cols-2 xl:block xl:space-y-6">
          <Skeleton className="h-[210px] rounded-[30px]" />
          <Skeleton className="h-[210px] rounded-[30px]" />
        </aside>
      </div>
    </PageContainer>
  )
}

export default function InstructorDashboardPage() {
  const navigate = useNavigate()
  const { t, formatDate, formatNumber } = useI18n()
  const reduceMotion = useReducedMotion()

  const [courses, setCourses] = useState<Course[]>([])
  const [allProjects, setAllProjects] = useState<ProjectWithStudent[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>(ALL_COURSES)
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const fetchedCourses = await listInstructorCourses()
        setCourses(fetchedCourses)
        if (fetchedCourses.length > 0) {
          setSelectedCourseId(fetchedCourses[0].id)
        }
        const [projectArrays, studentArrays] = await Promise.all([
          Promise.all(fetchedCourses.map((course) => listCourseProjects(course.id))),
          Promise.all(fetchedCourses.map((course) => listEnrolledStudents(course.id).catch(() => []))),
        ])
        const projects = projectArrays.flat()
        const enriched = await Promise.all(
          projects.map(async (project) => ({
            ...project,
            studentProfile: await getProfile(project.owner_id).catch(() => null),
          }))
        )
        setAllProjects(enriched)
        const uniqueStudents = new Map<string, Profile>()
        studentArrays.flat().forEach((student) => uniqueStudents.set(student.id, student))
        setEnrolledStudents(Array.from(uniqueStudents.values()))
      } catch (err) {
        setError(err instanceof Error ? err.message : t('output.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (selectedCourseId === ALL_COURSES) {
      setEnrolledStudents([])
      return
    }

    async function loadStudents() {
      try {
        setEnrolledStudents(await listEnrolledStudents(selectedCourseId))
      } catch {
        setEnrolledStudents([])
      }
    }
    void loadStudents()
  }, [selectedCourseId])

  const visibleProjects = useMemo(
    () => selectedCourseId === ALL_COURSES
      ? allProjects
      : allProjects.filter((project) => project.course_id === selectedCourseId),
    [allProjects, selectedCourseId],
  )
  const selectedCourse = courses.find((course) => course.id === selectedCourseId)
  const activeCourseCount = courses.filter((course) => course.is_active).length
  const submitted = visibleProjects.filter((project) => project.status !== 'draft').length
  const reviewQueue = visibleProjects.filter((project) => project.status === 'submitted' || project.status === 'resubmitted').length
  const reviewBars = normalizeBars([
    visibleProjects.filter((project) => project.status === 'draft').length,
    visibleProjects.filter((project) => project.status === 'submitted').length,
    visibleProjects.filter((project) => project.status === 'resubmitted').length,
    visibleProjects.filter((project) => project.status === 'under_review').length,
    visibleProjects.filter((project) => project.status === 'returned').length,
    visibleProjects.filter((project) => project.status === 'graded').length,
  ])
  const popularTopics = useMemo(() => {
    const counts = new Map<string, number>()
    visibleProjects.forEach((project) => {
      project.genre?.forEach((topic) => {
        const normalized = topic.trim()
        if (!normalized) return
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
  }, [visibleProjects])
  const studentPreviews = enrolledStudents.slice(0, 4).map((student) => ({
    id: student.id,
    name: student.display_name ?? student.email ?? t('common.student'),
    detail: student.student_code ?? student.major ?? t('common.student'),
  }))

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <PageContainer>
      {error && (
        <div className="mb-6 rounded-[24px] bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      <Eight
        courses={activeCourseCount}
        activeProjects={visibleProjects.length}
        submittedReady={submitted}
        students={enrolledStudents.length}
        studentPreviews={studentPreviews}
        reviewBars={reviewBars}
        popularTopics={popularTopics.map(([label, count]) => ({ label, count }))}
        onStudentClick={(studentId) => navigate(`/instructor/student/${studentId}`)}
        onStudentsViewAll={() => navigate(selectedCourseId === ALL_COURSES ? '/instructor/students' : `/instructor/students?courseId=${selectedCourseId}`)}
        reviewQueue={reviewQueue}
      />

      <section className="mt-7 min-w-0 2xl:mt-9">
        <div className="mb-8 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {t('instructorProjects.filterByCourse')}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCourseMenuOpen((open) => !open)}
              className="flex min-h-[66px] w-full items-center justify-between gap-4 rounded-[14px] border border-[#f97316] bg-white px-4 py-3 text-left outline-none transition hover:border-[#ea580c] focus:border-[#ea580c]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-normal leading-5 text-[#252326] sm:text-[17px]">
                  {selectedCourseId === ALL_COURSES ? t('projects.allCourses') : selectedCourse?.title ?? t('common.noCoursesYet')}
                </span>
                <span className="mt-1 block truncate text-[11px] leading-4 text-[#77716c]">
                  {selectedCourseId === ALL_COURSES
                    ? t('common.activeCount', { count: formatNumber(courses.length) })
                    : t('projects.inviteCode', { code: selectedCourse?.invite_code ?? '-' })}
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourseId(ALL_COURSES)
                      setCourseMenuOpen(false)
                    }}
                    className="block w-full px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="block truncate text-sm text-[#252326]">{t('projects.allCourses')}</span>
                    <span className="mt-1 block truncate text-[11px] text-[#77716c]">{t('common.activeCount', { count: formatNumber(courses.length) })}</span>
                  </button>
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
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white px-6 py-7 shadow-[0_18px_35px_rgba(17,24,39,0.08)] sm:rounded-[28px] sm:px-10">
          {visibleProjects.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">{t('dashboard.instructor.noStudentProjects')}</div>
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
                  {visibleProjects.map((project) => (
                    <tr key={project.id} className="border-b border-[#e5e7eb] last:border-0">
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
                      <td className="py-5 pr-4 text-xs text-slate-400">{formatDate(project.updated_at)}</td>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

    </PageContainer>
  )
}
