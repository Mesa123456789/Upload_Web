import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../../../i18n/I18nProvider'
import { transitions } from '../../../../shared/motion'

interface StepIndicatorProps {
  current: number
}

const STEPS = ['steps.setup', 'steps.build', 'steps.guardrail', 'steps.output']

export default function StepIndicator({ current }: StepIndicatorProps) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const transition = reduceMotion ? { duration: 0 } : transitions.spring

  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LayoutGroup id="project-steps">
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto app-scrollbar">
            {STEPS.map((labelKey, index) => {
              const step = index + 1
              const isDone = step < current
              const isActive = step === current

              return (
                <div key={labelKey} className="flex shrink-0 items-center">
                  <motion.div
                    layout
                    transition={transition}
                    className={`relative flex items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'text-white shadow-sm'
                        : isDone
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-500'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="project-step-active"
                        transition={transition}
                        className="absolute inset-0 rounded-md bg-primary"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isDone ? '✓' : step}
                    </span>
                    <span className="relative z-10">{t(labelKey)}</span>
                  </motion.div>
                  {index < STEPS.length - 1 && (
                    <motion.div
                      layout
                      transition={reduceMotion ? { duration: 0 } : transitions.base}
                      className={`mx-2 h-px w-8 ${step < current ? 'bg-emerald-300' : 'bg-line'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </LayoutGroup>
        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
          {t('steps.progress', { current })}
        </span>
      </div>
    </div>
  )
}
