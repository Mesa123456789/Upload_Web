import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { listInstructorCourses, listEnrolledStudents } from '../../courses/services/courses.service'
import { listCourseProjects } from '../../projects/services/projects.service'
import type { Course, Profile, Project } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import { dropdownVariants, transitions } from '../../../shared/motion'

const ALL_COURSES = '__ALL__'

type StudentCourseRow = {
  course: Course
  student: Profile
  projectCount: number
  latestUpdate: string | null
}

function StudentsSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="h-[66px] rounded-[14px]" />
      <div className="rounded-[28px] bg-white px-10 py-7 shadow-[0_18px_35px_rgba(17,24,39,0.08)]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-5 border-b border-[#e5e7eb] py-5 last:border-0">
            {Array.from({ length: 5 }).map((__, cell) => (
              <Skeleton key={cell} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'ST'
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('')
}

export default function InstructorStudentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const courseIdFromUrl = searchParams.get('courseId')
  const { t, formatDate, formatNumber } = useI18n()
  const reduceMotion = useReducedMotion()

  const [courses, setCourses] = useState<Course[]>([])
  const [rows, setRows] = useState<StudentCourseRow[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>(ALL_COURSES)
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const fetchedCourses = await listInstructorCourses()
        setCourses(fetchedCourses)
        if (courseIdFromUrl && fetchedCourses.some((course) => course.id === courseIdFromUrl)) {
          setSelectedCourseId(courseIdFromUrl)
        }

        const courseRows = await Promise.all(
          fetchedCourses.map(async (course) => {
            const [students, projects] = await Promise.all([
              listEnrolledStudents(course.id).catch(() => []),
              listCourseProjects(course.id).catch(() => [] as Project[]),
            ])

            return students.map((student) => {
              const studentProjects = projects.filter((project) => project.owner_id === student.id)
              const latestUpdate = studentProjects
                .map((project) => project.updated_at)
                .sort((a, b) => b.localeCompare(a))[0] ?? null

              return {
                course,
                student,
                projectCount: studentProjects.length,
                latestUpdate,
              }
            })
          }),
        )

        setRows(courseRows.flat())
      } catch (err) {
        setError(err instanceof Error ? err.message : t('instructorStudents.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const selectedCourse = courses.find((course) => course.id === selectedCourseId)
  const visibleRows = useMemo(
    () => selectedCourseId === ALL_COURSES ? rows : rows.filter((row) => row.course.id === selectedCourseId),
    [rows, selectedCourseId],
  )
  const selectedCourseLabel = selectedCourseId === ALL_COURSES ? t('projects.allCourses') : selectedCourse?.title ?? t('projects.allCourses')
  const selectedCourseSubtext = selectedCourseId === ALL_COURSES
    ? t('common.activeCount', { count: formatNumber(courses.length) })
    : t('projects.inviteCode', { code: selectedCourse?.invite_code ?? '-' })

  if (loading) return <StudentsSkeleton />

  return (
    <PageContainer>
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

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
              <span className="block truncate text-[15px] font-normal leading-5 text-[#252326] sm:text-[17px]">{selectedCourseLabel}</span>
              <span className="mt-1 block truncate text-[11px] leading-4 text-[#77716c]">{selectedCourseSubtext}</span>
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
        {visibleRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">{t('instructorStudents.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed text-sm">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('common.student')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.course')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('instructorStudent.studentId')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('instructorStudents.projects')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.lastUpdated')}</th>
                  <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const name = row.student.display_name ?? row.student.email ?? t('common.unknown')
                  return (
                    <tr key={`${row.course.id}-${row.student.id}`} className="border-b border-[#e5e7eb] last:border-0">
                      <td className="py-5 pr-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                            {initialsFromName(name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-700">{name}</div>
                            <div className="truncate text-xs text-slate-400">{row.student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 pr-4">
                        <div className="truncate font-medium text-slate-700">{row.course.title}</div>
                      </td>
                      <td className="py-5 pr-4 text-slate-500">{row.student.student_code ?? '-'}</td>
                      <td className="py-5 pr-4 text-slate-500">{formatNumber(row.projectCount)}</td>
                      <td className="py-5 pr-4 text-xs text-slate-400">{row.latestUpdate ? formatDate(row.latestUpdate) : '-'}</td>
                      <td className="py-5">
                        <button
                          onClick={() => navigate(`/instructor/student/${row.student.id}`)}
                          className="inline-flex min-w-[72px] items-center justify-center rounded-full border-2 border-primary/30 px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                        >
                          {t('common.profile')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
