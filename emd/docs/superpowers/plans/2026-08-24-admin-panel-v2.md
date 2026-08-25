# Admin Panel v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin panel its own dedicated layout (separate sidebar from the student/instructor app), let admins deactivate accounts (soft, no data loss, no service-role key), edit a user's basic profile fields, and filter/search the user table by role, name/email, course, major, and year.

**Architecture:** Everything from v1 (`user_roles` table, `AdminRoute`, grant/revoke-admin) stays as-is. This plan adds: one `profiles.is_active` column + one admin UPDATE policy + two admin SELECT policies (courses, course_enrollments); a new `AdminLayout`/`AdminSidebar` pair that `AdminDashboardPage`/`AdminUsersPage` move into (replacing their current `PageContainer` wrapper); new `admin.service.ts` functions; an app-level (not RLS-level) deactivation check in `AuthContext` that signs a deactivated user back out and routes them to a login-page message.

**Tech Stack:** Same as v1 — React + TypeScript + Vite + Tailwind, Supabase (Postgres + RLS), react-router-dom v6, lucide-react icons, `useI18n`.

**Spec:** `docs/superpowers/specs/2026-08-24-admin-panel-v2-design.md` (builds on `docs/superpowers/specs/2026-08-24-admin-role-design.md`, already implemented)

## Global Constraints

- No automated test runner exists in this project — the verification gate is `npx tsc --noEmit` returning zero new errors, exactly as in the v1 plan.
- **No hard delete of users, ever.** Deactivate is a soft flag (`profiles.is_active`) only.
- **No Supabase service role key is introduced.** Deactivation enforcement is app-level (client checks `is_active` after login and signs itself out), not an `auth.users` operation.
- Admin must never see GDD/project content — no task in this plan touches `projects`, `analyses`, `ads_configs`, or `iap_configs`.
- An admin can never deactivate their own account, and can never revoke their own admin role (v1 rule, still applies) — both guarded the same way: `disabled` on the button for `row.id === user.id`.
- Read each file fully before editing it — every Modify step below names exact current content (read live just before this plan was written), but re-read the file first since other work may have touched it since.
- Thai UI copy stays casual/short, matching the existing tone in `src/locales/th/common.json`.

---

### Task 1: SQL migration for `is_active` + admin policies

**Files:**
- Create: `docs/superpowers/sql/2026-08-24-admin-panel-v2.sql`

**Interfaces:**
- Produces: `public.profiles.is_active boolean not null default true`; policies `profiles_update_admin`, `courses_select_admin`, `course_enrollments_select_admin`. Task 4 (service functions) and Task 5 (AuthContext) assume this column exists.

- [ ] **Step 1: Write the SQL file**

```sql
-- Admin panel v2: deactivate support + admin edit/filter access
-- Run this ENTIRE script once in the Supabase SQL Editor.
-- Safe to re-run (uses if not exists / drop policy if exists).

alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- Admin can update any profile (needed for both deactivate and edit-profile).
-- Additive permissive policy — does not remove/narrow the existing
-- "profiles: owner can update" policy, which still governs non-admins.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Admin needs to read every course (for the course filter dropdown) and
-- every enrollment row (to filter students by course). Additive permissive
-- SELECT policies — do not remove/narrow whatever SELECT policies already
-- exist on these tables.
drop policy if exists "courses_select_admin" on public.courses;
create policy "courses_select_admin"
  on public.courses for select
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "course_enrollments_select_admin" on public.course_enrollments;
create policy "course_enrollments_select_admin"
  on public.course_enrollments for select
  using (public.has_role(auth.uid(), 'admin'));
```

- [ ] **Step 2: Hand off to Yuuko to run in Supabase**

Not run by the implementer. Tell Yuuko the file is ready at
`docs/superpowers/sql/2026-08-24-admin-panel-v2.sql` — she pastes the whole
thing into the Supabase SQL Editor and runs it. Verify: `select is_active from public.profiles limit 1;` returns `true` with no error. No bootstrap step this time (unlike v1) — this migration doesn't create any new privileged row, just a column and policies.

