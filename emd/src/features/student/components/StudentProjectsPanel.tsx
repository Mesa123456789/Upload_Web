import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Plus } from 'lucide-react'
import type { Course, Project } from '../../../lib/database.types'
import { useI18n } from '../../../i18n/I18nProvider'
import Badge from '../../../shared/components/Badge'
import { ALL_STUDENT_COURSES, type CourseWithProjects } from '../hooks/useStudentCourseProjects'
import { dropdownVariants, transitions } from '../../../shared/motion'

interface StudentProjectsPanelProps {
  courseData: CourseWithProjects[]
  visibleCourseData: CourseWithProjects[]
  projects: Project[]
  selectedCourse?: Course
  filterCourseId: string
  onFilterCourseChange: (courseId: string) => void
  error?: string | null
  headingLevel?: 'h1' | 'h2'
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

export default function StudentProjectsPanel({
  courseData,
  visibleCourseData,
  projects,
  selectedCourse,
  filterCourseId,
  onFilterCourseChange,
  error,
  headingLevel = 'h2',
}: StudentProjectsPanelProps) {
  const navigate = useNavigate()
  const { t, formatDate, formatNumber } = useI18n()
  const reduceMotion = useReducedMotion()
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)
  const Heading = headingLevel
  const selectedCourseLabel = filterCourseId === ALL_STUDENT_COURSES ? t('projects.allCourses') : selectedCourse?.title ?? t('projects.allCourses')
  const selectedCourseSubtext = filterCourseId === ALL_STUDENT_COURSES
    ? t('projects.joinedCourse', { count: courseData.length })
    : t('projects.inviteCode', { code: selectedCourse?.invite_code ?? '-' })

  return (
    <section id="projects" className="scroll-mt-28">
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <Heading className="min-w-0 text-[24px] font-normal leading-tight text-black sm:text-[28px]">{t('projects.myProjects')}</Heading>
        <span className="shrink-0 text-[16px] font-normal text-[#8a8580] sm:text-[18px]">
          {t('common.activeCount', { count: formatNumber(projects.length) })}
        </span>
      </div>

      <div className="relative mb-5">
        <button
          type="button"
          onClick={() => setCourseMenuOpen((open) => !open)}
          className="flex min-h-[64px] w-full items-center justify-between gap-4 rounded-[16px] border border-[#ddd9d5] bg-white px-4 py-3 text-left outline-none transition hover:border-[#f97316] focus:border-[#f97316]"
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
        <div className="overflow-hidden rounded-[24px] bg-white p-3 shadow-[0_14px_28px_rgba(17,24,39,0.08)] sm:p-4">
          {visibleCourseData.map(({ course, projects }) => (
            <div key={course.id} className="border-b border-black/5 py-4 first:pt-0 last:border-0 last:pb-0">
              <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="ds-eyebrow">{t('projects.course')}</p>
                  <h3 className="mt-1 truncate text-base font-black text-slate-950">{course.title}</h3>
                  {course.description && (
                    <p className="mt-1 text-sm leading-6 text-slate-500">{course.description}</p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/project/new?courseId=${course.id}`)}
                  className="ds-button ds-button-primary w-full sm:w-auto sm:min-w-[190px]"
                >
                  <Plus className="h-4 w-4" />
                  {t('projects.createNew')}
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  {t('projects.emptyCourse')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="ds-table min-w-[780px] table-fixed">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[16%]" />
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>{t('projects.table.projectName')}</th>
                        <th>{t('projects.table.status')}</th>
                        <th>{t('projects.table.currentStep')}</th>
                        <th>{t('projects.table.lastUpdated')}</th>
                        <th className="text-right">{t('projects.table.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => {
                        const stepInfo = getStepInfo(project.current_step)
                        return (
                          <tr key={project.id}>
                            <td className="ds-one-line font-bold text-slate-900">{project.title}</td>
                            <td><Badge className="max-w-full">{t(`status.${project.status}`)}</Badge></td>
                            <td><Badge variant={stepInfo.variant} className="max-w-full">{t(stepInfo.labelKey)}</Badge></td>
                            <td className="ds-one-line text-slate-500">{formatDate(project.updated_at)}</td>
                            <td className="text-right">
                              <button
                                onClick={() => navigate(getProjectPath(project.id, project.current_step))}
                                className="ds-button ds-button-secondary min-h-0 min-w-[86px] px-4 py-2 text-xs"
                              >
                                {t('common.open')}
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
          ))}
        </div>
      )}
    </section>
  )
}
