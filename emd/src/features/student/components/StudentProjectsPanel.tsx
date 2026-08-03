import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { Course, Project } from '../../../lib/database.types'
import { useI18n } from '../../../i18n/I18nProvider'
import Badge from '../../../shared/components/Badge'
import { ALL_STUDENT_COURSES, type CourseWithProjects } from '../hooks/useStudentCourseProjects'
import { dropdownVariants, transitions } from '../../../shared/motion'

interface StudentProjectsPanelProps {
  courseData: CourseWithProjects[]
  visibleCourseData: CourseWithProjects[]
  selectedCourse?: Course
  filterCourseId: string
  onFilterCourseChange: (courseId: string) => void
  error?: string | null
}

function getStepInfo(step: number): { labelKey: string; variant: 'blue' | 'yellow' | 'purple' | 'green' } {
  switch (step) {
    case 1: return { labelKey: 'steps.setup', variant: 'blue' }
    case 2: return { labelKey: 'steps.build', variant: 'yellow' }
    case 3: return { labelKey: 'steps.guardrail', variant: 'purple' }
    case 4: return { labelKey: 'steps.output', variant: 'green' }
    default: return { labelKey: 'steps.setup', variant: 'blue' }
  }
}

function getProjectPath(projectId: string, step: number): string {
  switch (step) {
    case 1: return `/project/${projectId}/setup`
    case 2: return `/project/${projectId}/build`
    case 3: return `/project/${projectId}/guardrail`
    case 4: return `/project/${projectId}/output`
    default: return `/project/${projectId}/setup`
  }
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

export default function StudentProjectsPanel({
  courseData,
  visibleCourseData,
  selectedCourse,
  filterCourseId,
  onFilterCourseChange,
  error,
}: StudentProjectsPanelProps) {
  const navigate = useNavigate()
  const { t, formatDate } = useI18n()
  const reduceMotion = useReducedMotion()
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)
  const selectedCourseLabel = filterCourseId === ALL_STUDENT_COURSES ? t('projects.allCourses') : selectedCourse?.title ?? t('projects.allCourses')
  const selectedCourseSubtext = filterCourseId === ALL_STUDENT_COURSES
    ? t('projects.joinedCourse', { count: courseData.length })
    : t('projects.inviteCode', { code: selectedCourse?.invite_code ?? '-' })
  const projectRows = visibleCourseData.flatMap(({ course, projects }) =>
    projects.map((project) => ({ course, project })),
  )

  return (
    <section id="projects" className="scroll-mt-28">
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
              {selectedCourseLabel}
            </span>
            <span className="mt-1 block truncate text-[11px] leading-4 text-[#77716c]">
              {selectedCourseSubtext}
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
                onFilterCourseChange(ALL_STUDENT_COURSES)
                setCourseMenuOpen(false)
              }}
              className="block w-full px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <span className="block truncate text-sm text-[#252326]">{t('projects.allCourses')}</span>
              <span className="mt-1 block truncate text-[11px] text-[#77716c]">{t('projects.joinedCourse', { count: courseData.length })}</span>
            </button>
            {courseData.map(({ course }) => (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  onFilterCourseChange(course.id)
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

      {error && (
        <div className="mb-5 rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {courseData.length === 0 ? (
        <div className="ds-card p-10 text-center">
          <h2 className="text-xl font-black text-slate-950">{t('projects.emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {t('projects.emptyBody')}
          </p>
          <button onClick={() => navigate('/join')} className="ds-button ds-button-primary mt-6">
            {t('projects.joinCourse')}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] bg-white px-6 py-7 shadow-[0_18px_35px_rgba(17,24,39,0.08)] sm:rounded-[28px] sm:px-10">
          {projectRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">{t('projects.emptyCourse')}</div>
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
                    <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.course')}</th>
                    <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.projectName')}</th>
                    <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.currentStep')}</th>
                    <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.status')}</th>
                    <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('projects.table.lastUpdated')}</th>
                    <th className="pb-4 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map(({ course, project }) => {
                    const stepInfo = getStepInfo(project.current_step)
                    return (
                      <tr key={project.id} className="border-b border-[#e5e7eb] last:border-0">
                        <td className="py-5 pr-4">
                          <div className="truncate font-medium text-slate-700">{course.title}</div>
                        </td>
                        <td className="py-5 pr-4">
                          <div className="truncate font-medium text-slate-700">{project.title}</div>
                        </td>
                        <td className="py-5 pr-4">
                          <Badge variant={stepInfo.variant} className="max-w-full">
                            {t(stepInfo.labelKey)}
                          </Badge>
                        </td>
                        <td className="py-5 pr-4">
                          <Badge variant={statusVariant(project.status)} className="max-w-full">
                            {t(`status.${project.status}`)}
                          </Badge>
                        </td>
                        <td className="py-5 pr-4 text-xs text-slate-400">{formatDate(project.updated_at)}</td>
                        <td className="py-5">
                          <button
                            onClick={() => navigate(getProjectPath(project.id, project.current_step))}
                            className="inline-flex min-w-[58px] items-center justify-center rounded-full border-2 border-primary/30 px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                          >
                            {t('common.view')}
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
      )}
    </section>
  )
}
