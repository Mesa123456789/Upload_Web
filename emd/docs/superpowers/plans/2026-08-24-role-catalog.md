# Role Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin create/delete extra role names from the admin panel (no SQL needed) by replacing the hardcoded `user_roles.role` CHECK constraint with a foreign key to a new `app_roles` catalog table, and generalizing every place in the frontend that currently hardcodes `'admin'`/`'ta'` as the only two possible extra roles.

**Architecture:** New `app_roles` table (name, label, description, is_builtin) seeded with `admin`/`ta` as protected built-ins. `user_roles.role` now FK-references it instead of a fixed CHECK list. `AppRole` widens from a literal union to `string` throughout the frontend. `AdminUsersPage`'s single hardcoded "Grant/Revoke admin" button becomes a per-role chip list (add/remove) driven by the catalog. `AdminDashboardPage`'s stat cards become dynamic (one per catalog role, not hardcoded admin/ta cards). A new `AdminRolesPage` lets an admin manage the catalog itself.

**Tech Stack:** Same as prior admin work — React + TypeScript + Vite + Tailwind, Supabase (Postgres + RLS), react-router-dom v6, lucide-react, `useI18n`.

**Spec:** `docs/superpowers/specs/2026-08-24-role-catalog-design.md` (builds on the already-merged admin-role v1 and admin-panel v2 specs)

## Global Constraints

- Verification gate: `npx tsc -b --noEmit` — **not** plain `tsc --noEmit`, which is a confirmed no-op on this repo's project-references tsconfig setup (do not use the un-flagged form anywhere in this plan or its dispatches).
- **`admin` and `ta` are permanently protected (`is_builtin = true`).** Neither the UI nor the RLS policies may allow deleting or renaming them — the app's code hardcodes the literal string `'admin'` in multiple places (`AuthContext`'s `isAdmin`, every `has_role(uid, 'admin')` RLS check across two prior migrations). Deleting it would break the whole admin system.
- Creating a role via this feature grants it **zero** capability automatically — it only makes the name assignable. No task in this plan wires any new permission/route/page to a role name.
- No TA grading/review feature — explicitly out of scope, pending a separate future spec after the instructor teammate signs off. Nothing in this plan touches `projects`/`analyses`/`ads_configs`/`iap_configs`/Guardrail.
- **Do NOT run `git reset` (of any kind) at any point, in any dispatched task, for any reason.** A prior task on a previous plan in this repo used `git reset` mid-task and silently corrupted branch history (recovered, but costly to detect). If a git mistake seems to have happened, STOP and report BLOCKED with the details instead of self-fixing with git commands. The only git commands any implementer should need: `git add`, `git commit`, `git log`, `git diff`, `git status`.
- No automated test runner exists in this project — `tsc -b --noEmit` plus the manual-verification checklists in each task are the only gates.
- Read each file fully before editing it — every Modify step below names exact current content (read live just before this plan was written), but re-read the file first since other work may have touched it since.
- Thai UI copy stays casual/short, matching the existing tone.

---

### Task 1: SQL migration for `app_roles`

**Files:**
- Create: `docs/superpowers/sql/2026-08-24-role-catalog.sql`

**Interfaces:**
- Produces: table `public.app_roles(name, label, description, is_builtin, created_by, created_at)` seeded with `admin`/`ta`; `public.user_roles.role` now FK-references `app_roles.name` instead of a CHECK list. Every later task assumes this exists.

- [ ] **Step 1: Write the SQL file**