Tasks 2 and 3 (types, i18n) don't depend on this being run yet and can proceed in parallel. Task 4 onward assume it's done for their own manual-verification steps, not for `tsc`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/sql/2026-08-24-admin-panel-v2.sql
git commit -m "docs: add admin panel v2 SQL migration (is_active + policies)"
```

---

### Task 2: Add `is_active` to `database.types.ts`

**Files:**
- Modify: `src/lib/database.types.ts` (the `profiles` table block — currently lines 16-52)

**Interfaces:**
- Produces: `Profile.is_active: boolean`. Tasks 4, 5, 9 read/write this field and assume it exists on the `Profile` type.

- [ ] **Step 1: Add `is_active` to the `profiles` Row/Insert/Update shapes**

The current block (verify against the live file — this is what it looked like when this plan was written):

```typescript
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          role: 'student' | 'instructor'
          contact_info: string | null   // instructor: phone/email/line
          student_code: string | null   // student: student ID number
          major: string | null          // student: major/program
          year: number | null           // student: year of study
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          role?: 'student' | 'instructor'
          contact_info?: string | null
          student_code?: string | null
          major?: string | null
          year?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          role?: 'student' | 'instructor'
          contact_info?: string | null
          student_code?: string | null
          major?: string | null
          year?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
```

Add `is_active` to all three shapes — required (not optional) in `Row` since the column has a DB default and every existing row gets `true`; optional in `Insert`/`Update` since it defaults:

```typescript
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          role: 'student' | 'instructor'
          contact_info: string | null   // instructor: phone/email/line
          student_code: string | null   // student: student ID number
          major: string | null          // student: major/program
          year: number | null           // student: year of study
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          role?: 'student' | 'instructor'
          contact_info?: string | null
          student_code?: string | null
          major?: string | null
          year?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          role?: 'student' | 'instructor'
          contact_info?: string | null
          student_code?: string | null
          major?: string | null
          year?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors will appear in files that construct a `Profile`/`Insert` object literal without `is_active` (e.g. `AuthContext.tsx`'s `previewProfile`, or demo data in service files) — this is expected and correct; those get fixed in the tasks that touch those files. If this task's own diff is the only change, note which files now show errors in your report so later tasks know to check them — do not fix files outside this task's scope yourself.

- [ ] **Step 3: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): add profiles.is_active"
```

---

### Task 3: i18n copy for admin panel v2

**Files:**
- Modify: `src/locales/th/common.json`
- Modify: `src/locales/en/common.json`

**Interfaces:**
- Produces: `t('adminLayout.*')`, new keys inside the existing `adminUsers` object, `t('auth.login.deactivated')`. Tasks 5, 6, 9 use these.

- [ ] **Step 1: Add a new top-level `adminLayout` object (both files)**

In `src/locales/th/common.json`, add as a new top-level key (sibling of `adminUsers`):

```json
"adminLayout": {
  "title": "Admin Panel",
  "dashboard": "แดชบอร์ด",
  "users": "ผู้ใช้",
  "backToApp": "กลับหน้าหลัก"
}
```

In `src/locales/en/common.json`:

```json
"adminLayout": {
  "title": "Admin Panel",
  "dashboard": "Dashboard",
  "users": "Users",
  "backToApp": "Back to app"
}
```

- [ ] **Step 2: Add new keys inside the existing `adminUsers` object (both files)**

The current `adminUsers` object in `src/locales/th/common.json` ends with:
```json
  "confirmGrant": "ยืนยันมอบสิทธิ์นี้ให้ผู้ใช้คนนี้?",
  "confirmRevoke": "ยืนยันถอนสิทธิ์นี้จากผู้ใช้คนนี้?",
  "actionFailed": "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง"
}
```
Add these keys before the closing `}` (after `actionFailed`, with a comma added after `actionFailed`'s value):
```json
  "filterRole": "กรองตาม Role",
  "filterAll": "ทั้งหมด",
  "searchPlaceholder": "ค้นหาชื่อหรืออีเมล",
  "filterCourse": "กรองตามวิชา",
  "filterMajor": "กรองตามสาขา",
  "filterYear": "กรองตามชั้นปี",
  "status": "สถานะ",
  "statusActive": "ใช้งานอยู่",
  "statusInactive": "ถูกระงับ",
  "deactivate": "ระงับการใช้งาน",
  "activate": "เปิดใช้งาน",
  "confirmDeactivate": "ยืนยันระงับการใช้งานผู้ใช้คนนี้?",
  "confirmActivate": "ยืนยันเปิดใช้งานผู้ใช้คนนี้อีกครั้ง?",
  "edit": "แก้ไข",
  "save": "บันทึก",
  "cancel": "ยกเลิก",
  "editFailed": "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"
