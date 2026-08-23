import { supabase } from '../../../lib/supabase'
import type { Profile, AppRole, Course, AppRoleCatalogEntry } from '../../../lib/database.types'

export interface UserStats {
  total: number
  // Keys are 'student', 'instructor', plus every role name in the app_roles
  // catalog (including ones with zero holders) — dynamic, not a fixed set,
  // since the catalog can grow at runtime.
  byRole: Record<string, number>
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
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Update affected no rows (RLS or missing user)')
}

// Activate or deactivate a user's account. Soft flag only — never deletes
// or touches auth.users. Enforcement of what "deactivated" means happens
// client-side in AuthContext, not here.
export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Update affected no rows (RLS or missing user)')
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
