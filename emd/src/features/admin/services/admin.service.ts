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
