import { supabase } from '../../../lib/supabase'
import type { Profile } from '../../../lib/database.types'

// Fetch a profile by user ID — used for both self-view and instructor reading student profile.
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// Update the current user's own profile fields.
// Only the fields in `updates` are changed — others remain unchanged.
export async function updateProfile(
  userId: string,
  updates: {
    display_name?: string | null
    contact_info?: string | null
    student_code?: string | null
    major?: string | null
    year?: number | null
  }
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
