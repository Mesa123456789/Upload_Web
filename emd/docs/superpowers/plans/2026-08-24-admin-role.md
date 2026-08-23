# Admin Role & Multi-Role Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `admin` role that can view a user-stats dashboard, list all users, and grant/revoke extra roles (`admin`, and a future `ta`) — with multi-role access working as a union (e.g. instructor+admin sees both instructor pages and the admin panel).

**Architecture:** New `user_roles` many-to-many table holds "extra" roles (`admin`, `ta`) separate from the existing single `profiles.role` ("primary" role — `student`/`instructor`, unchanged). `AuthContext` fetches both and exposes `roles`/`isAdmin`. A new `AdminRoute` guard (parallel to the existing `RoleRoute`, not replacing it) protects `/admin/*`. Because the two guards check independent things, a user with both `instructor` and `admin` passes both.

**Tech Stack:** React + TypeScript + Vite + Tailwind, Supabase (Postgres + RLS), react-router-dom v6, framer-motion, lucide-react icons, `useI18n` for th/en text.

**Spec:** `docs/superpowers/specs/2026-08-24-admin-role-design.md`

## Global Constraints

- **No automated test runner exists in this project** (no vitest/jest, verified — `package.json` has no test script). Follow the project's own verification method instead: run `npx tsc --noEmit` after every code task and confirm zero new errors. UI tasks additionally get a manual verification checklist to run against `vercel dev` (per `CLAUDE.md` — `vercel dev`, not bare `npm run dev`, because it serves `/api/*`).
- `profiles.role` (`'student' | 'instructor'`) must **not** be touched — all new code is additive.
- Every new Supabase table needs an RLS policy (`CLAUDE.md` rule) — covered in Task 1.
- Admin must **never** see GDD/project content — no task in this plan touches `projects`, `analyses`, or any project-content table/route.
- Read each file fully before editing it (`CLAUDE.md` rule) — every Modify step below names the exact lines seen during planning, but re-read the live file first since other work may have touched it since.
- Thai UI copy stays casual/short per the app's existing tone in `src/locales/th/common.json`.

---

### Task 1: SQL migration for `user_roles` + RLS

**Files:**
- Create: `docs/superpowers/sql/2026-08-24-admin-roles.sql`

**Interfaces:**
- Produces: table `public.user_roles(id, user_id, role, granted_by, granted_at)` with `role in ('admin','ta')`, unique on `(user_id, role)`. Every later task that queries `user_roles` assumes this exact shape.

- [x] **Step 1: SQL file already written**

Content lives at `docs/superpowers/sql/2026-08-24-admin-roles.sql` — a
standalone `.sql` file (not embedded in this plan) so it can be opened
and copy-pasted directly into the Supabase SQL Editor without pulling
markdown fences along with it. Open that file to see the exact script;
nothing further to write here.

- [ ] **Step 2: Hand off to Yuuko to run in Supabase**

This step is not run by the implementer — tell Yuuko the file is ready at
`docs/superpowers/sql/2026-08-24-admin-roles.sql` and she needs to:
1. Open Supabase Dashboard → SQL Editor
2. Paste and run everything **above** the bootstrap comment block
3. Verify: `select * from public.user_roles;` returns an empty result with no error
4. Get her own uuid (Authentication → Users), uncomment the bootstrap insert, fill in the uuid, run just that statement
5. Verify: `select * from public.user_roles;` now shows one row with her uuid and `role = 'admin'`

Do not proceed to Task 3 (AuthContext) or later manual-verification steps until this is confirmed done — those need a real admin row to test against. Tasks 2, 4, and 5 (types/service/route files) don't need the table to exist yet and can be done in parallel.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/sql/2026-08-24-admin-roles.sql
git commit -m "docs: add user_roles SQL migration for admin role"
```

---

### Task 2: Add `user_roles` types to `database.types.ts`

**Files:**
- Modify: `src/lib/database.types.ts` (Tables block starts line 16; convenience exports at end of file, currently lines 407-415)

**Interfaces:**
- Consumes: nothing
- Produces: `Database['public']['Tables']['user_roles']`, and convenience exports `export type UserRole = Database['public']['Tables']['user_roles']['Row']` and `export type AppRole = 'admin' | 'ta'`. Tasks 3 and 4 import `AppRole` and `UserRole`.

- [ ] **Step 1: Add the `user_roles` table to the `Tables` block**

Open the file, find the closing of the `analyses` table (the last table, right before the final `}` that closes `Tables`). Insert a new `user_roles` entry there:

```typescript
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'ta'
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'ta'
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'ta'
          granted_by?: string | null
          granted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
