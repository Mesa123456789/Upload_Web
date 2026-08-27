import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../../i18n/I18nProvider'
import type { Course } from '../../../lib/database.types'
import { dialogBackdropVariants, dialogVariants, transitions } from '../../../shared/motion'

interface CreateProjectCourseDialogProps {
  courses: Course[]
  open: boolean
  onClose: () => void
}

export default function CreateProjectCourseDialog({
  courses,
  open,
  onClose,
}: CreateProjectCourseDialogProps) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()

  function handleSelectCourse(courseId: string) {
    onClose()
    navigate(`/project/new?courseId=${courseId}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? false : 'initial'}
          animate={reduceMotion ? undefined : 'animate'}
          exit={reduceMotion ? undefined : 'exit'}
          variants={dialogBackdropVariants}
          transition={transitions.fast}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={reduceMotion ? false : 'initial'}
            animate={reduceMotion ? undefined : 'animate'}
            exit={reduceMotion ? undefined : 'exit'}
            variants={dialogVariants}
            transition={transitions.base}
            className="w-full max-w-lg rounded-2xl bg-background-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">{t('projects.chooseCourseTitle')}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{t('projects.chooseCourseBody')}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-slate-500 transition hover:bg-slate-50"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSelectCourse(course.id)}
                  className="block w-full rounded-xl border border-line bg-white px-4 py-3 text-left transition hover:border-primary/40 hover:bg-orange-50"
                >
                  <span className="block truncate text-sm font-bold text-slate-800">{course.title}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {t('projects.inviteCode', { code: course.invite_code })}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="ds-button border border-line bg-white text-slate-700 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
