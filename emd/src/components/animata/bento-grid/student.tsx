import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Bot, FileText, FolderKanban } from 'lucide-react'
import { useI18n } from '../../../i18n/I18nProvider'

type StudentBentoProps = {
  courses: number
  activeProjects: number
  submittedReady: number
  gradeAverage: number | null
  guardrailReady: number
  stepCounts: {
    setup: number
    build: number
    output: number
  }
  reportBars: number[]
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function BentoCard({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode
  className?: string
  index?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.045, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.005 }}
      className={cn('relative h-full min-h-[132px] w-full overflow-hidden rounded-2xl p-4 shadow-sm', className)}
    >
      {children}
    </motion.div>
  )
}

function Counter({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 780
    const startedAt = performance.now()
    let frame = 0

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(value * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <span className={cn('font-black tabular-nums', className)}>{displayValue}</span>
}

function TypingText({ text, waitTime = 500 }: { text: string; waitTime?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let current = 0
    let direction: 1 | -1 = 1
    let timeout = 0

    function tick() {
      if (direction === 1 && current >= text.length) {
        direction = -1
      } else if (direction === -1 && current <= 0) {
        direction = 1
      } else {
        current += direction
        setCount(current)
      }

      const isAtEnd = current >= text.length
      const isAtStart = current <= 0
      timeout = window.setTimeout(tick, isAtEnd ? 1200 : isAtStart ? waitTime : direction === 1 ? 46 : 24)
    }

    timeout = window.setTimeout(tick, waitTime)
    return () => window.clearTimeout(timeout)
  }, [text, waitTime])

  return <span>{text.slice(0, count)}</span>
}

function ReportPreview({ bars }: { bars: number[] }) {
  const safeBars = bars.length > 0 ? bars : [0, 0, 0, 0]

  return (
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      className="w-32 rounded-xl bg-white p-3 shadow-[0_12px_24px_rgba(17,24,39,0.12)] sm:w-36"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-200">
          <FileText className="h-4 w-4 text-green-800" />
        </span>
        <span className="h-2 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="space-y-2">
        <span className="block h-2 w-full rounded-full bg-slate-200" />
        <span className="block h-2 w-4/5 rounded-full bg-slate-200" />
        <span className="block h-2 w-11/12 rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1">
        {safeBars.slice(0, 4).map((height, index) => (
          <motion.span
            key={index}
            className="mt-auto block rounded-t-md bg-green-400"
            initial={{ height: 12 }}
            animate={{ height }}
            transition={{ duration: 0.65, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default function StudentBento({
  courses,
  activeProjects,
  submittedReady,
  gradeAverage,
  guardrailReady,
  stepCounts,
  reportBars,
}: StudentBentoProps) {
  const { t } = useI18n()

  return (
    <div className="w-full min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-12 sm:auto-rows-[132px] 2xl:auto-rows-[146px]">
        <BentoCard index={0} className="relative flex flex-col bg-orange-500 sm:col-span-3">
          <BookOpen size={36} strokeWidth={2.25} className="shrink-0 text-white" />
          <div className="mt-2 text-sm font-bold leading-tight lowercase text-white">{t('dashboard.bento.course')}</div>
          <div className="absolute bottom-4 right-4 flex justify-end">
            <Counter value={courses} className="text-5xl leading-none text-white/75 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={1} className="relative flex flex-col bg-yellow-300 sm:col-span-3">
          <FolderKanban size={36} strokeWidth={2.25} className="shrink-0 text-yellow-800" />
          <div className="mt-2 text-sm font-bold leading-tight text-yellow-800">{t('dashboard.bento.activeProjects')}</div>
          <div className="absolute bottom-4 right-4 flex justify-end">
            <Counter value={activeProjects} className="text-5xl leading-none text-black/60 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={2} className="relative flex flex-col bg-violet-500 sm:col-span-3">
          <strong className="text-sm font-bold text-white">{t('dashboard.bento.submittedReady')}</strong>
          <div className="mt-2 text-xs font-medium text-white/75">{t('dashboard.bento.submittedHint')}</div>
          <div className="absolute bottom-4 right-4 flex justify-end">
            <Counter value={submittedReady} className="text-5xl leading-none text-white/80 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={3} className="relative flex flex-col bg-blue-500 sm:col-span-3">
          <strong className="text-sm font-bold text-white">{t('dashboard.bento.grade')}</strong>
          <div className="absolute bottom-4 right-4 flex items-end justify-end gap-1">
            {gradeAverage == null ? (
              <span className="text-5xl font-black leading-none text-white/75 sm:text-6xl">-</span>
            ) : (
              <>
                <Counter value={gradeAverage} className="text-5xl leading-none text-white/75 sm:text-6xl" />
                <span className="pb-2 text-sm font-black text-white/60">/100</span>
              </>
            )}
          </div>
        </BentoCard>

        <BentoCard index={4} className="flex flex-col bg-white !p-3 sm:col-span-4">
          <div className="mb-2 text-sm font-black leading-none text-slate-900">Project Progress</div>
          <div className="flex flex-1 flex-col justify-between gap-0.5">
          {[
            { label: t('steps.setup'), count: stepCounts.setup },
            { label: t('steps.build'), count: stepCounts.build },
            { label: t('steps.guardrail'), count: guardrailReady },
            { label: t('steps.output'), count: stepCounts.output },
          ].map((item) => (
            <div
              key={item.label}
              className="grid h-5 w-full grid-cols-[minmax(0,1fr)_auto] items-center rounded border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold leading-none text-slate-700"
            >
              <span className="truncate">{item.label}</span>
              <span className="min-w-6 rounded bg-white px-1.5 py-0.5 text-center text-[11px] font-black tabular-nums text-slate-900 shadow-sm ring-1 ring-slate-200">{item.count}</span>
            </div>
          ))}
          </div>
        </BentoCard>

        <BentoCard index={5} className="flex flex-col bg-orange-300 sm:col-span-4">
          <motion.div
            animate={{ y: [0, -3, 0], rotate: [0, -2, 2, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bot size={36} strokeWidth={2.25} className="shrink-0 text-orange-950" />
          </motion.div>
          <strong className="mt-2 inline-block text-sm font-bold text-orange-950">{t('dashboard.bento.integratedAi')}</strong>
          <div className="mt-auto">
            <div className="text-xs font-medium leading-tight text-orange-950/80">{t('dashboard.bento.aiQuestion')}</div>
            <div className="min-h-[1.25rem] text-sm font-semibold leading-tight text-orange-950">
              <TypingText text={t('dashboard.bento.aiAnswer')} />
            </div>
          </div>
        </BentoCard>

        <BentoCard index={6} className="flex items-center gap-4 bg-green-300 sm:col-span-4 md:flex-row-reverse">
          <div className="text-2xl font-black leading-tight text-green-900">{t('dashboard.bento.generateProgressReport')}</div>
          <div className="relative max-h-28 shrink-0 overflow-hidden">
            <ReportPreview bars={reportBars} />
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
