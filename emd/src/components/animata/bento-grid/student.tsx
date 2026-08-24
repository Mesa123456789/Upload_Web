import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, FolderKanban } from 'lucide-react'
import { useI18n } from '../../../i18n/I18nProvider'

type StudentBentoProps = {
  courses: number
  activeProjects: number
  submittedReady: number
  gradeAverage: number | null
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

export default function StudentBento({
  courses,
  activeProjects,
  submittedReady,
  gradeAverage,
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
      </div>
    </div>
  )
}
