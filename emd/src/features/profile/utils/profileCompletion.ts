import type { Profile } from '../../../lib/database.types'

export function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.display_name?.trim() && profile.major?.trim())
}