```

The current `adminUsers` object in `src/locales/en/common.json` ends with:
```json
  "confirmGrant": "Grant this role to this user?",
  "confirmRevoke": "Revoke this role from this user?",
  "actionFailed": "Action failed, try again"
}
```
Add:
```json
  "filterRole": "Filter by role",
  "filterAll": "All",
  "searchPlaceholder": "Search name or email",
  "filterCourse": "Filter by course",
  "filterMajor": "Filter by major",
  "filterYear": "Filter by year",
  "status": "Status",
  "statusActive": "Active",
  "statusInactive": "Deactivated",
  "deactivate": "Deactivate",
  "activate": "Activate",
  "confirmDeactivate": "Deactivate this user's account?",
  "confirmActivate": "Reactivate this user's account?",
  "edit": "Edit",
  "save": "Save",
  "cancel": "Cancel",
  "editFailed": "Save failed, try again"
```

- [ ] **Step 3: Add `deactivated` inside the existing `auth.login` object (both files)**

In `src/locales/th/common.json`, find `"auth": { "login": { ... } }` — inside `login`, add (anywhere among the existing keys, e.g. after `"googleFailed"`):
```json
  "deactivated": "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
```
(remember the trailing comma on the preceding key's line)

In `src/locales/en/common.json`, same location:
```json
  "deactivated": "This account has been deactivated. Please contact an administrator."
```

- [ ] **Step 4: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/th/common.json'))" && echo OK`
Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en/common.json'))" && echo OK`
Expected: both print `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/locales/th/common.json src/locales/en/common.json
git commit -m "feat(i18n): add admin panel v2 copy (layout, filters, edit, deactivate)"
```

---

### Task 4: `admin.service.ts` additions

**Files:**
- Modify: `src/features/admin/services/admin.service.ts` (append new functions; add one import)

**Interfaces:**
- Consumes: `Course` type (add to the existing import from `../../../lib/database.types`)
- Produces: `updateUserProfile(userId, updates): Promise<void>`, `setUserActive(userId, isActive): Promise<void>`, `listAllCourses(): Promise<Course[]>`, `listAllEnrollments(): Promise<Map<string, string[]>>`. Task 9 (`AdminUsersPage`) calls all four.

- [ ] **Step 1: Add `Course` to the existing type import**

Change the top of the file from:
```typescript
import { supabase } from '../../../lib/supabase'
import type { Profile, AppRole } from '../../../lib/database.types'
```
to:
```typescript
import { supabase } from '../../../lib/supabase'
import type { Profile, AppRole, Course } from '../../../lib/database.types'
```

- [ ] **Step 2: Append the four new functions to the end of the file**