```sql
-- Role catalog: dynamic role creation via admin panel
-- Run this ENTIRE script once in the Supabase SQL Editor.
-- Safe to re-run (uses if not exists / on conflict do nothing / drop policy if exists).

create table if not exists public.app_roles (
  name        text primary key,
  label       text not null,
  description text,
  is_builtin  boolean not null default false,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

insert into public.app_roles (name, label, description, is_builtin) values
  ('admin', 'Admin', 'จัดการ user และ role ทั้งระบบ', true),
  ('ta', 'TA', 'ผู้ช่วยสอน (ยังไม่มีสิทธิ์พิเศษผูกไว้ในระบบ)', true)
on conflict (name) do nothing;

-- Swap the fixed CHECK list for a foreign key against the catalog above.
-- The existing admin/ta rows in user_roles already satisfy this once the
-- two builtin catalog rows exist (inserted just above).
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_fkey foreign key (role) references public.app_roles(name);

alter table public.app_roles enable row level security;

drop policy if exists "app_roles_select_admin" on public.app_roles;
create policy "app_roles_select_admin"
  on public.app_roles for select
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "app_roles_insert_admin" on public.app_roles;
create policy "app_roles_insert_admin"
  on public.app_roles for insert
  with check (public.has_role(auth.uid(), 'admin'));

-- Builtin roles (admin/ta) can never be deleted, even by an admin —
-- this is a second, DB-level guard independent of the frontend disabling
-- the delete button for builtin rows.
drop policy if exists "app_roles_delete_admin_non_builtin" on public.app_roles;
create policy "app_roles_delete_admin_non_builtin"
  on public.app_roles for delete
  using (public.has_role(auth.uid(), 'admin') and not is_builtin);

-- No UPDATE policy on purpose — roles aren't editable after creation.
```

- [ ] **Step 2: Hand off to Yuuko to run in Supabase**

Not run by the implementer. Tell Yuuko the file is ready at
`docs/superpowers/sql/2026-08-24-role-catalog.sql` — paste the whole thing into the Supabase SQL Editor and run it. Verify: `select name, is_builtin from public.app_roles;` returns exactly `admin` and `ta`, both `is_builtin = true`. Then verify the FK swap worked: `select conname from pg_constraint where conrelid = 'public.user_roles'::regclass and contype = 'f';` should list `user_roles_role_fkey` (and the existing `user_roles_user_id_fkey`/`user_roles_granted_by_fkey`); `select conname from pg_constraint where conrelid = 'public.user_roles'::regclass and contype = 'c';` should return no rows (the old CHECK is gone).

