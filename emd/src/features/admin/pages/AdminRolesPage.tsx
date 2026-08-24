import { useEffect, useState } from 'react'
import { Skeleton } from '../../../shared/components/Skeleton'
import Badge from '../../../shared/components/Badge'
import { useI18n } from '../../../i18n/I18nProvider'
import { useAuth } from '../../auth/context/useAuth'
import { listRoles, createRole, deleteRole } from '../services/admin.service'
import type { AppRoleCatalogEntry } from '../../../lib/database.types'

const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{1,31}$/

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F48E2E]/40'

function RolesSkeleton() {
  return (
    <div className="rounded-[28px] bg-white px-8 py-6 shadow-[0_18px_35px_rgba(17,24,39,0.08)]">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="grid grid-cols-4 gap-5 border-b border-[#e5e7eb] py-4 last:border-0">
          {Array.from({ length: 4 }).map((__, cell) => (
            <Skeleton key={cell} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function AdminRolesPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  const [roles, setRoles] = useState<AppRoleCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingName, setPendingName] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  function load() {
    setError(null)
    setLoading(true)
    listRoles()
      .then(setRoles)
      .catch(() => setError(t('adminRoles.loadFailed')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [t])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)

    const trimmedName = name.trim().toLowerCase()
    if (!ROLE_NAME_PATTERN.test(trimmedName)) {
      setError(t('adminRoles.invalidName'))
      return
    }
    if (roles.some((r) => r.name === trimmedName)) {
      setError(t('adminRoles.nameTaken'))
      return
    }

    setCreating(true)
    try {
      await createRole(trimmedName, label.trim() || trimmedName, description.trim() || null, user.id)
      setName('')
      setLabel('')
      setDescription('')
      load()
    } catch {
      setError(t('adminRoles.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(role: AppRoleCatalogEntry) {
    if (role.is_builtin) return
    if (!window.confirm(t('adminRoles.confirmDelete'))) return

    setPendingName(role.name)
    setError(null)
    try {
      await deleteRole(role.name)
      load()
    } catch (err) {
      const inUse = err instanceof Error && err.message === 'ROLE_IN_USE'
      setError(inUse ? t('adminRoles.deleteInUse') : t('adminRoles.deleteFailed'))
    } finally {
      setPendingName(null)
    }
  }

  return (
    <div>
      <h1 className="text-[26px] font-black tracking-tight text-[var(--ds-ink)]">{t('adminRoles.title')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('adminRoles.subtitle')}</p>

      {error && (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <form onSubmit={handleCreate} className="mt-6 grid gap-3 rounded-[28px] bg-white p-6 shadow-[0_18px_35px_rgba(17,24,39,0.08)] sm:grid-cols-3">
        <input className={inputClass} placeholder={t('adminRoles.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputClass} placeholder={t('adminRoles.labelPlaceholder')} value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className={inputClass} placeholder={t('adminRoles.descriptionPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="sm:col-span-3 h-10 w-fit rounded-full bg-[#F48E2E] px-5 text-sm font-bold text-white disabled:opacity-40"
        >
          {t('adminRoles.create')}
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-[28px] bg-white shadow-[0_18px_35px_rgba(17,24,39,0.08)]">
        {loading ? (
          <RolesSkeleton />
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs font-bold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-4">{t('adminRoles.name')}</th>
                <th className="px-6 py-4">{t('adminRoles.label')}</th>
                <th className="px-6 py-4">{t('adminRoles.description')}</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    {t('adminRoles.empty')}
                  </td>
                </tr>
              )}
              {roles.map((role) => (
                <tr key={role.name} className="border-b border-[#e5e7eb] last:border-0">
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {role.name}
                    {role.is_builtin && <Badge variant="yellow" className="ml-2">{t('adminRoles.builtin')}</Badge>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{role.label}</td>
                  <td className="px-6 py-4 text-slate-500">{role.description ?? '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      disabled={role.is_builtin || pendingName === role.name}
                      onClick={() => handleDelete(role)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      {t('adminRoles.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
