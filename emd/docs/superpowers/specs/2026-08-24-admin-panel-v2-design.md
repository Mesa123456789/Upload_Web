# Admin Panel v2 — Dedicated Layout, Deactivate, Edit, Filters — Design Spec

Date: 2026-08-24
Status: Approved by Yuuko, pending implementation plan
Builds on: `docs/superpowers/specs/2026-08-24-admin-role-design.md` (already implemented and merged — `user_roles` table, `AdminRoute`, `AdminDashboardPage`, `AdminUsersPage` with grant/revoke admin all exist)

## 1. Background

v1 of the admin panel works, but it's embedded inside the regular student/instructor `PageContainer`/`Sidebar` — same layout as every other page, just with an extra "Admin" menu item. Yuuko wants the admin panel to feel like its own dedicated tool (referencing another CAMT app's admin UI as a style example — separate sidebar, separate visual identity from the student/instructor app), plus more user-management power than "just grant/revoke admin":

- Its own layout, not sharing `Sidebar.tsx`/`PageContainer.tsx` with the rest of the app
- Filter/search the user table by role, name/email, course, major/year
- Edit a user's profile fields directly from the admin panel
- Deactivate a user (soft — see Non-goals) instead of only grant/revoke-admin

## 2. Non-goals (still true from v1, plus new ones)

- Admin still never sees GDD/project content — no query/route in this feature touches `projects`/`analyses`/`ads_configs`/`iap_configs`.
- **No hard delete of users.** Deleting from `auth.users` requires the Supabase **service role key**, and every FK in this schema (`courses.instructor_id`, `course_enrollments.student_id`, `projects.owner_id`) has no `ON DELETE CASCADE` — a hard delete would either be rejected by Postgres (FK violation) for any user with existing activity, or would need to cascade-delete their projects/courses/grades, destroying academic records. Explicitly rejected. **Deactivate is a soft flag, not a delete.**
- No new Supabase secret is introduced by this spec — deactivate is implemented entirely with the existing anon-key + RLS setup, no service role key needed.
- Not building a generic "admin can edit any table" tool — editing is scoped to the specific `profiles` fields listed in §5.

## 3. Data model changes

Add one column to the existing `profiles` table:

```sql
alter table public.profiles
  add column is_active boolean not null default true;
```

- `true` = normal account (default, so every existing row is unaffected)
- `false` = deactivated — the app must treat this user as blocked from using the product, without deleting anything

No changes to `user_roles` (already correct from v1).

## 4. RLS policy changes

v1 gave admins a `profiles` SELECT-all policy but nothing else. This spec adds:

