import { useEffect, useMemo, useState } from 'react'
import { Skeleton } from '../../../shared/components/Skeleton'
import Badge from '../../../shared/components/Badge'
import FadeInCard from '../../../shared/components/FadeInCard'
import { useI18n } from '../../../i18n/I18nProvider'
import { useAuth } from '../../auth/context/useAuth'
import {
  listUsers,
  grantRole,
  revokeRole,
  updateUserProfile,
  setUserActive,
  listAllCourses,
  listAllEnrollments,
  listRoles,
  type UserWithRoles,
} from '../services/admin.service'
import type { AppRole, AppRoleCatalogEntry, Course } from '../../../lib/database.types'

interface EditForm {
  display_name: string
  major: string
  year: string
  student_code: string
  contact_info: string
}

function UsersSkeleton() {
  return (
    <div className="ds-card px-8 py-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-5 gap-5 border-b border-line py-4 last:border-0">
          {Array.from({ length: 5 }).map((__, cell) => (
            <Skeleton key={cell} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

function toEditForm(user: UserWithRoles): EditForm {
  return {
    display_name: user.display_name ?? '',
    major: user.major ?? '',
    year: user.year != null ? String(user.year) : '',
    student_code: user.student_code ?? '',
    contact_info: user.contact_info ?? '',
  }
}

const selectClass =
  'h-10 rounded-full border border-line bg-white px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30'
const inputClass = 'ds-input h-10'
const smallButtonClass = 'ds-button min-h-0 px-3 py-1.5 text-xs'

export default function AdminUsersPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Map<string, string[]>>(new Map())
  const [roleCatalog, setRoleCatalog] = useState<AppRoleCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ display_name: '', major: '', year: '', student_code: '', contact_info: '' })

  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [majorFilter, setMajorFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')

  function load() {
    setError(null)
    setLoading(true)
    // listRoles() degrades to [] instead of rejecting the whole Promise.all —
    // if app_roles isn't there yet, this page should keep working for
    // everything unrelated to the role catalog (list, edit, deactivate).
    Promise.all([listUsers(), listAllCourses(), listAllEnrollments(), listRoles().catch(() => [])])
      .then(([u, c, e, r]) => {
        setUsers(u)
        setCourses(c)
        setEnrollments(e)
        setRoleCatalog(r)
      })
      .catch(() => setError(t('adminUsers.loadFailed')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [t])

  const majors = useMemo(
    () => Array.from(new Set(users.map((u) => u.major).filter((m): m is string => !!m))).sort(),
    [users],
  )
  const years = useMemo(
    () => Array.from(new Set(users.map((u) => u.year).filter((y): y is number => y != null))).sort((a, b) => a - b),
    [users],
  )

  const filteredUsers = useMemo(() => {
    return users.filter((row) => {
      if (roleFilter !== 'all') {
        const matchesPrimary = row.role === roleFilter
        const matchesExtra = row.extraRoles.includes(roleFilter)
        if (!matchesPrimary && !matchesExtra) return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const haystack = `${row.display_name ?? ''} ${row.email}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (courseFilter !== 'all') {
        const studentIds = enrollments.get(courseFilter) ?? []
        if (!studentIds.includes(row.id)) return false
      }
      if (majorFilter !== 'all' && row.major !== majorFilter) return false
      if (yearFilter !== 'all' && String(row.year ?? '') !== yearFilter) return false
      return true
    })
  }, [users, roleFilter, search, courseFilter, majorFilter, yearFilter, enrollments])

  async function toggleRole(target: UserWithRoles, role: AppRole) {
    if (!user) return
    const hasRole = target.extraRoles.includes(role)
    // Only revoking 'admin' from your own row is a lockout risk — revoking
    // any other extra role from yourself is fine, that's why this guard
    // checks the specific role rather than blanket-blocking all self-toggles.
    if (target.id === user.id && role === 'admin' && hasRole) return

    const confirmMessage = hasRole ? t('adminUsers.confirmRevokeRole') : t('adminUsers.confirmGrant')
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

  async function toggleActive(target: UserWithRoles) {
    if (!user) return
    if (target.id === user.id) return
    const confirmMessage = target.is_active ? t('adminUsers.confirmDeactivate') : t('adminUsers.confirmActivate')
    if (!window.confirm(confirmMessage)) return

    setPendingUserId(target.id)
    setError(null)
    try {
      await setUserActive(target.id, !target.is_active)
      load()
    } catch {
      setError(t('adminUsers.actionFailed'))
    } finally {
      setPendingUserId(null)
    }
  }

  function startEdit(target: UserWithRoles) {
    setEditingUserId(target.id)
    setEditForm(toEditForm(target))
  }

  function cancelEdit() {
    setEditingUserId(null)
  }

  async function saveEdit(targetId: string) {
    setPendingUserId(targetId)
    setError(null)
    try {
      await updateUserProfile(targetId, {
        display_name: editForm.display_name.trim() || null,
        major: editForm.major.trim() || null,
        year: editForm.year.trim() ? Number(editForm.year) : null,
        student_code: editForm.student_code.trim() || null,
        contact_info: editForm.contact_info.trim() || null,
      })
      setEditingUserId(null)
      load()
    } catch {
      setError(t('adminUsers.editFailed'))
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <FadeInCard index={0}>
        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('adminUsers.searchPlaceholder')}
              className={inputClass}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('adminUsers.filterAll')} ({t('adminUsers.filterRole')})</option>
            <option value="student">student</option>
            <option value="instructor">instructor</option>
            {roleCatalog.map((role) => (
              <option key={role.name} value={role.name}>{role.name}</option>
            ))}
          </select>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('adminUsers.filterAll')} ({t('adminUsers.filterCourse')})</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
          <select value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('adminUsers.filterAll')} ({t('adminUsers.filterMajor')})</option>
            {majors.map((major) => (
              <option key={major} value={major}>{major}</option>
            ))}
          </select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={selectClass}>
            <option value="all">{t('adminUsers.filterAll')} ({t('adminUsers.filterYear')})</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>
        </div>
      </FadeInCard>

      <FadeInCard index={1}>
        <div className="mt-6 overflow-x-auto ds-card">
          {loading ? (
            <UsersSkeleton />
          ) : (
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="px-6 py-4">{t('adminUsers.name')}</th>
                  <th className="px-6 py-4">{t('adminUsers.email')}</th>
                  <th className="px-6 py-4">{t('adminUsers.primaryRole')}</th>
                  <th className="px-6 py-4">{t('adminUsers.extraRoles')}</th>
                  <th className="px-6 py-4">{t('adminUsers.status')}</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      {t('adminUsers.empty')}
                    </td>
                  </tr>
                )}
                {filteredUsers.map((row) => {
                  const isPending = pendingUserId === row.id
                  const isSelf = row.id === user?.id
                  const isEditing = editingUserId === row.id
                  const availableRoles = roleCatalog.filter((role) => !row.extraRoles.includes(role.name))

                  if (isEditing) {
                    return (
                      <tr key={row.id} className="border-b border-line bg-primary/5 last:border-0">
                        <td className="px-6 py-4" colSpan={6}>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <input className="ds-input" placeholder={t('adminUsers.name')} value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
                            <input className="ds-input" placeholder="Major" value={editForm.major} onChange={(e) => setEditForm({ ...editForm, major: e.target.value })} />
                            <input className="ds-input" placeholder="Year" inputMode="numeric" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} />
                            <input className="ds-input" placeholder="Student code" value={editForm.student_code} onChange={(e) => setEditForm({ ...editForm, student_code: e.target.value })} />
                            <input className="ds-input" placeholder="Contact" value={editForm.contact_info} onChange={(e) => setEditForm({ ...editForm, contact_info: e.target.value })} />
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" disabled={isPending} onClick={() => saveEdit(row.id)} className={`${smallButtonClass} ds-button-primary`}>
                              {t('adminUsers.save')}
                            </button>
                            <button type="button" disabled={isPending} onClick={cancelEdit} className={`${smallButtonClass} ds-button-secondary`}>
                              {t('adminUsers.cancel')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="px-6 py-4 font-semibold text-slate-800">{row.display_name ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-500">{row.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={row.role === 'instructor' ? 'blue' : 'default'}>{row.role}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {row.extraRoles.length === 0 && (
                            <span className="text-slate-400">{t('adminUsers.none')}</span>
                          )}
                          {row.extraRoles.map((role) => {
                            const isAdminChip = role === 'admin'
                            const chipDisabled = isPending || (isSelf && isAdminChip)
                            return (
                              <button
                                key={role}
                                type="button"
                                disabled={chipDisabled}
                                onClick={() => toggleRole(row, role)}
                                title={t('adminUsers.confirmRevokeRole')}
                                className="disabled:opacity-40"
                              >
                                <Badge variant="purple">{role} ×</Badge>
                              </button>
                            )
                          })}
                          {availableRoles.length > 0 && (
                            <select
                              value=""
                              disabled={isPending}
                              onChange={(e) => {
                                if (e.target.value) toggleRole(row, e.target.value)
                              }}
                              className="h-7 rounded-full border border-line bg-white px-2 text-xs font-semibold text-slate-500 disabled:opacity-40"
                            >
                              <option value="">{t('adminUsers.addRole')}</option>
                              {availableRoles.map((role) => (
                                <option key={role.name} value={role.name}>{role.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={row.is_active ? 'green' : 'red'}>
                          {row.is_active ? t('adminUsers.statusActive') : t('adminUsers.statusInactive')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => startEdit(row)}
                            className={`${smallButtonClass} ds-button-secondary`}
                          >
                            {t('adminUsers.edit')}
                          </button>
                          <button
                            type="button"
                            disabled={isPending || isSelf}
                            onClick={() => toggleActive(row)}
                            className={`${smallButtonClass} ds-button-secondary`}
                          >
                            {row.is_active ? t('adminUsers.deactivate') : t('adminUsers.activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </FadeInCard>
    </div>
  )
}