Tasks 2 onward don't need this run yet for `tsc` — only their manual-verification steps need it.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/sql/2026-08-24-role-catalog.sql
git commit -m "docs: add role catalog SQL migration"
```

---

### Task 2: `database.types.ts` — `app_roles` type, widen `AppRole`

**Files:**
- Modify: `src/lib/database.types.ts` (add a new table block; change the `user_roles` block; change the `AppRole` export — currently line 458)

**Interfaces:**
- Produces: `Database['public']['Tables']['app_roles']`, `export type AppRoleCatalogEntry = Database['public']['Tables']['app_roles']['Row']`, `AppRole` widened from `'admin' | 'ta'` to `string`. Tasks 4, 5, 8, 9 depend on this.

- [ ] **Step 1: Add the `app_roles` table block**

Insert it as a new entry in the `Tables` object — put it right before the `user_roles` block (alphabetically/logically adjacent, matches how the file is otherwise ordered by when each table was added):

```typescript
      app_roles: {
        Row: {
          name: string
          label: string
          description: string | null
          is_builtin: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          name: string
          label: string
          description?: string | null
          is_builtin?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          label?: string
          description?: string | null
          is_builtin?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
```

- [ ] **Step 2: Change `user_roles.role`'s type from `'admin' | 'ta'` to `string`**

Current block:
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
```
Change every `'admin' | 'ta'` in this block to `string` (three occurrences — Row, Insert, Update). Leave `Relationships` and everything else in the block unchanged.

- [ ] **Step 3: Widen the `AppRole` export and add the catalog-entry convenience type**

Find (near the bottom of the file, alongside the other convenience exports, currently `export type AppRole = 'admin' | 'ta'`):
```typescript
export type AppRole = 'admin' | 'ta'
```
Replace with:
```typescript
// Widened to `string` because role names are now created at runtime through
// the app_roles catalog, not fixed at compile time. 'admin' stays a special
// string used directly in code (AuthContext's isAdmin check, RLS has_role
// calls) — it doesn't need its own literal type for that to keep working.
export type AppRole = string
export type AppRoleCatalogEntry = Database['public']['Tables']['app_roles']['Row']
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: this widening is backward-compatible everywhere `AppRole` was used as a value type, so it should NOT introduce new errors on its own. If it does, report exactly which files/lines and do not fix them yourself — later tasks own those files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): add app_roles catalog type, widen AppRole to string"
```

---

### Task 3: i18n copy for the role catalog

**Files:**
- Modify: `src/locales/th/common.json`
- Modify: `src/locales/en/common.json`

**Interfaces:**
- Produces: `t('adminLayout.roles')`, a new `adminRoles.*` top-level object, and a few new keys inside the existing `adminUsers` object. Tasks 5, 6, 8, 9 use these.

- [ ] **Step 1: Add `roles` inside the existing `adminLayout` object (both files)**

`src/locales/th/common.json`, inside `"adminLayout": { ... }` (which currently has `title`, `dashboard`, `users`, `backToApp`), add:
```json
"roles": "Roles"
```

`src/locales/en/common.json`, same object:
```json
"roles": "Roles"
```

- [ ] **Step 2: Add a new top-level `adminRoles` object (both files)**

`src/locales/th/common.json`, add as a new top-level key (sibling of `adminUsers`):
```json
"adminRoles": {
  "title": "จัดการ Role",
  "subtitle": "ดูรายชื่อ role ทั้งหมด และสร้าง role ใหม่",
  "name": "ชื่อ (name)",
  "namePlaceholder": "เช่น mentor, reviewer",
  "label": "ป้ายชื่อ (label)",
  "labelPlaceholder": "ชื่อที่แสดงในระบบ",
  "description": "คำอธิบาย",
  "descriptionPlaceholder": "ไม่บังคับ",
  "builtin": "Built-in",
  "create": "สร้าง Role",
  "delete": "ลบ",
  "empty": "ยังไม่มี role เสริมในระบบ",
  "loadFailed": "โหลดรายชื่อ role ไม่สำเร็จ",
  "createFailed": "สร้าง role ไม่สำเร็จ ลองใหม่อีกครั้ง",
  "deleteFailed": "ลบ role ไม่สำเร็จ ลองใหม่อีกครั้ง",
  "confirmDelete": "ยืนยันลบ role นี้? (user ที่ถือ role นี้อยู่ต้องถูกถอนก่อน)",
  "invalidName": "ชื่อ role ต้องเป็นตัวพิมพ์เล็ก a-z, 0-9, _ เท่านั้น ความยาว 2-32 ตัวอักษร และขึ้นต้นด้วยตัวอักษร",
  "nameTaken": "มีชื่อ role นี้อยู่แล้ว"
}
```

`src/locales/en/common.json`:
```json
"adminRoles": {
  "title": "Manage Roles",
  "subtitle": "View every role and create new ones",
  "name": "Name",
  "namePlaceholder": "e.g. mentor, reviewer",
  "label": "Label",
  "labelPlaceholder": "Display name",
  "description": "Description",
  "descriptionPlaceholder": "Optional",
  "builtin": "Built-in",
  "create": "Create role",
  "delete": "Delete",
  "empty": "No extra roles yet",
  "loadFailed": "Failed to load roles",
  "createFailed": "Failed to create role, try again",
  "deleteFailed": "Failed to delete role, try again",
  "confirmDelete": "Delete this role? (Anyone holding it must be revoked first)",
  "invalidName": "Role name must be lowercase a-z, 0-9, _ only, 2-32 characters, starting with a letter",
  "nameTaken": "That role name is already taken"
}
```

- [ ] **Step 3: Add new keys inside the existing `adminUsers` object (both files)**

`src/locales/th/common.json`, inside `adminUsers`, add (anywhere among the existing keys — e.g. after `editFailed`, remembering to add a trailing comma to the preceding key's line):
```json
"addRole": "เพิ่ม role",
"confirmRevokeRole": "ยืนยันถอน role นี้จาก user คนนี้?"
```

`src/locales/en/common.json`, same object:
```json
"addRole": "Add role",
"confirmRevokeRole": "Revoke this role from this user?"
```

- [ ] **Step 4: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/th/common.json'))" && echo OK`
Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en/common.json'))" && echo OK`
Expected: both print `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/locales/th/common.json src/locales/en/common.json
git commit -m "feat(i18n): add role catalog copy (Roles page, role chips)"
```

---

### Task 4: `admin.service.ts` — catalog functions, dynamic `getUserStats`

**Files:**
- Modify: `src/features/admin/services/admin.service.ts`

**Interfaces:**
- Consumes: `AppRoleCatalogEntry` (Task 2, add to the existing type import)
- Produces: `listRoles(): Promise<AppRoleCatalogEntry[]>`, `createRole(name, label, description, createdBy): Promise<void>`, `deleteRole(name): Promise<void>`; `UserStats.byRole` changes shape from a fixed union `Record` to `Record<string, number>`; `getUserStats()` becomes catalog-aware. Tasks 5 (`AdminRolesPage`), 8 (`AdminDashboardPage`), 9 (`AdminUsersPage`) all depend on this.

- [ ] **Step 1: Widen `UserStats.byRole` and rewrite `getUserStats`**

Current:
```typescript
export interface UserStats {
  total: number
  byRole: Record<'student' | 'instructor' | 'admin' | 'ta', number>
}
```
```typescript
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
```
Replace both with:
```typescript
export interface UserStats {
  total: number
  // Keys are 'student', 'instructor', plus every role name in the app_roles
  // catalog (including ones with zero holders) — dynamic, not a fixed set,
  // since the catalog can grow at runtime.
  byRole: Record<string, number>
}
```
```typescript
// Count users by every role they hold — primary (profiles.role) plus any
// extra roles from the catalog. A user with both instructor+admin counts
// in both buckets, which is intentional (union access, not exclusive).
// Every catalog role appears in the result even with zero holders, so the
// dashboard can render a card for it.
export async function getUserStats(): Promise<UserStats> {
  const [users, roles] = await Promise.all([listUsers(), listRoles()])

  const byRole: UserStats['byRole'] = { student: 0, instructor: 0 }
  for (const role of roles) {
    byRole[role.name] = 0
  }
  for (const user of users) {
    byRole[user.role] = (byRole[user.role] ?? 0) + 1
    for (const extra of user.extraRoles) {
      byRole[extra] = (byRole[extra] ?? 0) + 1
    }
  }

  return { total: users.length, byRole }
}
```

- [ ] **Step 2: Add `AppRoleCatalogEntry` to the type import**

Change:
```typescript
import type { Profile, AppRole, Course } from '../../../lib/database.types'
```
to:
```typescript
import type { Profile, AppRole, Course, AppRoleCatalogEntry } from '../../../lib/database.types'
```

- [ ] **Step 3: Append the three new catalog functions to the end of the file**

```typescript

// Every role in the catalog (built-in + custom), for the Roles admin page
// and for building the "+ add role" picker in AdminUsersPage.
export async function listRoles(): Promise<AppRoleCatalogEntry[]> {
  const { data, error } = await supabase
    .from('app_roles')
    .select('*')
    .order('is_builtin', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// Create a new custom role. Name uniqueness is enforced by the DB (primary
// key) — a duplicate name surfaces as a thrown error from the .error check.
// New roles are never builtin (is_builtin defaults to false in the DB).
export async function createRole(
  name: string,
  label: string,
  description: string | null,
  createdBy: string
): Promise<void> {
  const { error } = await supabase
    .from('app_roles')
    .insert({ name, label, description, created_by: createdBy })

  if (error) throw new Error(error.message)
}

// Delete a custom role. Builtin roles (admin/ta) are blocked by RLS even if
// this is called on one — the caller (AdminRolesPage) should also disable
// the delete button for builtin rows, this is the second layer.
// Deleting a role still held by any user fails (no ON DELETE cascade on
// user_roles.role by design — see spec §6) with a foreign-key-violation
// error; the caller should surface that as "revoke it from users first".
export async function deleteRole(name: string): Promise<void> {
  const { error } = await supabase
    .from('app_roles')
    .delete()
    .eq('name', name)

  if (error) throw new Error(error.message)
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: `AdminDashboardPage.tsx` will now show errors (it references `stats.byRole.admin`/`stats.byRole.tas` etc. on the old fixed-key shape) — this is expected, Task 8 owns fixing that file. Report exactly which errors appear elsewhere, don't fix them yourself.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/services/admin.service.ts
git commit -m "feat(admin): add listRoles/createRole/deleteRole, make getUserStats catalog-aware"
```

---

### Task 5: `AdminRolesPage`

**Files:**
- Create: `src/features/admin/pages/AdminRolesPage.tsx`

**Interfaces:**
- Consumes: `listRoles`, `createRole`, `deleteRole` (Task 4); `useAuth` (for `user.id` as `createdBy`); `Badge`; `t('adminRoles.*')` (Task 3)
- Produces: `<AdminRolesPage />` default export, wired to `/admin/roles` in Task 6.

- [ ] **Step 1: Write the page**

```tsx
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
    } catch {
      setError(t('adminRoles.deleteFailed'))
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no new errors from this file. `Badge`'s `variant` prop must accept `'yellow'` — it does (confirmed in `src/shared/components/Badge.tsx`'s `BadgeVariant` union, already used elsewhere in this codebase).

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/pages/AdminRolesPage.tsx
git commit -m "feat(admin): add AdminRolesPage (list/create/delete catalog roles)"
```

---

### Task 6: Wire `/admin/roles` — route, sidebar

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/app/layout/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `AdminRolesPage` (Task 5), `t('adminLayout.roles')` (Task 3)

- [ ] **Step 1: `router.tsx` — import and add the route**

Add near the other admin page imports:
```typescript
import AdminRolesPage from '../features/admin/pages/AdminRolesPage'
```

The current admin route block is:
```tsx
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
Add a third page route inside `AdminLayout`'s `children`:
```tsx
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
              {
                path: '/admin/roles',
                element: <AdminRolesPage />,
              },
            ],
          },
        ],
      },