```sql
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

This is additive (a new permissive UPDATE policy) — it does not touch the existing "profiles: owner can update" policy. An admin can now update any profile row (needed for both deactivate and edit-profile); a non-admin still only updates their own row via the pre-existing policy.

No RLS change needed for `courses`/`course_enrollments` — the course-filter dropdown only needs to **read** course titles, and admins already inherit whatever SELECT access exists today for browsing (confirm during implementation which policy currently allows this; if none does, add an admin-only additive SELECT policy on `courses` following the same pattern as `profiles_select_admin` from v1 — same reasoning: permissive policies OR together, nothing existing is narrowed).

## 5. Deactivate enforcement (the actual "block login" mechanism)

There is no server-side session kill in this stack (no service role key = can't force-expire a Supabase session). Enforcement is **app-level, checked right after auth resolves**, matching how `roles`/`isAdmin` already work:

- `AuthContext` already fetches `profile` on every session. After `fetchProfile` resolves, if `profile.is_active === false`:
  - Immediately call `supabase.auth.signOut()`
  - Set `profile`/`session`/`user`/`roles` back to null/empty (same shape as a normal logged-out state)
  - Expose one new field on the context: `deactivated: boolean` — set `true` right before signing out, so the login page can render a specific message once, then it's irrelevant (next mount starts clean)
- `LoginPage` reads `deactivated` (e.g. via a query param `?deactivated=1` after the forced redirect, matching how `AuthCallbackPage` already redirects) and shows a message: "บัญชีนี้ถูกระงับการใช้งาน ติดต่อผู้ดูแลระบบ" (deactivated account, contact admin) instead of the normal login form's error state.
- This means a deactivated user gets exactly one bounce: they log in successfully at the Supabase Auth level, the app immediately signs them back out and explains why. Acceptable for this scale (small course-based app, not a security boundary — RLS is still the actual boundary: even if the frontend check were bypassed, deactivated ≠ revoked permissions, so this is UX, not access control. **Important:** this spec does NOT attempt to use `is_active` in RLS policies — it stays a pure UX gate. If Yuuko wants deactivation to also block RLS-level data access later, that's a separate follow-up, not scoped here.)

## 6. Dedicated Admin Layout

New file `src/app/layout/AdminLayout.tsx` — a sibling to `PageContainer.tsx`, not a variant of it. Wraps `AdminDashboardPage` and `AdminUsersPage` in `router.tsx` instead of each page individually. Visually distinct from the student/instructor `Sidebar`:

- Own sidebar component `src/app/layout/AdminSidebar.tsx`: nav items are Dashboard, Users (matching the two existing pages — no Events/Clubs/etc., those belong to a different app and are explicitly not in EMD's scope)
- A visible label identifying this as the admin area (e.g. a small "ADMIN PANEL" badge under the logo, similar in spirit to the reference screenshot's "ADMIN PANEL" subtitle — but EMD's own visual language: same color tokens as the rest of the app, not a copy of the reference app's palette)
- A way back to the normal app (e.g. a "กลับหน้าหลัก" / "Back to app" link, since an instructor+admin user still needs to reach their instructor pages — the sidebar's own nav doesn't show instructor/student items, so this link is the escape hatch)
- Reuses existing shared primitives where they fit (`Skeleton`, `Badge`) — does not reuse `Sidebar.tsx`/`PageContainer.tsx` themselves

`router.tsx`'s existing admin route block changes from wrapping each page separately to nesting them under one layout route, e.g.:
```tsx
{
  element: <AdminRoute />,
  children: [
    {
      element: <AdminLayout />,
      children: [
        { path: '/admin/dashboard', element: <AdminDashboardPage /> },
        { path: '/admin/users', element: <AdminUsersPage /> },
      ],
    },
  ],
}
```
`AdminDashboardPage`/`AdminUsersPage` stop rendering their own `<PageContainer>` wrapper (v1 had them do this) — `AdminLayout` now owns the outer chrome, matching how `ProjectLayout` already does this for the Setup/Build/Guardrail/Output flow (existing precedent in this codebase, `src/features/projects/pages/ProjectLayout.tsx`).

## 7. `AdminUsersPage` — filters, edit, deactivate

**Filters** (all client-side over one `listUsers()` fetch — no pagination yet, matches v1's YAGNI call on user-count scale):
- Role: dropdown over `profiles.role` + presence in `extraRoles` (student / instructor / admin / ta / all)
- Search box: substring match on `display_name` or `email`
- Course: dropdown of every course in the system (title), filters to students enrolled via `course_enrollments` — instructors/admins with no enrollment row are excluded when a course filter is active (expected — course membership is a student concept)
- Major, Year: dropdowns sourced from the distinct values present in the fetched user list (no separate lookup table for majors — matches how `profiles.major` is just free text today)

**Edit profile** — inline or modal edit (implementation detail decided during planning, not this spec) for: `display_name`, `major`, `year`, `student_code`, `contact_info`. Uses the new admin UPDATE policy from §4. Does NOT allow editing `email` or `role` (role changes stay in the existing grant/revoke-admin flow from v1 — editing `profiles.role` itself, i.e. changing someone from student to instructor, is explicitly out of scope here, matches v1's decision not to touch `profiles.role`).

**Deactivate** — a toggle per row (Active/Deactivated), guarded the same way v1 guards self-revoke-admin: **an admin cannot deactivate their own account** (identical self-lockout risk to v1 finding #1 — same fix pattern: `disabled` when `row.id === user.id`).

## 8. Testing

- Deactivate: log in as a deactivated user → immediately signed out, sees the "account deactivated" message; their existing projects/courses are untouched in the DB (soft flag only, verify via SQL that no other rows changed)
- Self-deactivate is blocked the same way self-revoke-admin is blocked (button disabled on own row)
- Edit profile: admin edits a student's `major` → change persists, RLS allows it, a non-admin still cannot update someone else's profile (existing "owner can update" policy still enforces that for non-admins)
- Filters: each filter narrows the table correctly in isolation and combined; clearing filters returns the full list
- Layout: `/admin/dashboard` and `/admin/users` render inside `AdminLayout` (own sidebar, no student/instructor sidebar visible); the "back to app" link returns to the user's normal home page
- Regression: v1's grant/revoke-admin flow, union access (instructor+admin), and non-admin redirect-away from `/admin/*` all still work unchanged

## 9. Open items for implementation time

- Exact visual design of `AdminLayout`/`AdminSidebar` (colors, spacing) — follow EMD's existing design tokens (`var(--ds-ink)`, `var(--ds-bg)`, the orange/`#F48E2E` accent used throughout), not the reference screenshot's palette
- Whether edit-profile is a modal or an inline expandable row — implementer's call, follow whichever existing pattern in the codebase is closer (no modal component currently exists in the codebase — check before introducing one; an inline expand may fit better with zero new shared components)