```typescript

// Update specific profile fields (admin only — enforced by the
// profiles_update_admin RLS policy). Deliberately does NOT accept
// email or role — email is identity, role changes go through
// grantRole/revokeRole or stay untouched (profiles.role is out of scope).
export async function updateUserProfile(
  userId: string,
  updates: {
    display_name?: string | null
    major?: string | null
    year?: number | null
    student_code?: string | null
    contact_info?: string | null
  }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

// Activate or deactivate a user's account. Soft flag only — never deletes
// or touches auth.users. Enforcement of what "deactivated" means happens
// client-side in AuthContext, not here.
export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

// Every course in the system, for the admin user-table's course filter.
// Unlike courses.service.ts's listInstructorCourses (own courses only),
// this is admin-scoped: every course regardless of who created it.
export async function listAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('title', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// Every enrollment in the system, shaped as course_id -> student_ids,
// for filtering the admin user table by course membership.
export async function listAllEnrollments(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('course_id, student_id')

  if (error) throw new Error(error.message)

  const map = new Map<string, string[]>()
  for (const row of data ?? []) {
    const existing = map.get(row.course_id) ?? []
    existing.push(row.student_id)
    map.set(row.course_id, existing)
  }
  return map
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file (pre-existing errors from Task 2's `is_active` addition in other files are not this task's concern).

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/services/admin.service.ts
git commit -m "feat(admin): add updateUserProfile, setUserActive, listAllCourses, listAllEnrollments"
```

---

### Task 5: Deactivation enforcement — `AuthContext`, `ProtectedRoute`, `LoginPage`

**Files:**
- Modify: `src/features/auth/context/AuthContext.tsx` (full file, ~202 lines)
- Modify: `src/app/ProtectedRoute.tsx` (full file, 19 lines)
- Modify: `src/features/auth/pages/LoginPage.tsx` (full file)

**Interfaces:**
- Consumes: `Profile.is_active` (Task 2), `t('auth.login.deactivated')` (Task 3)
- Produces: `useAuth().deactivated: boolean`. `ProtectedRoute` and `LoginPage` are the only consumers.

- [ ] **Step 1: `AuthContext.tsx` — add `is_active` to `previewProfile`**

Task 2 made `is_active` a required field on `Profile`'s `Row` type, so the hardcoded `previewProfile` object (currently lines 8-18) now fails to type-check. Add it:

```typescript
const previewProfile: Profile = {
  id: 'preview-instructor',
  email: 'preview@emd.local',
  display_name: 'Pimponput Talubnga',
  role: 'instructor',
  contact_info: null,
  student_code: '662110157',
  major: null,
  year: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
```

- [ ] **Step 2: `AuthContext.tsx` — add `deactivated` to the interface and both providers**

Change the interface (currently lines 35-42):
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
to:
```typescript
interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  roles: AppRole[]
  isAdmin: boolean
  deactivated: boolean
  loading: boolean
  setProfile: (profile: Profile | null) => void
}
```

In `PreviewAuthProvider`'s returned value (currently lines 51-60), add `deactivated: false`:
```typescript
      value={{
        user: previewSession.user,
        session: previewSession,
        profile,
        roles,
        isAdmin: false,
        deactivated: false,
        loading: false,
        setProfile,
      }}
```

- [ ] **Step 3: `AuthContext.tsx` — add `deactivated` state to the real `AuthProvider`**

Next to `const [roles, setRoles] = useState<AppRole[]>([])`, add:
```typescript
  const [deactivated, setDeactivated] = useState(false)
```

- [ ] **Step 4: `AuthContext.tsx` — detect deactivation in Effect 2**

The current resolution block is:
```typescript
    Promise.all([fetchProfile(user.id), fetchRoles(user.id)]).then(([p, r]) => {
      if (cancelled) return
      lastFetchedUserIdRef.current = user.id
      setProfile(p)
      setRoles(r)
      setLoading(false)
    })
```
Replace it with:
```typescript
    Promise.all([fetchProfile(user.id), fetchRoles(user.id)]).then(([p, r]) => {
      if (cancelled) return
      lastFetchedUserIdRef.current = user.id

      if (p?.is_active === false) {
        console.warn('[Auth] Account is deactivated — signing out')
        setDeactivated(true)
        setProfile(null)
        setRoles([])
        setLoading(false)
        void supabase.auth.signOut({ scope: 'local' })
        return
      }

      setDeactivated(false)
      setProfile(p)
      setRoles(r)
      setLoading(false)
    })
```

