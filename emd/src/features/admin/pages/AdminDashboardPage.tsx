import { useEffect, useState } from 'react'
import { GraduationCap, Presentation, Shield, Users, type LucideIcon } from 'lucide-react'
import Card from '../../../shared/components/Card'
import FadeInCard from '../../../shared/components/FadeInCard'
import { SkeletonStatCard } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import { getUserStats, type UserStats } from '../services/admin.service'

interface CardMeta {
  icon: LucideIcon
  accent: string
}

// 'student'/'instructor' get translated labels since they're the two fixed
// primary roles, and get a dedicated icon/accent. Every other key in byRole
// is a catalog role name (admin, ta, or any custom role an admin created) —
// those fall back to the generic Shield/violet treatment below.
const cardMeta: Record<string, CardMeta> = {
  total: { icon: Users, accent: 'bg-blue-50 text-blue-600' },
  student: { icon: GraduationCap, accent: 'bg-emerald-50 text-emerald-600' },
  instructor: { icon: Presentation, accent: 'bg-orange-50 text-orange-600' },
}
const defaultCardMeta: CardMeta = { icon: Shield, accent: 'bg-violet-50 text-violet-600' }

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
          : cards.map((card, index) => {
              const meta = cardMeta[card.key] ?? defaultCardMeta
              const Icon = meta.icon
              return (
                <FadeInCard key={card.key} index={index}>
                  <Card>
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${meta.accent}`}>
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <p className="ds-stable-label mt-4 text-sm font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-1 text-3xl font-black text-[var(--ds-ink)]">{formatNumber(card.value)}</p>
                  </Card>
                </FadeInCard>
              )
            })}
      </div>
    </div>
  )
}
