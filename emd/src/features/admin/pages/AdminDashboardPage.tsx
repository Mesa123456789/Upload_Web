import { useEffect, useState } from 'react'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import { getUserStats, type UserStats } from '../services/admin.service'

const cardStyle = 'rounded-[28px] bg-white p-6 shadow-[0_14px_28px_rgba(48,34,38,0.09)]'

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-[110px] rounded-[28px]" />
      ))}
    </div>
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
        { label: t('adminDashboard.totalUsers'), value: stats.total },
        { label: t('adminDashboard.students'), value: stats.byRole.student },
        { label: t('adminDashboard.instructors'), value: stats.byRole.instructor },
        { label: t('adminDashboard.admins'), value: stats.byRole.admin },
        { label: t('adminDashboard.tas'), value: stats.byRole.ta },
      ]
    : []

  return (
    <div>
      <h1 className="text-[26px] font-black tracking-tight text-[var(--ds-ink)]">{t('adminDashboard.title')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('adminDashboard.subtitle')}</p>

      {error && (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <div className="mt-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => (
              <div key={card.label} className={cardStyle}>
                <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-[var(--ds-ink)]">{formatNumber(card.value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