```

- [ ] **Step 2: Add convenience exports**

At the bottom of the file, next to the existing `export type Profile = ...` line, add:

```typescript
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type AppRole = 'admin' | 'ta'
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (there will likely be pre-existing unrelated ones if any — compare against a run on `main` before this task if unsure).

- [ ] **Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): add user_roles table types"
```

---

### Task 3: Extend `AuthContext` with `roles` / `isAdmin`

**Files:**
- Modify: `src/features/auth/context/AuthContext.tsx` (full file, 202 lines — read fully before editing)

**Interfaces:**
- Consumes: `AppRole` from `../../../lib/database.types` (Task 2)
- Produces: `useAuth()` now also returns `roles: AppRole[]` and `isAdmin: boolean`. Task 5 (`AdminRoute`) and Task 8/9 (Sidebar, pages) consume these two fields.

- [ ] **Step 1: Import `AppRole`**

Change line 4:
```typescript
import type { Profile } from '../../../lib/database.types'
```
to:
```typescript
import type { Profile, AppRole } from '../../../lib/database.types'
```

- [ ] **Step 2: Add `roles`/`isAdmin` to `AuthContextValue` and `PreviewAuthProvider`**

Change the interface (currently lines 36-42):
```typescript
interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  roles: AppRole[]
  isAdmin: boolean
  loading: boolean
  setProfile: (profile: Profile | null) => void
}
```

In `PreviewAuthProvider` (currently lines 46-62), preview mode has no real roles table row —
add a hardcoded empty array so the preview instructor account is never treated as admin:
```typescript
function PreviewAuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(previewProfile)
  const roles: AppRole[] = []

  return (
    <AuthContext.Provider
      value={{
        user: previewSession.user,
        session: previewSession,
        profile,
        roles,
        isAdmin: false,
        loading: false,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 3: Add a `fetchRoles` function next to `fetchProfile`**

Right after the existing `fetchProfile` function (currently ends line 99), add:
```typescript
  async function fetchRoles(userId: string): Promise<AppRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      if (error) {
        console.error('[Auth] Fetch roles error:', error.message)
        return []
      }
      return data.map((row) => row.role)
    } catch (err) {
      console.error('[Auth] Fetch roles exception:', err)
      return []
    }
  }
```

- [ ] **Step 4: Add `roles` state**

Next to the existing `const [profile, setProfile] = useState<Profile | null>(null)` (currently line 75), add:
```typescript
  const [roles, setRoles] = useState<AppRole[]>([])
```

- [ ] **Step 5: Fetch roles alongside profile in Effect 2, and clear roles on logout**

In the `onAuthStateChange` callback (currently lines 149-152), where `profile` is cleared on logout, also clear roles:
```typescript
        if (!newSession?.user) {
          lastFetchedUserIdRef.current = null
          setProfile(null)
          setRoles([])
        }
```

In Effect 2 (currently lines 167-194), change the `fetchProfile` call to fetch both in parallel:
```typescript
    fetchProfile(user.id).then((p) => {
      if (cancelled) return
      lastFetchedUserIdRef.current = user.id
      setProfile(p)
      setLoading(false)
    })
```
becomes:
```typescript
    Promise.all([fetchProfile(user.id), fetchRoles(user.id)]).then(([p, r]) => {
      if (cancelled) return
      lastFetchedUserIdRef.current = user.id
      setProfile(p)
      setRoles(r)
      setLoading(false)
    })
```

- [ ] **Step 6: Expose `roles`/`isAdmin` from the provider value**

Change the final return (currently line 197):
```typescript
    <AuthContext.Provider value={{ user, session, profile, loading, setProfile }}>
```
to:
```typescript
    <AuthContext.Provider value={{ user, session, profile, roles, isAdmin: roles.includes('admin'), loading, setProfile }}>
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Manual verification**

Requires Task 1 done (bootstrap admin row exists) and `vercel dev` running.
1. Log in as the account you bootstrapped as admin
2. Open browser devtools console, no `[Auth] Fetch roles error` logged
3. In a scratch component or via React devtools, confirm `useAuth().isAdmin === true` for that account
4. Log in as a normal student/instructor account — confirm `isAdmin === false`

- [ ] **Step 9: Commit**

```bash
git add src/features/auth/context/AuthContext.tsx
git commit -m "feat(auth): fetch user_roles and expose isAdmin"
```

---

### Task 4: `admin.service.ts`

**Files:**
- Create: `src/features/admin/services/admin.service.ts`

**Interfaces:**
- Consumes: `supabase` from `../../../lib/supabase`; `Profile`, `AppRole` from `../../../lib/database.types` (Task 2)
- Produces: `listUsers(): Promise<UserWithRoles[]>`, `getUserStats(): Promise<UserStats>`, `grantRole(userId: string, role: AppRole, grantedBy: string): Promise<void>`, `revokeRole(userId: string, role: AppRole): Promise<void>`. Tasks 6 and 7 (pages) call these.

- [ ] **Step 1: Write the service file**

```typescript
import { supabase } from '../../../lib/supabase'
import type { Profile, AppRole } from '../../../lib/database.types'

export interface UserStats {
  total: number
  byRole: Record<'student' | 'instructor' | 'admin' | 'ta', number>
}

export interface UserWithRoles extends Profile {
  extraRoles: AppRole[]
}

// Fetch every profile plus their extra roles (admin/ta), joined client-side.
// Requires the caller to have the 'admin' role — enforced by RLS, this
// function will simply return an empty/partial list for a non-admin caller.
export async function listUsers(): Promise<UserWithRoles[]> {
  const [{ data: profiles, error: profilesError }, { data: userRoles, error: rolesError }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('user_roles').select('user_id, role'),
  ])

  if (profilesError) throw new Error(profilesError.message)
  if (rolesError) throw new Error(rolesError.message)

  const rolesByUser = new Map<string, AppRole[]>()
  for (const row of userRoles ?? []) {
    const existing = rolesByUser.get(row.user_id) ?? []
    existing.push(row.role)
    rolesByUser.set(row.user_id, existing)
  }

  return (profiles ?? []).map((profile) => ({
    ...profile,
    extraRoles: rolesByUser.get(profile.id) ?? [],
  }))
}

// Count users by every role they hold — primary (profiles.role) plus
// any extra roles (admin/ta). A user with both instructor+admin counts
// in both buckets, which is intentional (union access, not exclusive).
export async function getUserStats(): Promise<UserStats> {
  const users = await listUsers()

  const byRole: UserStats['byRole'] = { student: 0, instructor: 0, admin: 0, ta: 0 }
  for (const user of users) {
    byRole[user.role] += 1
    for (const extra of user.extraRoles) {
      byRole[extra] += 1
    }
  }

  return { total: users.length, byRole }
}

// Grant an extra role to a user. Idempotent — re-granting an already-held
// role is a no-op (unique constraint on user_id+role, upsert handles it).
export async function grantRole(userId: string, role: AppRole, grantedBy: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role, granted_by: grantedBy }, { onConflict: 'user_id,role' })

  if (error) throw new Error(error.message)
}

