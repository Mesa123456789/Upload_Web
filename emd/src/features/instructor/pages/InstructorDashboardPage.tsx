import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Plus } from 'lucide-react'
import { listInstructorCourses, listEnrolledStudents } from '../../courses/services/courses.service'
import { listCourseProjects } from '../../projects/services/projects.service'
import { getProfile } from '../../profile/services/profiles.service'
import type { Course, Project, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Badge from '../../../shared/components/Badge'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import { dropdownVariants, transitions } from '../../../shared/motion'

const ALL_COURSES = '__ALL__'

type ProjectWithStudent = Project & { studentProfile: Profile | null }

function StatCard({
  label,
  value,
  accent,
  watermark,
}: {
  label: string
  value: string
  accent: string
  watermark: string
}) {
  return (
    <div className={`relative h-[156px] overflow-hidden rounded-[24px] px-5 py-5 text-white shadow-sm sm:h-[172px] sm:rounded-[28px] sm:px-7 sm:py-6 xl:h-[166px] 2xl:h-[188px] 2xl:rounded-[30px] 2xl:px-8 2xl:py-7 ${accent}`}>
      <p className="ds-stat-card-label text-[18px] font-normal drop-shadow-md sm:text-[22px] 2xl:text-[24px]">{label}</p>
      <p className="ds-stat-card-value text-center text-[52px] font-black leading-none text-[#fff3e4] drop-shadow-[0_8px_8px_rgba(48,34,38,0.35)] sm:text-[64px] 2xl:text-[72px]">
        {value}
      </p>
      <span className="ds-stat-card-watermark pointer-events-none absolute -bottom-5 right-0 text-[150px] font-black leading-none text-white/20 sm:-bottom-6 sm:text-[190px] 2xl:-bottom-7 2xl:text-[220px]">
        {watermark}
      </span>
    </div>
  )
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
  const [studentsLoading, setStudentsLoading] = useState(false)
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
        const projectArrays = await Promise.all(fetchedCourses.map((course) => listCourseProjects(course.id)))
        const projects = projectArrays.flat()
        const enriched = await Promise.all(
          projects.map(async (project) => ({
            ...project,
            studentProfile: await getProfile(project.owner_id).catch(() => null),
          }))
        )
        setAllProjects(enriched)
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
      setStudentsLoading(true)
      try {
        setEnrolledStudents(await listEnrolledStudents(selectedCourseId))
      } catch {
        setEnrolledStudents([])
      } finally {
        setStudentsLoading(false)
      }
    }
    void loadStudents()
  }, [selectedCourseId])

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)
  const visibleProjects = useMemo(
    () => selectedCourseId === ALL_COURSES
      ? allProjects
      : allProjects.filter((project) => project.course_id === selectedCourseId),
    [allProjects, selectedCourseId],
  )
  const activeCourseCount = courses.filter((course) => course.is_active).length
  const submitted = visibleProjects.filter((project) => project.status !== 'draft').length
  const guardrailReady = visibleProjects.filter((project) => project.current_step >= 3).length
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.instructor.stats.courses')} value={formatNumber(activeCourseCount)} accent="bg-[#1d80f7]" watermark="C" />
        <StatCard label={t('dashboard.instructor.stats.activeProjects')} value={formatNumber(visibleProjects.length)} accent="bg-[#2ba573]" watermark="A" />
        <StatCard label={t('dashboard.instructor.stats.submitted')} value={formatNumber(submitted || visibleProjects.length)} accent="bg-[#e97831]" watermark="M" />
        <StatCard label={t('dashboard.instructor.stats.guardrailReady')} value={formatNumber(guardrailReady)} accent="bg-[#ffd032]" watermark="T" />
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(280px,330px)] 2xl:mt-9 2xl:gap-10">
        <section className="min-w-0">
          <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <h2 className="min-w-0 text-[24px] font-normal leading-tight text-black sm:text-[28px]">{t('dashboard.instructor.myCourses')}</h2>
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <span className="shrink-0 text-[16px] font-normal text-[#8a8580] sm:text-[18px]">{t('common.activeCount', { count: formatNumber(activeCourseCount) })}</span>
              <button
                onClick={() => navigate('/instructor/courses')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffd032] text-black shadow-sm transition hover:bg-[#f2bd18]"
                title={t('dashboard.instructor.addCourse')}
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setCourseMenuOpen((open) => !open)}
              className="flex min-h-[64px] w-full items-center justify-between gap-4 rounded-[16px] border border-[#ddd9d5] bg-white px-4 py-3 text-left outline-none transition hover:border-[#f5a000] focus:border-[#f5a000]"
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
            {courseMenuOpen && courses.length > 0 && (
              <motion.div
                initial={reduceMotion ? false : 'initial'}
                animate={reduceMotion ? undefined : 'animate'}
                exit={reduceMotion ? undefined : 'exit'}
                variants={dropdownVariants}
                transition={transitions.fast}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 origin-top overflow-hidden rounded-[16px] border border-[#ddd9d5] bg-white shadow-[0_14px_28px_rgba(48,34,38,0.14)]"
              >
                {courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      setSelectedCourseId(course.id)
                      setCourseMenuOpen(false)
                    }}
                    className="block w-full px-4 py-3 text-left transition hover:bg-[#fbfaf7]"
                  >
                    <span className="block truncate text-sm text-[#252326]">{course.title}</span>
                    <span className="mt-1 block truncate text-[11px] text-[#77716c]">{t('projects.inviteCode', { code: course.invite_code })}</span>
                  </button>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] bg-white p-3 shadow-[0_14px_28px_rgba(48,34,38,0.09)] sm:p-4">
            {visibleProjects.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#8a8580]">{t('dashboard.instructor.noStudentProjects')}</div>
            ) : (
              <div className="overflow-x-auto">
                  <table className="ds-table min-w-[860px] table-fixed text-sm">
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
                      <th className="pb-2 text-left text-xs font-bold text-gray-400">{t('common.student')}</th>
                      <th className="pb-2 text-left text-xs font-bold text-gray-400">{t('projects.table.projectName')}</th>
                      <th className="pb-2 text-left text-xs font-bold text-gray-400">{t('projects.table.currentStep')}</th>
                      <th className="pb-2 text-left text-xs font-bold text-gray-400">{t('projects.table.status')}</th>
                      <th className="pb-2 text-left text-xs font-bold text-gray-400">{t('projects.table.lastUpdated')}</th>
                      <th className="pb-2 text-left text-xs font-bold text-gray-400">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProjects.slice(0, 9).map((project) => (
                      <tr key={project.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                        <td>
                          <div className="ds-one-line max-w-[150px] text-sm font-semibold text-gray-900">
                            {project.studentProfile?.display_name ?? t('common.unknown')}
                          </div>
                          {project.studentProfile?.student_code && (
                            <div className="ds-one-line text-xs font-mono text-gray-400">
                              {project.studentProfile.student_code}
                            </div>
                          )}
                        </td>
                        <td className="ds-one-line font-semibold text-gray-900">{project.title}</td>
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
                        <td className="ds-one-line text-xs text-gray-400">{formatDate(project.updated_at)}</td>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => navigate(`/instructor/project/${project.id}`)}
                              className="inline-flex min-w-[58px] items-center justify-center rounded-full border border-primary/35 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/5"
                            >
                              {t('common.view')}
                            </button>
                            <button
                              onClick={() => navigate(`/instructor/student/${project.owner_id}`)}
                              className="inline-flex min-w-[72px] items-center justify-center rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                            >
                              {t('common.profile')}
                            </button>
                            {(project.status === 'submitted' || project.status === 'resubmitted') && (
                              <select
                                value=""
                                className="max-w-[118px] rounded-full border border-black/10 bg-white px-3 py-1 text-xs outline-none"
                                onChange={() => navigate(`/instructor/project/${project.id}`)}
                              >
                                <option value="" disabled>{t('common.actionPlaceholder')}</option>
                                <option value="review">{t('common.review')}</option>
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

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => navigate('/instructor/projects')}
                 className="h-9 min-w-[132px] rounded-full bg-[#ffd032] px-8 text-sm font-bold text-black transition hover:bg-[#f2bd18]"
              >
                {t('common.viewAll')}
              </button>
            </div>
          </div>
        </section>

        <aside className="grid gap-6 md:grid-cols-2 xl:block xl:space-y-6">
          <section className="rounded-[30px] border border-[#ddd9d5] bg-white px-6 py-6 2xl:px-8 2xl:py-7">
            <h2 className="mb-5 text-[20px] font-normal text-black 2xl:mb-7 2xl:text-[21px]">{t('dashboard.instructor.popularTopics')}</h2>
            {popularTopics.length === 0 ? (
              <p className="py-10 text-center text-xs text-[#8c8885]">{t('dashboard.instructor.noTopicData')}</p>
            ) : popularTopics.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-[#e0ddd9] py-2 text-sm text-[#252326] last:border-b-0">
                <span className="min-w-0 truncate">{label}</span>
                <span>{formatNumber(value)}</span>
              </div>
            ))}
          </section>

          <section className="rounded-[30px] border border-[#ddd9d5] bg-white px-6 py-6 2xl:px-7">
            <h2 className="mb-5 text-[20px] font-normal text-black 2xl:text-[21px]">{t('dashboard.instructor.enrolledStudents')}</h2>
            {selectedCourseId === ALL_COURSES ? (
              <p className="py-12 text-center text-xs text-[#8c8885]">{t('dashboard.instructor.selectedCourseHint')}</p>
            ) : studentsLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                    <Skeleton className="h-8 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            ) : enrolledStudents.length === 0 ? (
              <p className="py-12 text-center text-xs text-[#8c8885]">{t('dashboard.instructor.noStudents')}</p>
            ) : (
              <div className="dashboard-student-scroll max-h-[150px] space-y-3 overflow-y-auto pr-3">
                {enrolledStudents.slice(0, 8).map((student) => (
                  <div key={student.id} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3">
                    <span className="h-10 w-10 rounded-full bg-[#d9d8d6]" />
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] text-[#252326]">{student.display_name ?? student.email}</span>
                      <span className="block text-[9px] text-[#5f5a56]">{student.student_code ?? student.major ?? t('common.student')}</span>
                    </span>
                    <button
                      onClick={() => navigate(`/instructor/student/${student.id}`)}
                      className="inline-flex h-8 min-w-[44px] items-center justify-center rounded-full bg-[#d9d8d6] px-3 text-[12px] text-[#252326] transition hover:bg-[#cbc9c6]"
                    >
                      {t('common.view')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </PageContainer>
  )
}
