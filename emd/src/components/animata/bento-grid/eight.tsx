import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, CheckCircle2, FolderKanban, Users } from 'lucide-react'
import { useI18n } from '../../../i18n/I18nProvider'

type StudentPreview = {
  id: string
  name: string
  detail: string
}

type BentoEightProps = {
  courses: number
  activeProjects: number
  submittedReady: number
  students: number
  studentPreviews: StudentPreview[]
  reviewBars: number[]
  popularTopics: Array<{
    label: string
    count: number
  }>
  onStudentClick?: (studentId: string) => void
  onStudentsViewAll?: () => void
  reviewQueue?: number
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
      className={cn('relative h-full min-h-[148px] w-full overflow-hidden rounded-2xl p-4 shadow-sm sm:min-h-0', className)}
    >
      {children}
    </motion.div>
  )
}

function Counter({
  value,
  suffix = '',
  className,
}: {
  value: number
  suffix?: string
  className?: string
}) {
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

  return (
    <span className={cn('font-black tabular-nums', className)}>
      {displayValue}
      {suffix}
    </span>
  )
}

function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'ST'
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('')
}

function StudentPreviewList({
  students,
  onStudentClick,
  onStudentsViewAll,
}: {
  students: StudentPreview[]
  onStudentClick?: (studentId: string) => void
  onStudentsViewAll?: () => void
}) {
  const { t } = useI18n()
  const avatarColors = ['bg-emerald-500 text-white', 'bg-amber-500 text-white', 'bg-violet-500 text-white']
  const visibleStudents = students.slice(0, 3)
  const remaining = Math.max(0, students.length - visibleStudents.length)

  if (students.length === 0) {
    return <span className="text-xs font-semibold text-green-900/60">{t('dashboard.bento.noStudents')}</span>
  }

  return (
    <div className="flex -space-x-3">
      {visibleStudents.map((student, index) => (
        <motion.button
          key={student.id}
          type="button"
          onClick={() => onStudentClick?.(student.id)}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, delay: index * 0.08 }}
          className={cn('group/student relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-[11px] font-black shadow-sm outline-none transition hover:z-10 hover:-translate-y-1 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-green-800', avatarColors[index] ?? 'bg-white text-green-800')}
          title={student.name}
        >
          {initialsFromName(student.name)}
          <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden w-44 -translate-x-1/2 rounded-xl bg-white p-3 text-left text-green-950 shadow-[0_14px_28px_rgba(17,24,39,0.16)] ring-1 ring-black/5 group-hover/student:block group-focus-visible/student:block">
            <span className="block truncate text-xs font-black">{student.name}</span>
            <span className="mt-1 block truncate text-[10px] font-medium text-green-950/60">{student.detail}</span>
            <span className="mt-2 inline-flex rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-800">{t('dashboard.bento.viewProfile')}</span>
          </span>
        </motion.button>
      ))}
      {remaining > 0 && (
        <motion.button
          type="button"
          onClick={onStudentsViewAll}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, delay: visibleStudents.length * 0.08 }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white text-xs font-black text-slate-500 shadow-sm outline-none transition hover:z-10 hover:-translate-y-1 hover:text-primary focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-green-800"
          title={t('dashboard.bento.viewAllStudents')}
        >
          +{remaining}
        </motion.button>
      )}
    </div>
  )
}