// Revoke an extra role from a user.
export async function revokeRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)

  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/services/admin.service.ts
git commit -m "feat(admin): add admin.service.ts for user stats and role grants"
```

---

### Task 5: `AdminRoute` guard

**Files:**
- Create: `src/app/AdminRoute.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3, adds `isAdmin`), `RouteLoadingSkeleton` from `../shared/components/Skeleton`
- Produces: `<AdminRoute />` default export, used in Task 6's router wiring.

- [ ] **Step 1: Write the guard**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import { RouteLoadingSkeleton } from '../shared/components/Skeleton'

// Wraps routes that require the 'admin' extra role.
// Must be nested inside ProtectedRoute (session already guaranteed).
//
// This is intentionally a SEPARATE guard from RoleRoute, not a replacement:
// RoleRoute checks the single primary profile.role (student/instructor).
// AdminRoute checks membership in the roles array. A user can hold both
// admin AND their primary role at once, so nesting both guards over the
// respective route trees gives union access naturally — no extra logic
// needed for the "instructor + admin sees both" requirement.
export default function AdminRoute() {
  const { profile, isAdmin, loading } = useAuth()

  // Still loading auth state — show spinner, do NOT redirect yet.
  if (loading || !profile) {
    return <RouteLoadingSkeleton />
  }

  if (!isAdmin) {
    const fallback = profile.role === 'instructor' ? '/instructor/dashboard' : '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/AdminRoute.tsx
git commit -m "feat(admin): add AdminRoute guard"
```

---

### Task 6: i18n copy for the admin panel

**Files:**
- Modify: `src/locales/th/common.json`
- Modify: `src/locales/en/common.json`

**Interfaces:**
- Produces: `t('navigation.admin')`, `t('adminDashboard.*')`, `t('adminUsers.*')` keys. Tasks 7, 8, 9 use these.

- [ ] **Step 1: Add `navigation.admin` (both files)**

In `src/locales/th/common.json`, find the `"navigation"` object (has `dashboard`, `projects`, `students`, `profile`, `openProfile`) and add a key:
```json
"admin": "จัดการระบบ"
```

In `src/locales/en/common.json`, same object, add:
```json
"admin": "Admin"
```

- [ ] **Step 2: Add `adminDashboard` and `adminUsers` top-level objects (both files)**

In `src/locales/th/common.json`, add these as new top-level keys (siblings of `"instructorStudents"`):
```json
"adminDashboard": {
  "title": "แดชบอร์ดผู้ดูแลระบบ",
  "subtitle": "ภาพรวมจำนวนผู้ใช้ทั้งหมดในระบบ",
  "totalUsers": "ผู้ใช้ทั้งหมด",
  "students": "นักศึกษา",
  "instructors": "ผู้สอน",
  "admins": "ผู้ดูแลระบบ",
  "tas": "ผู้ช่วยสอน",
  "loadFailed": "โหลดข้อมูลสถิติไม่สำเร็จ"
},
"adminUsers": {
  "title": "จัดการผู้ใช้",
  "subtitle": "ดูรายชื่อผู้ใช้ทั้งหมด และมอบ/ถอนสิทธิ์ role",
  "email": "อีเมล",
  "name": "ชื่อ",
  "primaryRole": "Role หลัก",
  "extraRoles": "Role เสริม",
  "none": "ไม่มี",
  "grantAdmin": "มอบสิทธิ์ Admin",
  "revokeAdmin": "ถอนสิทธิ์ Admin",
  "grantTa": "มอบสิทธิ์ TA",
  "revokeTa": "ถอนสิทธิ์ TA",
  "empty": "ยังไม่มีผู้ใช้ในระบบ",
  "loadFailed": "โหลดรายชื่อผู้ใช้ไม่สำเร็จ",
  "confirmGrant": "ยืนยันมอบสิทธิ์นี้ให้ผู้ใช้คนนี้?",
  "confirmRevoke": "ยืนยันถอนสิทธิ์นี้จากผู้ใช้คนนี้?",
  "actionFailed": "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง"
}
```

In `src/locales/en/common.json`, add:
```json
"adminDashboard": {
  "title": "Admin dashboard",
  "subtitle": "Overview of every user in the system",
  "totalUsers": "Total users",
  "students": "Students",
  "instructors": "Instructors",
  "admins": "Admins",
  "tas": "TAs",
  "loadFailed": "Failed to load stats"
},
"adminUsers": {
  "title": "Manage users",
  "subtitle": "View all users and grant/revoke roles",
  "email": "Email",
  "name": "Name",
  "primaryRole": "Primary role",
  "extraRoles": "Extra roles",
  "none": "None",
  "grantAdmin": "Grant admin",
  "revokeAdmin": "Revoke admin",
  "grantTa": "Grant TA",
  "revokeTa": "Revoke TA",
  "empty": "No users yet",
  "loadFailed": "Failed to load users",
  "confirmGrant": "Grant this role to this user?",
  "confirmRevoke": "Revoke this role from this user?",
  "actionFailed": "Action failed, try again"
}
```

- [ ] **Step 2: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/th/common.json'))" && echo OK`
Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en/common.json'))" && echo OK`
Expected: both print `OK`.

- [ ] **Step 3: Commit**

```bash
git add src/locales/th/common.json src/locales/en/common.json
git commit -m "feat(i18n): add admin panel copy (th/en)"
```

---

### Task 7: `AdminDashboardPage`

**Files:**
- Create: `src/features/admin/pages/AdminDashboardPage.tsx`

**Interfaces:**
- Consumes: `getUserStats` from `../services/admin.service` (Task 4), `PageContainer` from `../../../app/layout/PageContainer`, `Skeleton` from `../../../shared/components/Skeleton`, `useI18n` from `../../../i18n/I18nProvider`
- Produces: `<AdminDashboardPage />` default export, wired to `/admin/dashboard` in Task 9.

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from 'react'
import PageContainer from '../../../app/layout/PageContainer'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'
import { getUserStats, type UserStats } from '../services/admin.service'

const cardStyle = 'rounded-[28px] bg-white p-6 shadow-[0_14px_28px_rgba(48,34,38,0.09)]'

function DashboardSkeleton() {
  return (
    <PageContainer>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[110px] rounded-[28px]" />
        ))}
      </div>
    </PageContainer>
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

  if (loading) return <DashboardSkeleton />

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
    <PageContainer>
      {error && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className={cardStyle}>
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-[var(--ds-ink)]">{formatNumber(card.value)}</p>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/pages/AdminDashboardPage.tsx
git commit -m "feat(admin): add AdminDashboardPage"
```

---

### Task 8: `AdminUsersPage`

**Files:**
- Create: `src/features/admin/pages/AdminUsersPage.tsx`

**Interfaces:**
- Consumes: `listUsers`, `grantRole`, `revokeRole` from `../services/admin.service` (Task 4); `useAuth` from `../../auth/context/useAuth` (Task 3, needs `user.id` as `grantedBy`); `Badge` from `../../../shared/components/Badge`
- Produces: `<AdminUsersPage />` default export, wired to `/admin/users` in Task 9.

- [ ] **Step 1: Write the page**

```tsx
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
    setLoading(true)
    listUsers()
      .then(setUsers)
      .catch(() => setError(t('adminUsers.loadFailed')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [t])

  async function toggleRole(target: UserWithRoles, role: AppRole) {
    if (!user) return
    const hasRole = target.extraRoles.includes(role)
    const confirmMessage = hasRole ? t('adminUsers.confirmRevoke') : t('adminUsers.confirmGrant')
    if (!window.confirm(confirmMessage)) return

    setPendingUserId(target.id)
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
                      disabled={isPending}
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/pages/AdminUsersPage.tsx
git commit -m "feat(admin): add AdminUsersPage with grant/revoke admin"
```

---

### Task 9: Wire `/admin/*` routes, page titles, and sidebar entry

**Files:**
- Modify: `src/app/router.tsx` (full file, 152 lines)
- Modify: `src/app/layout/PageContainer.tsx` (only the `getPageMeta` function, currently lines 100-126)
- Modify: `src/app/layout/Sidebar.tsx` (full file, ~200 lines)

**Interfaces:**
- Consumes: `AdminRoute` (Task 5), `AdminDashboardPage`/`AdminUsersPage` (Tasks 7/8), `isAdmin` from `useAuth()` (Task 3)

- [ ] **Step 1: Add imports and the `/admin/*` route block to `router.tsx`**

Add these imports near the other page imports (after the `InstructorStudentProfilePage` import, line 21):
```typescript
import AdminRoute from './AdminRoute'
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage'
import AdminUsersPage from '../features/admin/pages/AdminUsersPage'
```

Add a new route block right after the instructor route block closes (after the `]},` that closes the instructor `RoleRoute` children array, currently around line 148, still inside the outer `ProtectedRoute` children array):
```typescript
      // Admin routes (require the 'admin' extra role — independent of
      // the primary student/instructor role, so instructor+admin users
      // pass both this guard and the instructor RoleRoute above).
      {
        element: <AdminRoute />,
        children: [
          {
            path: '/admin/dashboard',
            element: <AdminDashboardPage />,
          },
          {
            path: '/admin/users',
            element: <AdminUsersPage />,
          },
        ],
      },
```

- [ ] **Step 2: Add page titles to `getPageMeta` in `PageContainer.tsx`**

In the `getPageMeta` function, add these two cases before the final `if (isInstructor)` fallback (currently line 122):
```typescript
  if (pathname.includes('/admin/users')) {
    return { title: t('adminUsers.title'), subtitle: t('adminUsers.subtitle'), breadcrumb: t('navigation.admin'), breadcrumbTo: '/admin/dashboard' }
  }
  if (pathname.includes('/admin/dashboard')) {
    return { title: t('adminDashboard.title'), subtitle: t('adminDashboard.subtitle'), breadcrumb: t('navigation.admin'), breadcrumbTo: '/admin/dashboard' }
  }
```

- [ ] **Step 3: Add the Admin menu item to `Sidebar.tsx`**

Add `ShieldCheck` to the lucide-react import (currently lines 3-13):
```typescript
import {
  BookOpen,
  CircleHelp,
  ClipboardList,
  Compass,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
```

Change the destructure from `useAuth()` (currently `const { profile } = useAuth()`, line 60) to:
```typescript
  const { profile, isAdmin } = useAuth()
```

Replace the existing `mainItems` declaration (the ternary that currently starts `const mainItems: SidebarNavItem[] = isInstructor ? [` and ends with the `]` right before `const utilityItems`) with this — same item objects as before, renamed to `roleItems`, plus a new `mainItems` that appends the admin entry:

```typescript
  const roleItems: SidebarNavItem[] = isInstructor
    ? [
        {
          id: 'dashboard',
          label: t('navigation.dashboard'),
          to: '/instructor/dashboard',
          icon: LayoutDashboard,
          active: location.pathname === '/' || location.pathname === '/instructor/dashboard',
        },
        {
          id: 'courses',
          label: t('instructorCourses.title'),
          to: '/instructor/courses',
          icon: BookOpen,
          active: location.pathname.startsWith('/instructor/courses'),
        },
        {
          id: 'projects',
          label: t('navigation.projects'),
          to: '/instructor/projects',
          icon: ClipboardList,
          active: location.pathname.startsWith('/instructor/projects') || location.pathname.startsWith('/instructor/project/'),
        },
        {
          id: 'students',
          label: t('navigation.students'),
          to: '/instructor/students',
          icon: Users,
          active: location.pathname.startsWith('/instructor/students') || location.pathname.startsWith('/instructor/student/'),
        },
      ]
    : [
        {
          id: 'dashboard',
          label: t('navigation.dashboard'),
          to: '/dashboard',
          icon: LayoutDashboard,
          active: location.pathname === '/' || location.pathname === '/dashboard',
        },
        {
          id: 'projects',
          label: t('navigation.projects'),
          to: '/projects',
          icon: ClipboardList,
          active: location.pathname === '/projects' || location.pathname.startsWith('/project/'),
        },
        {
          id: 'join-course',
          label: t('projects.joinCourse'),
          to: '/join',
          icon: BookOpen,
          active: location.pathname === '/join' || location.pathname.startsWith('/course/'),
        },
      ]

  const mainItems: SidebarNavItem[] = [
    ...roleItems,
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: t('navigation.admin'),
            to: '/admin/dashboard',
            icon: ShieldCheck,
            active: location.pathname.startsWith('/admin'),
          },
        ]
      : []),
  ]
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Requires Task 1's bootstrap admin done. Run `vercel dev`, then:
1. Log in as the bootstrapped admin (who is also presumably a student or instructor primary role) — confirm an "Admin" sidebar item appears in addition to their normal menu
2. Click it → lands on `/admin/dashboard`, shows the 5 stat cards with correct counts, breadcrumb reads the admin label
3. Navigate to `/admin/users` — table lists every user, primary role badge correct
4. Click "Grant admin" on a different user → confirm dialog → after confirming, that user's row now shows an `admin` badge and the button flips to "Revoke admin"
5. Log out, log in as that newly-granted admin — confirm they now see the Admin sidebar item too (union access if they're also instructor: confirm their instructor menu items are still all present)
6. Log in as a normal non-admin user, manually navigate to `/admin/dashboard` in the URL bar — confirm redirect away (to `/dashboard` or `/instructor/dashboard`), not a blank page or error

- [ ] **Step 6: Commit**

```bash
git add src/app/router.tsx src/app/layout/PageContainer.tsx src/app/layout/Sidebar.tsx
git commit -m "feat(admin): wire /admin routes, page titles, and sidebar entry"
```

---

## Post-plan note

`ta` role is included in the DB check constraint and in `AppRole`/`UserStats` typing (per the spec, to avoid a schema rework later) but has **no dedicated UI treatment beyond appearing as a badge and being grantable through the same "extra role" mechanism** — the plan does not add a `grantTa`/`revokeTa` button to `AdminUsersPage` since there's no TA feature to grant access *to* yet. When TA features are actually built, extend `AdminUsersPage`'s action column with a second toggle button following the exact same `toggleRole(row, 'ta')` pattern already in the code.