- [ ] **Step 5: `AuthContext.tsx` — expose `deactivated` from the provider value**

Change the final return (currently):
```typescript
    <AuthContext.Provider value={{ user, session, profile, roles, isAdmin: roles.includes('admin'), loading, setProfile }}>
```
to:
```typescript
    <AuthContext.Provider value={{ user, session, profile, roles, isAdmin: roles.includes('admin'), deactivated, loading, setProfile }}>
```

- [ ] **Step 6: `ProtectedRoute.tsx` — redirect deactivated users with a query flag**

Replace the whole file:
```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import { RouteLoadingSkeleton } from '../shared/components/Skeleton'

// Wraps any route that requires an authenticated session.
// Shows spinner while auth state is loading.
// Redirects to /login if no session is found — with ?deactivated=1 if the
// session was cleared because the account was deactivated, so LoginPage
// can show the right message instead of a generic "please sign in".
// Header is rendered inside PageContainer on each page — not here.
export default function ProtectedRoute() {
  const { session, loading, deactivated } = useAuth()

  if (loading) {
    return <RouteLoadingSkeleton />
  }

  if (!session) {
    return <Navigate to={deactivated ? '/login?deactivated=1' : '/login'} replace />
  }

  return <Outlet />
}
```

- [ ] **Step 7: `LoginPage.tsx` — show the deactivated message**

Read the current file fully first. Add `useSearchParams` to the react-router-dom import (currently `import { Navigate } from 'react-router-dom'`):
```tsx
import { Navigate, useSearchParams } from 'react-router-dom'
```

Inside the component, right after `const { t } = useI18n()`, add:
```tsx
  const [searchParams] = useSearchParams()
  const isDeactivated = searchParams.get('deactivated') === '1'
```

In the JSX, right after the existing `{!isSupabaseConfigured && ( ... )}` block (the yellow warning banner) and before `<div className="mt-8 space-y-3">`, add:
```tsx
              {isDeactivated && (
                <div className="mt-7 rounded-[22px] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {t('auth.login.deactivated')}
                </div>
              )}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors remaining that trace back to `is_active`/`deactivated` (some other file may still show an `is_active`-related error if it also constructs a `Profile`/`Insert` literal — check `courses.service.ts`'s `demoStudents` array specifically; if it errors, add `is_active: true` to that demo object too as part of this task, since it's the same class of fix as `previewProfile` in Step 1).

- [ ] **Step 9: Manual verification**

Requires Task 1's SQL run and `vercel dev`.
1. In Supabase, set `is_active = false` on a test (non-admin, non-yourself) user's `profiles` row directly via SQL: `update public.profiles set is_active = false where email = '<test-email>';`
2. Log in as that user — confirm: briefly authenticates, then gets signed out and lands on `/login?deactivated=1` showing the red banner
3. Reset it back: `update public.profiles set is_active = true where email = '<test-email>';` and confirm that user can log in normally again
4. Confirm your own (admin) account still logs in fine throughout (it should never have been touched)

- [ ] **Step 10: Commit**

```bash
git add src/features/auth/context/AuthContext.tsx src/app/ProtectedRoute.tsx src/features/auth/pages/LoginPage.tsx
git commit -m "feat(auth): sign out and message deactivated accounts on login"
```

---

### Task 6: `AdminLayout` + `AdminSidebar`

**Files:**
- Create: `src/app/layout/AdminSidebar.tsx`
- Create: `src/app/layout/AdminLayout.tsx`

**Interfaces:**
- Consumes: `t('adminLayout.*')` (Task 3)
- Produces: `<AdminLayout />` default export (wraps `<Outlet />`), used by Task 7's router wiring. Exports `adminSidebarWidth` (number, px) from `AdminSidebar.tsx` for `AdminLayout` to size its main content offset.

- [ ] **Step 1: Write `AdminSidebar.tsx`**

```tsx
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'

