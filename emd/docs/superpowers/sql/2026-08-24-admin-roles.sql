-- Admin role & multi-role access
-- Run this ENTIRE script once in the Supabase SQL Editor.
-- Safe to re-run (uses if not exists / drop policy if exists).

create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('admin', 'ta')),
  granted_by  uuid references public.profiles(id),
  granted_at  timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

-- security definer so this can be called from inside RLS policies
-- (including on user_roles itself) without recursive-RLS problems.
create or replace function public.has_role(uid uuid, target_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = target_role
  );
$$;

-- user_roles: everyone can see their own row; admins see everyone's.
drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin"
  on public.user_roles for select
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- user_roles: only admins can grant/change/revoke roles.
drop policy if exists "user_roles_admin_insert" on public.user_roles;
create policy "user_roles_admin_insert"
  on public.user_roles for insert
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "user_roles_admin_update" on public.user_roles;
create policy "user_roles_admin_update"
  on public.user_roles for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "user_roles_admin_delete" on public.user_roles;
create policy "user_roles_admin_delete"
  on public.user_roles for delete
  using (public.has_role(auth.uid(), 'admin'));

-- profiles: additive SELECT policy so admins can list every user.
-- Postgres RLS OR's multiple permissive policies together, so this does
-- NOT remove or narrow whatever SELECT policy already exists on profiles —
-- it only adds one more way to be allowed in.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.has_role(auth.uid(), 'admin'));

-- ══════════════════════════════════════════════════════════════════════
-- Bootstrap: run this LAST, after the block above succeeds.
-- Make yourself the first admin. Get your own uuid from:
-- Supabase Dashboard → Authentication → Users → (your row) → copy "UID".
-- Uncomment, fill in your uuid twice, then run just this statement:
-- ══════════════════════════════════════════════════════════════════════

-- insert into public.user_roles (user_id, role, granted_by)
-- values ('YOUR-UUID-HERE', 'admin', 'YOUR-UUID-HERE');
