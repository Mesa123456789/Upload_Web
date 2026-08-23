-- Follow-up: verify the admin-roles migration landed correctly,
-- then grant the first real admin by email.
-- Run each numbered block separately (copy one block at a time),
-- read the result before moving to the next.

-- ══════════════════════════════════════════════════════════════════════
-- 1) Make sure the (user_id, role) unique constraint exists.
--    Safe to run even if it's already there — it either creates it or
--    errors with "already exists", which just means you're fine, skip it.
-- ══════════════════════════════════════════════════════════════════════
alter table public.user_roles
  add constraint user_roles_user_id_role_key unique (user_id, role);

-- ══════════════════════════════════════════════════════════════════════
-- 2) Check what functions/policies actually exist right now.
--    Run this, paste the result back to Claude — that's how we'll know
--    if anything is missing or if there's old/unused leftovers to drop.
-- ══════════════════════════════════════════════════════════════════════
select proname as function_name
from pg_proc
where proname = 'has_role';

select tablename, policyname, cmd
from pg_policies
where tablename in ('user_roles', 'profiles')
order by tablename, policyname;

select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname = 'user_roles';

-- ══════════════════════════════════════════════════════════════════════
-- 3) Grant admin to nattapat23r@gmail.com.
--    Looks up the profile by email — no need to hunt for a uuid manually.
--    Requires step 1's unique constraint (uses ON CONFLICT).
--    If it inserts 0 rows, that email has no matching row in `profiles`
--    yet (they haven't signed up / logged in once) — sign in with that
--    account first, then re-run this block.
-- ══════════════════════════════════════════════════════════════════════
insert into public.user_roles (user_id, role, granted_by)
select id, 'admin', id
from public.profiles
where email = 'nattapat23r@gmail.com'
on conflict (user_id, role) do nothing;

-- ══════════════════════════════════════════════════════════════════════
-- 4) Verify the grant took.
-- ══════════════════════════════════════════════════════════════════════
select p.email, p.display_name, ur.role, ur.granted_at
from public.user_roles ur
join public.profiles p on p.id = ur.user_id
where p.email = 'nattapat23r@gmail.com';
