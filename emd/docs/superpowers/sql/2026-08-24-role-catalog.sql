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
