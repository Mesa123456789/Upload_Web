import { useEffect, useState } from 'react'
import PageContainer from '../../../app/layout/PageContainer'
import { Skeleton } from '../../../shared/components/Skeleton'
import Badge from '../../../shared/components/Badge'
import { useI18n } from '../../../i18n/I18nProvider'
import { useAuth } from '../../auth/context/useAuth'
import { listUsers, grantRole, revokeRole, type UserWithRoles } from '../services/admin.service'
import type { AppRole } from '../../../lib/database.types'

function UsersSkeleton() {
  return (
    <PageContainer>
      <div className="rounded-[28px] bg-white px-8 py-6 shadow-[0_18px_35px_rgba(17,24,39,0.08)]">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="grid grid-cols-4 gap-5 border-b border-[#e5e7eb] py-4 last:border-0">
            {Array.from({ length: 4 }).map((__, cell) => (
              <Skeleton key={cell} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}

export default function AdminUsersPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  function load() {
    setError(null)
    setLoading(true)
    listUsers()
      .then(setUsers)
      .catch(() => setError(t('adminUsers.loadFailed')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [t])

  async function toggleRole(target: UserWithRoles, role: AppRole) {
    if (!user) return
    if (target.id === user.id) return
    const hasRole = target.extraRoles.includes(role)
    const confirmMessage = hasRole ? t('adminUsers.confirmRevoke') : t('adminUsers.confirmGrant')
    if (!window.confirm(confirmMessage)) return

    setPendingUserId(target.id)
    setError(null)
    try {
      if (hasRole) {
        await revokeRole(target.id, role)
      } else {
        await grantRole(target.id, role, user.id)
      }
      load()
    } catch {
      setError(t('adminUsers.actionFailed'))
    } finally {
      setPendingUserId(null)
    }
  }

  if (loading) return <UsersSkeleton />

  return (
    <PageContainer>
      {error && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}
      <div className="overflow-x-auto rounded-[28px] bg-white shadow-[0_18px_35px_rgba(17,24,39,0.08)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-xs font-bold uppercase tracking-wide text-slate-400">
              <th className="px-6 py-4">{t('adminUsers.name')}</th>
              <th className="px-6 py-4">{t('adminUsers.email')}</th>
              <th className="px-6 py-4">{t('adminUsers.primaryRole')}</th>
              <th className="px-6 py-4">{t('adminUsers.extraRoles')}</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  {t('adminUsers.empty')}
                </td>
              </tr>
            )}
            {users.map((row) => {
              const isPending = pendingUserId === row.id
              const isAdmin = row.extraRoles.includes('admin')
              const isSelf = row.id === user?.id
              return (
                <tr key={row.id} className="border-b border-[#e5e7eb] last:border-0">
                  <td className="px-6 py-4 font-semibold text-slate-800">{row.display_name ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{row.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={row.role === 'instructor' ? 'blue' : 'default'}>{row.role}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {row.extraRoles.length === 0 ? (
                      <span className="text-slate-400">{t('adminUsers.none')}</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {row.extraRoles.map((role) => (
                          <Badge key={role} variant="purple">{role}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      disabled={isPending || isSelf}
                      onClick={() => toggleRole(row, 'admin')}
                      className="rounded-full border border-[#F48E2E]/45 px-3 py-1.5 text-xs font-bold text-[#7a3414] transition hover:bg-[#F48E2E]/10 disabled:opacity-40"
                    >
                      {isAdmin ? t('adminUsers.revokeAdmin') : t('adminUsers.grantAdmin')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