```

- [ ] **Step 2: `AdminSidebar.tsx` — add the nav item**

Add `Shield` (a second icon, distinct from `ShieldCheck` already used for the sidebar header) to the lucide-react import:
```typescript
import { ArrowLeft, LayoutDashboard, Shield, ShieldCheck, Users } from 'lucide-react'
```

Change the `items` array from:
```typescript
  const items = [
    { id: 'dashboard', label: t('adminLayout.dashboard'), to: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'users', label: t('adminLayout.users'), to: '/admin/users', icon: Users },
  ]
```
to:
```typescript
  const items = [
    { id: 'dashboard', label: t('adminLayout.dashboard'), to: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'users', label: t('adminLayout.users'), to: '/admin/users', icon: Users },
    { id: 'roles', label: t('adminLayout.roles'), to: '/admin/roles', icon: Shield },
  ]
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Requires Task 1's SQL run and `vercel dev`. Log in as admin, confirm a third "Roles" item appears in the admin sidebar, clicking it loads `/admin/roles` showing `admin` and `ta` both marked "Built-in" with delete disabled.

- [ ] **Step 5: Commit**

```bash
git add src/app/router.tsx src/app/layout/AdminSidebar.tsx
git commit -m "feat(admin): wire /admin/roles route and sidebar entry"
```

