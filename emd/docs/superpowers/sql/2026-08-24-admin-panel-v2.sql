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
