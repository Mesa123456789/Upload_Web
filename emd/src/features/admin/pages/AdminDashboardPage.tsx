import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { GraduationCap, Presentation, Shield, Users, type LucideIcon } from 'lucide-react'
import { SkeletonStatCard } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import { getUserStats, type UserStats } from '../services/admin.service'

interface CardMeta {
  icon: LucideIcon
  bg: string
  icon_fg: string
  label_fg: string
  value_fg: string
}

// Same bold color-block language as the student/instructor bento dashboard
// (src/components/animata/bento-grid) — solid tinted tiles instead of
// pastel-chip-on-white cards, so the admin dashboard reads as part of the
// same app rather than a separate back-office tool. Cycled by index so any
// number of catalog roles still gets a color.
const palette: CardMeta[] = [
  { icon: Users, bg: 'bg-orange-500', icon_fg: 'text-white', label_fg: 'text-white', value_fg: 'text-white/75' },
  { icon: GraduationCap, bg: 'bg-green-200', icon_fg: 'text-green-800', label_fg: 'text-green-900', value_fg: 'text-green-800' },
  { icon: Presentation, bg: 'bg-blue-500', icon_fg: 'text-white', label_fg: 'text-white', value_fg: 'text-white/75' },
  { icon: Shield, bg: 'bg-violet-500', icon_fg: 'text-white', label_fg: 'text-white', value_fg: 'text-white/80' },
  { icon: Shield, bg: 'bg-yellow-300', icon_fg: 'text-yellow-800', label_fg: 'text-yellow-800', value_fg: 'text-black/60' },
  { icon: Shield, bg: 'bg-lime-300', icon_fg: 'text-lime-900', label_fg: 'text-lime-900', value_fg: 'text-lime-900/70' },
]

// 'student'/'instructor' get a dedicated icon since they're the two fixed
// primary roles. Every other key in byRole is a catalog role name (admin,
// ta, or any custom role an admin created) — those fall back to Shield.
const iconByKey: Record<string, LucideIcon> = {
  total: Users,
  student: GraduationCap,
  instructor: Presentation,
}

function StatTile({ cardKey, index, label, value, formatNumber }: { cardKey: string; index: number; label: string; value: number; formatNumber: (n: number) => string }) {
  const reduceMotion = useReducedMotion()
  const meta = palette[index % palette.length]
  const Icon = iconByKey[cardKey] ?? meta.icon

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.045, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.005 }}
      className={`relative flex h-[132px] flex-col overflow-hidden rounded-2xl p-4 shadow-sm ${meta.bg}`}
    >
      <Icon className={`h-8 w-8 ${meta.icon_fg}`} strokeWidth={2.2} />
      <p className={`ds-stable-label mt-2 text-sm font-bold ${meta.label_fg}`}>{label}</p>
      <div className="mt-auto flex justify-end">
        <span className={`text-4xl font-black tabular-nums ${meta.value_fg}`}>{formatNumber(value)}</span>
      </div>
    </motion.div>
  )
}

export default function AdminDashboardPage() {
  const { t, formatNumber } = useI18n()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getUserStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setError(t('adminDashboard.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const cards = stats
    ? [
        { key: 'total', label: t('adminDashboard.totalUsers'), value: stats.total },
        { key: 'student', label: t('adminDashboard.students'), value: stats.byRole.student ?? 0 },
        { key: 'instructor', label: t('adminDashboard.instructors'), value: stats.byRole.instructor ?? 0 },
        ...Object.entries(stats.byRole)
          .filter(([roleName]) => roleName !== 'student' && roleName !== 'instructor')
          .map(([roleName, value]) => ({ key: roleName, label: roleName, value })),
      ]
    : []

  return (
    <div>
      {error && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => <SkeletonStatCard key={index} />)
          : cards.map((card, index) => (
              <StatTile key={card.key} cardKey={card.key} index={index} label={card.label} value={card.value} formatNumber={formatNumber} />
            ))}
      </div>
    </div>
  )
}