---

### Task 7: `courses.service.ts`, `AuthContext.tsx` — no changes expected, verification only

**Files:**
- None modified — this task is a deliberate checkpoint, not a code change.

**Interfaces:**
- None.

This task exists because Task 2 widened `AppRole` to `string`, which could in principle affect any file that pattern-matches on the old literal union `'admin' | 'ta'` with an exhaustiveness check (a `switch` with no `default`, for instance) — TypeScript would silently stop catching a missing case once the type is `string`. A grep-based check is cheap insurance against that.

- [ ] **Step 1: Search for exhaustive AppRole matching**

Run: `grep -rn "case 'admin'\|case 'ta'" src` — expected: no matches (this codebase doesn't have a switch over `AppRole` anywhere; `isAdmin = roles.includes('admin')` and the `.includes('admin')` calls in `AdminUsersPage.tsx` are simple membership checks, unaffected by the literal-to-string widening).

If this search finds something, STOP and report it — do not silently ignore an unexpected match. If it's genuinely empty as expected, this task has nothing further to do.

- [ ] **Step 2: Commit**

Nothing to commit for this task (verification only) — skip the commit step. Note completion in your report regardless.

---

### Task 8: `AdminDashboardPage` — dynamic role cards

**Files:**
- Modify: `src/features/admin/pages/AdminDashboardPage.tsx` (full file)

**Interfaces:**
- Consumes: `getUserStats` (Task 4, now returns `Record<string, number>` for `byRole`)
- Produces: same default export, cards now generated dynamically per catalog role instead of hardcoded `admin`/`tas` cards.

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

  // 'student'/'instructor' get translated labels since they're the two
  // fixed primary roles. Every other key in byRole is a catalog role name
  // (admin, ta, or any custom role an admin created) — those aren't
  // translatable strings, so the raw name is the label, same as how
  // AdminUsersPage already displays raw role names in its badges.
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
              <div key={card.key} className={cardStyle}>
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

Run: `npx tsc -b --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Requires Task 1's SQL run and `vercel dev`. `/admin/dashboard` shows: Total users, Students, Instructors, then one card each for `admin` and `ta` (and any custom role created via `/admin/roles` during testing, once at least one user holds it — since `getUserStats` always includes every catalog role, even a brand-new custom role with zero holders should show a card with value 0 immediately after creation).

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/pages/AdminDashboardPage.tsx
git commit -m "feat(admin): generate dashboard role cards dynamically from the catalog"
```

---

### Task 9: `AdminUsersPage` — role chips instead of the single admin button

**Files:**
- Modify: `src/features/admin/pages/AdminUsersPage.tsx` (full file)

**Interfaces:**
- Consumes: `listRoles` (Task 4, new); existing `listUsers`/`grantRole`/`revokeRole`/`updateUserProfile`/`setUserActive`/`listAllCourses`/`listAllEnrollments`; `t('adminUsers.addRole')`/`t('adminUsers.confirmRevokeRole')` (Task 3)
- Produces: same default export. The role filter dropdown and the per-row role UI both become catalog-driven instead of hardcoding `admin`/`ta`.

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
    Promise.all([listUsers(), listAllCourses(), listAllEnrollments(), listRoles()])
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
                const isSelf = row.id === user?.id
                const isEditing = editingUserId === row.id
                const availableRoles = roleCatalog.filter((role) => !row.extraRoles.includes(role.name))

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
                            className="h-7 rounded-full border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-500 disabled:opacity-40"
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

Run: `npx tsc -b --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Requires Task 1's SQL run and `vercel dev`.
1. `/admin/users` — a row's "extra roles" cell now shows a chip per held role plus an "add role" dropdown listing catalog roles not yet held
2. Grant a custom role (created via `/admin/roles` first) to a test user via the dropdown — confirm dialog, chip appears
3. Click the chip to revoke it — confirm dialog, chip disappears, back in the dropdown
4. On your OWN row: the `admin` chip (if you hold it) is disabled/unclickable; any other role chip on your own row (if you have one) IS clickable — confirms the narrowed self-guard from the plan
5. Role filter dropdown includes every catalog role, not just admin/ta

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/pages/AdminUsersPage.tsx
git commit -m "feat(admin): replace hardcoded admin toggle with catalog-driven role chips"
```

---

## Post-plan notes

- `adminDashboard.admins`/`adminDashboard.tas` i18n keys (added in the admin-panel-v2 plan) become unused after Task 8 — left in place, not cleaned up (YAGNI; removing unused i18n keys is low-value busywork and it's not costing anything to leave them).
- If the TA-grading idea gets instructor sign-off in the future, that work starts from a fresh brainstorming pass and its own spec — this plan deliberately does not touch Guardrail/grading and nothing here should be treated as groundwork for it beyond the `ta` role name existing in the catalog (which it already did before this plan, from admin-role v1).