// Width of the admin sidebar, in px. Static (no collapse/expand like the
// main app's Sidebar) — this is a small, two-item nav, collapsing adds
// complexity with no real benefit here.
export const adminSidebarWidth = 240

export default function AdminSidebar() {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()

  const items = [
    { id: 'dashboard', label: t('adminLayout.dashboard'), to: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'users', label: t('adminLayout.users'), to: '/admin/users', icon: Users },
  ]

  return (
    <aside
      className="no-print fixed bottom-0 left-0 top-0 z-50 flex h-screen flex-col border-r-2 border-[#F48E2E]/70 bg-[var(--ds-sidebar)] px-4 py-6 text-white"
      style={{ width: adminSidebarWidth }}
      aria-label="Admin sidebar"
    >
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck className="h-6 w-6 text-[#F48E2E]" strokeWidth={2.2} />
        <div>
          <p className="text-sm font-black leading-none">EMD</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t('adminLayout.title')}</p>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={`flex h-10 items-center gap-3 rounded-full px-4 text-sm font-semibold transition ${
                active ? 'bg-[#F48E2E]/20 text-[#F48E2E]' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.1} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex h-10 items-center gap-3 rounded-full px-4 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
      >
        <ArrowLeft className="h-4.5 w-4.5 shrink-0" strokeWidth={2.1} />
        {t('adminLayout.backToApp')}
      </button>
    </aside>
  )
}
```

- [ ] **Step 2: Write `AdminLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom'
import AdminSidebar, { adminSidebarWidth } from './AdminSidebar'

// Dedicated layout for /admin/* — deliberately separate from PageContainer/
// Sidebar (the student/instructor app shell). Admin pages render their own
// heading inside <Outlet /> instead of relying on a shared page-title system.
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[var(--ds-bg)]">
      <AdminSidebar />
      <main className="min-h-screen px-6 py-8 sm:px-10" style={{ marginLeft: adminSidebarWidth }}>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/AdminSidebar.tsx src/app/layout/AdminLayout.tsx
git commit -m "feat(admin): add dedicated AdminLayout and AdminSidebar"
```

---

### Task 7: Wire `AdminLayout` into the router

**Files:**
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `AdminLayout` (Task 6)

- [ ] **Step 1: Import `AdminLayout`**

Add near the other admin imports (currently lines 22-24):
```typescript
import AdminRoute from './AdminRoute'
import AdminLayout from './layout/AdminLayout'
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage'
import AdminUsersPage from '../features/admin/pages/AdminUsersPage'
```

- [ ] **Step 2: Nest the two admin routes under `AdminLayout`**

The current block is:
```tsx
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
Replace with:
```tsx
      // Admin routes (require the 'admin' extra role — independent of
      // the primary student/instructor role, so instructor+admin users
      // pass both this guard and the instructor RoleRoute above).
      // AdminLayout gives /admin/* its own sidebar, separate from the
      // student/instructor Sidebar used by every other route above.
      {
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
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
        ],
      },
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(admin): nest admin routes under AdminLayout"
```

---

### Task 8: `AdminDashboardPage` — drop `PageContainer`, own heading

**Files:**
- Modify: `src/features/admin/pages/AdminDashboardPage.tsx` (full file, ~70 lines)

**Interfaces:**
- Consumes: nothing new (still uses `getUserStats` from Task-4-untouched functions)
- Produces: same default export, now rendered without `PageContainer` (relies on `AdminLayout` from Task 6/7 for the surrounding chrome)

- [ ] **Step 1: Replace the whole file**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/pages/AdminDashboardPage.tsx
git commit -m "feat(admin): move AdminDashboardPage into AdminLayout, drop PageContainer"
```

---

### Task 9: `AdminUsersPage` — filters, inline edit, deactivate

**Files:**
- Modify: `src/features/admin/pages/AdminUsersPage.tsx` (full rewrite)

**Interfaces:**
- Consumes: `listUsers`, `grantRole`, `revokeRole` (existing), `updateUserProfile`, `setUserActive`, `listAllCourses`, `listAllEnrollments` (Task 4); `t('adminUsers.*')`, `t('adminLayout.*')` (Task 3)
- Produces: same default export, now rendered without `PageContainer`, with filters/search/edit/deactivate added on top of v1's grant/revoke-admin.

- [ ] **Step 1: Replace the whole file**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Skeleton } from '../../../shared/components/Skeleton'
import Badge from '../../../shared/components/Badge'
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
  type UserWithRoles,
} from '../services/admin.service'
import type { AppRole, Course } from '../../../lib/database.types'

