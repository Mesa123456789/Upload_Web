# Role Catalog — Design Spec

Date: 2026-08-24
Status: Approved by Yuuko, pending implementation plan
Builds on: admin-role v1 (`user_roles` table, `AdminRoute`) and admin-panel v2 (dedicated `AdminLayout`) — both already implemented and merged into `Deverlop`.

## 1. Background

`user_roles.role` currently only accepts `'admin'` or `'ta'`, enforced by a Postgres `CHECK` constraint (`docs/superpowers/sql/2026-08-24-admin-roles.sql`). Adding any new extra role today requires editing that SQL and re-running it in Supabase by hand.

Yuuko wants adding a new role to be a UI action (create a role from the admin panel) instead of an SQL edit. **Explicitly out of scope, on hold:** an idea to give a `TA` role real grading/review capability over student projects — this touches the Guardrail/grading system, which per this project's ownership rules belongs to the instructor teammate, not Yuuko. That idea needs the instructor's sign-off before any design work starts on it. This spec does **not** build TA capability — it only makes the *role name* itself creatable via UI, same as `admin`/`ta` already are today.

## 2. Non-goals

- No TA grading/review feature (see above — needs instructor sign-off first, separate future spec).
- Creating a role via the UI does **not** grant it any capability automatically. It only makes the name assignable to users via the existing grant/revoke mechanism. Wiring an actual feature (a route guard, a page, a permission check) to a new role name is still a separate code change, done later, by whoever builds that feature.
- No renaming or editing a role's description after creation (YAGNI — delete and recreate is fine at this scale).
- `admin` must remain structurally protected: the app's code hardcodes `'admin'` in several places (`AuthContext`'s `isAdmin = roles.includes('admin')`, the SQL `has_role(uid, 'admin')` used throughout RLS). Deleting or renaming it via the UI would break the whole admin system — this spec must prevent that.
- `ta` is also protected (built-in) even though it currently has no wired capability, since a future TA spec will likely assume the name `ta` already exists and is stable.
- Admin must still never see GDD/project content — nothing in this feature touches `projects`/`analyses`/`ads_configs`/`iap_configs`.

## 3. Data model

New table `app_roles` — the catalog of assignable extra-role names:

```sql
create table public.app_roles (
  name        text primary key,
  label       text not null,
  description text,
  is_builtin  boolean not null default false,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

insert into public.app_roles (name, label, description, is_builtin) values
  ('admin', 'Admin', 'จัดการ user และ role ทั้งระบบ', true),
  ('ta', 'TA', 'ผู้ช่วยสอน (ยังไม่มีสิทธิ์พิเศษผูกไว้ในระบบ)', true);
```

`user_roles.role` changes from a `CHECK` constraint to a foreign key against this catalog:

```sql
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_fkey foreign key (role) references public.app_roles(name);
```

This is a widening change (FK instead of a fixed literal list) — existing rows (`'admin'`, `'ta'`) already satisfy it once the two builtin rows above are seeded first.

## 4. RLS policies

- `app_roles`:
  - SELECT: admin only (`has_role(auth.uid(), 'admin')`) — this catalog is only consumed by the admin panel today.
  - INSERT: admin only.
  - DELETE: admin only, **and** `using (not is_builtin)` — a second, DB-level guard against deleting `admin`/`ta` that doesn't depend on the frontend disabling the button correctly. This is the same defense-in-depth pattern already used for the self-lockout guards in `AdminUsersPage`.
  - No UPDATE policy — roles aren't editable after creation (non-goal above), so no admin should be able to update `app_roles` rows at all.

## 5. Frontend

**Types** (`database.types.ts`)
- New `app_roles` table type (Row/Insert/Update/Relationships).
- `AppRole` (currently the literal union `'admin' | 'ta'`) widens to `string` — role names are no longer known at compile time since they're created at runtime through the catalog. `isAdmin` (`roles.includes('admin')`) keeps working unchanged since it's a plain string comparison.

**Service** (`admin.service.ts`)
- `listRoles(): Promise<AppRoleCatalogEntry[]>`
- `createRole(name: string, label: string, description: string | null, createdBy: string): Promise<void>` — validates `name` is lowercase `a-z0-9_` only before inserting (matches how role names are used as literal strings elsewhere, keeps them safe to use in URLs/i18n keys later).
- `deleteRole(name: string): Promise<void>` — client-side blocks calling this for a builtin role (button disabled), RLS blocks it at the DB level too if bypassed.

**New page** `AdminRolesPage.tsx` (`src/features/admin/pages/`)
- Table: name, label, description, a "Built-in" badge (non-deletable) vs a delete button for custom roles.
- A small form to add a role: name + label + optional description.

**`AdminUsersPage.tsx` generalization**
- Today: one hardcoded "Grant/Revoke admin" button per row.
- After this change: the role column shows a chip per extra role the user holds (with an "×" to revoke) plus a small "+ add role" control that lists catalog roles the user doesn't already hold.
- Self-lockout guard narrows: only revoking `'admin'` from your own row stays blocked (`row.id === user?.id && role === 'admin'`). Revoking a non-admin extra role from yourself is allowed — it isn't a lockout risk.

**Navigation**
- `AdminSidebar.tsx` gains a third item: "Roles" → `/admin/roles`.
- `router.tsx` adds `/admin/roles` under the existing `AdminLayout`.

## 6. Testing

- Creating a role with a name that already exists fails cleanly (PK violation surfaced as a friendly error).
- Creating a role with an invalid name (uppercase, spaces, symbols) is rejected client-side before hitting the DB.
- Deleting `admin` or `ta` is impossible both via the UI (button disabled) and directly via the API (RLS `using (not is_builtin)` blocks it — verify by attempting the delete call directly, e.g. from browser devtools, and confirming it's rejected).
- Deleting a custom (non-builtin) role works and no longer appears in `AdminUsersPage`'s "+ add role" list; any user who held that role loses it (FK behavior on `user_roles.role` referencing a deleted `app_roles.name` needs an explicit `on delete` clause — default is `NO ACTION`, meaning deleting a role that's still assigned to someone would fail. Decide during implementation: either require revoking from all users first (simplest, safest — matches this project's "no silent data loss" pattern used for the deactivate-vs-delete decision earlier), or cascade-delete the `user_roles` rows. **Recommendation: `NO ACTION` (require revoking first)** — consistent with this project's existing default of never silently removing relationships.
- A user with `admin` + a custom role sees both in the chip list; removing the custom role doesn't affect their admin status.