function MiniBars({ values, className }: { values: number[]; className?: string }) {
  const safeValues = values.length > 0 ? values : [0, 0, 0, 0, 0, 0]

  return (
    <div className="flex h-24 items-end gap-1.5">
      {safeValues.map((value, index) => (
        <motion.span
          key={`${value}-${index}`}
          className={cn('w-full rounded-t-xl', className)}
          animate={{ height: [`${Math.max(16, value - 18)}%`, `${value}%`, `${Math.min(100, value + 10)}%`, `${value}%`] }}
          transition={{ duration: 2.6, delay: index * 0.12, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function TopicBars({ topics }: { topics: BentoEightProps['popularTopics'] }) {
  const { t } = useI18n()
  const visibleTopics = topics.slice(0, 5)
  const max = Math.max(...visibleTopics.map((topic) => topic.count), 1)

  if (visibleTopics.length === 0) {
    return <div className="mt-auto text-sm font-semibold text-blue-950/60">{t('dashboard.bento.noTopicData')}</div>
  }

  return (
    <div className="mt-auto min-h-0">
      <div className="min-w-0">
        <div className="flex h-24 items-end gap-2">
          {visibleTopics.map((topic, index) => {
            const height = Math.max(18, Math.round((topic.count / max) * 100))
            return (
              <div key={topic.label} className="h-full min-w-0 flex-1">
                <div className="relative flex h-full items-end">
                  <motion.span
                    className="block w-full rounded-t-xl bg-blue-400"
                    animate={{ height: [`${Math.max(12, height - 14)}%`, `${height}%`, `${Math.min(100, height + 8)}%`, `${height}%`] }}
                    transition={{ duration: 2.6, delay: index * 0.12, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="absolute bottom-1 left-1 right-1 truncate rounded-md bg-blue-900/15 px-1 py-0.5 text-center text-[10px] font-black text-blue-950">
                    {topic.label} {topic.count}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Eight({
  courses,
  activeProjects,
  submittedReady,
  students,
  studentPreviews,
  reviewBars,
  popularTopics,
  onStudentClick,
  onStudentsViewAll,
  reviewQueue = 0,
}: BentoEightProps) {
  const { t } = useI18n()

  return (
    <div className="w-full min-w-0">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-12 sm:auto-rows-[156px] 2xl:auto-rows-[168px]">
        <BentoCard index={0} className="flex flex-col bg-orange-500 sm:col-span-3">
          <BookOpen className="h-9 w-9 text-white" />
          <div className="mt-2 text-sm font-bold lowercase text-white">{t('dashboard.bento.course')}</div>
          <div className="mt-auto flex justify-end">
            <Counter value={courses} className="text-5xl text-white/75 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={1} className="flex flex-col bg-yellow-300 sm:col-span-3">
          <FolderKanban className="h-9 w-9 text-yellow-800" />
          <div className="mt-2 text-sm font-bold text-yellow-800">{t('dashboard.bento.activeProjects')}</div>
          <div className="mt-auto flex justify-end">
            <Counter value={activeProjects} className="text-5xl text-black/60 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={2} className="flex flex-col overflow-visible bg-green-200 sm:col-span-3">
          <Users className="h-9 w-9 text-green-800" />
          <strong className="mt-2 text-sm text-green-900">{t('dashboard.bento.students')}</strong>
          <div className="mt-auto flex items-end justify-between gap-4">
            <StudentPreviewList students={studentPreviews} onStudentClick={onStudentClick} onStudentsViewAll={onStudentsViewAll} />
            <Counter value={students} className="text-5xl text-green-800 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={3} className="relative flex flex-col bg-violet-500 sm:col-span-3">
          <strong className="text-sm font-bold text-white">{t('dashboard.bento.submittedReady')}</strong>
          <div className="mt-2 text-xs font-medium text-white/75">{t('dashboard.bento.submittedHint')}</div>
          <div className="mt-auto flex justify-end">
            <Counter value={submittedReady} className="text-5xl text-white/80 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={4} className="flex flex-col bg-blue-500 sm:col-span-3">
          <div className="grid grid-cols-[1fr_auto] items-start gap-4">
            <div>
              <div className="text-sm font-bold text-white">{t('dashboard.bento.reviewQueue')}</div>
              <p className="text-xs font-medium text-white/75">{t('dashboard.bento.reviewHint')}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-auto flex items-end justify-between gap-4 pb-1">
            <MiniBars values={reviewBars} className="bg-white/45" />
            <Counter value={reviewQueue} className="text-5xl text-white/75 sm:text-6xl" />
          </div>
        </BentoCard>

        <BentoCard index={5} className="relative flex flex-col bg-blue-200 sm:col-span-9">
          <div>
            <div>
              <div className="text-sm font-bold text-blue-900">{t('dashboard.bento.popularTopic')}</div>
              <p className="text-sm text-blue-950/70">{t('dashboard.bento.popularHint')}</p>
            </div>
          </div>
          <TopicBars topics={popularTopics} />
        </BentoCard>
      </div>
    </div>
  )
}