type RoleFilter = 'all' | 'student' | 'instructor' | 'admin' | 'ta'

interface EditForm {
  display_name: string
  major: string
  year: string
  student_code: string
  contact_info: string
}

function UsersSkeleton() {
  return (
    <div className="rounded-[28px] bg-white px-8 py-6 shadow-[0_18px_35px_rgba(17,24,39,0.08)]">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-5 gap-5 border-b border-[#e5e7eb] py-4 last:border-0">
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
  'h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#F48E2E]/40'
const inputClass =
  'h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F48E2E]/40'

export default function AdminUsersPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ display_name: '', major: '', year: '', student_code: '', contact_info: '' })

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [majorFilter, setMajorFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')

  function load() {
    setError(null)
    setLoading(true)
    Promise.all([listUsers(), listAllCourses(), listAllEnrollments()])
      .then(([u, c, e]) => {
        setUsers(u)
        setCourses(c)
        setEnrollments(e)
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
        const matchesExtra = row.extraRoles.includes(roleFilter as AppRole)
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
      <h1 className="text-[26px] font-black tracking-tight text-[var(--ds-ink)]">{t('adminUsers.title')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('adminUsers.subtitle')}</p>

      {error && (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adminUsers.searchPlaceholder')}
          className={`${inputClass} w-56`}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} className={selectClass}>
          <option value="all">{t('adminUsers.filterAll')} ({t('adminUsers.filterRole')})</option>
          <option value="student">student</option>
          <option value="instructor">instructor</option>
          <option value="admin">admin</option>
          <option value="ta">ta</option>
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

      <div className="mt-6 overflow-x-auto rounded-[28px] bg-white shadow-[0_18px_35px_rgba(17,24,39,0.08)]">
        {loading ? (
          <UsersSkeleton />
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-xs font-bold uppercase tracking-wide text-slate-400">
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
                const isAdminRow = row.extraRoles.includes('admin')
                const isSelf = row.id === user?.id
                const isEditing = editingUserId === row.id

                if (isEditing) {
                  return (
                    <tr key={row.id} className="border-b border-[#e5e7eb] bg-[#F48E2E]/5 last:border-0">
                      <td className="px-6 py-4" colSpan={6}>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                          <input className={inputClass} placeholder={t('adminUsers.name')} value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
                          <input className={inputClass} placeholder="Major" value={editForm.major} onChange={(e) => setEditForm({ ...editForm, major: e.target.value })} />
                          <input className={inputClass} placeholder="Year" inputMode="numeric" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} />
                          <input className={inputClass} placeholder="Student code" value={editForm.student_code} onChange={(e) => setEditForm({ ...editForm, student_code: e.target.value })} />
                          <input className={inputClass} placeholder="Contact" value={editForm.contact_info} onChange={(e) => setEditForm({ ...editForm, contact_info: e.target.value })} />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button type="button" disabled={isPending} onClick={() => saveEdit(row.id)} className="rounded-full bg-[#F48E2E] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40">
                            {t('adminUsers.save')}
                          </button>
                          <button type="button" disabled={isPending} onClick={cancelEdit} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40">
                            {t('adminUsers.cancel')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

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
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                          {t('adminUsers.edit')}
                        </button>
                        <button
                          type="button"
                          disabled={isPending || isSelf}
                          onClick={() => toggleActive(row)}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                          {row.is_active ? t('adminUsers.deactivate') : t('adminUsers.activate')}
                        </button>
                        <button
                          type="button"
                          disabled={isPending || isSelf}
                          onClick={() => toggleRole(row, 'admin')}
                          className="rounded-full border border-[#F48E2E]/45 px-3 py-1.5 text-xs font-bold text-[#7a3414] transition hover:bg-[#F48E2E]/10 disabled:opacity-40"
                        >
                          {isAdminRow ? t('adminUsers.revokeAdmin') : t('adminUsers.grantAdmin')}
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
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. `Badge`'s `variant` prop must accept `'green'` and `'red'` — it does (`src/shared/components/Badge.tsx` already defines both in its `BadgeVariant` union from existing usage elsewhere in the codebase); if `tsc` disagrees, report it as a concern rather than guessing at `Badge`'s actual type.

- [ ] **Step 3: Manual verification**

Requires Tasks 1, 4, 6, 7 done and `vercel dev` running.
1. `/admin/users` renders inside the new `AdminSidebar` layout (not the old student/instructor sidebar)
2. Type in the search box — table narrows to matching name/email
3. Pick a role filter — table narrows correctly; pick "all" — table returns to full list
4. Pick a course filter — only enrolled students for that course remain
5. Click "Edit" on a row — inline form appears with current values, editable; Save persists (reload the page and confirm the new values stick); Cancel discards without saving
6. Click "Deactivate" on a non-self row — confirm dialog — after confirming, badge flips to "Deactivated" and button flips to "Activate"; button is disabled (greyed out) on your own row

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/pages/AdminUsersPage.tsx
git commit -m "feat(admin): add filters, inline edit, and deactivate to AdminUsersPage"
```

---

### Task 10: Remove dead `/admin/*` cases from `PageContainer.tsx`

**Files:**
- Modify: `src/app/layout/PageContainer.tsx` (only the `getPageMeta` function)

**Interfaces:**
- No interface changes — this is dead-code cleanup now that Tasks 8-9 mean `/admin/*` pages never render `PageContainer` at all, so these two `pathname.includes` branches inside `getPageMeta` can never execute.

- [ ] **Step 1: Remove the two admin cases**

Current (inside `getPageMeta`, added in the v1 plan, now unreachable):
```typescript
  if (pathname.includes('/admin/users')) {
    return { title: t('adminUsers.title'), subtitle: t('adminUsers.subtitle'), breadcrumb: t('navigation.admin'), breadcrumbTo: '/admin/dashboard' }
  }
  if (pathname.includes('/admin/dashboard')) {
    return { title: t('adminDashboard.title'), subtitle: t('adminDashboard.subtitle'), breadcrumb: t('navigation.admin'), breadcrumbTo: '/admin/dashboard' }
  }
```
Delete both blocks entirely. Everything else in `getPageMeta` and the rest of the file stays untouched.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual sanity check**

Confirm nothing else in the codebase still relies on these two branches: `grep -rn "getPageMeta" src` should show only the one definition and one call site (inside `PageContainer.tsx` itself) — no `/admin` path ever reaches `PageContainer` anymore per Tasks 8-9.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/PageContainer.tsx
git commit -m "chore(admin): remove dead /admin getPageMeta cases (pages no longer use PageContainer)"
```

---

## Post-plan notes

- The main app's `Sidebar.tsx` "Admin" menu item (added in v1) is **kept unchanged** — it's the entry point *into* `/admin/*` from the regular app; `AdminSidebar`'s "back to app" link (Task 6) is the exit. Both are needed; this plan does not touch `Sidebar.tsx`.
- `courses.service.ts`'s `demoStudents` array may need an `is_active: true` added if Task 5's `tsc --noEmit` run (Step 8) surfaces it as an error — flagged explicitly in that step rather than assumed, since whether it errors depends on strictness settings not fully known ahead of time.
