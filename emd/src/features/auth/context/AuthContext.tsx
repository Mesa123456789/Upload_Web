import { createContext, useEffect, useRef, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import type { Profile } from '../../../lib/database.types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  // Expose setProfile so ProfilePage can sync the updated profile into context
  // after a successful save — avoids a full page reload to reflect name changes.
  setProfile: (profile: Profile | null) => void
}

// Export so useAuth.ts can import it directly
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Track the user ID whose profile we last fetched.
  // This ref is shared across re-renders so TOKEN_REFRESHED events for the
  // same user will not trigger a redundant fetchProfile() call.
  const lastFetchedUserIdRef = useRef<string | null>(null)

  async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) return null
      return data
    } catch {
      return null
    }
  }

  useEffect(() => {
    // Track whether this effect instance is still mounted.
    // In React StrictMode, mount→unmount→remount happens intentionally.
    // Using a boolean flag (not a ref) means each effect run gets its own
    // independent flag — cleanup sets its own copy to false, never touching
    // the next run's copy.
    let mounted = true

    // Step 1: getSession() reads directly from localStorage — resolves
    // immediately without waiting for any event dispatch. This is the correct
    // way to hydrate initial auth state in StrictMode because even if the
    // effect runs twice, both runs will resolve independently and correctly.
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (!mounted) return

      // If there's an error (e.g. "Refresh Token Not Found" from a stale
      // session in localStorage), clear the invalid tokens so the user isn't
      // stuck in an infinite spinner.  signOut({ scope: 'local' }) removes
      // only the local storage tokens without hitting the Supabase server.
      if (error) {
        console.warn('[Auth] getSession error — clearing stale session:', error.message)
        await supabase.auth.signOut({ scope: 'local' })
        if (mounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
        return
      }

      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        lastFetchedUserIdRef.current = initialSession.user.id
        const p = await fetchProfile(initialSession.user.id)
        if (mounted) setProfile(p)
      }
      if (mounted) setLoading(false)
    })

    // Step 2: onAuthStateChange handles state changes AFTER initial load.
    // We skip INITIAL_SESSION because getSession() already handled it above.
    // Skipping prevents a double fetchProfile() on first render.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Let getSession() handle the very first snapshot
        if (event === 'INITIAL_SESSION') return
        if (!mounted) return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          // TOKEN_REFRESHED fires every ~60 min when the user is idle on another
          // tab and comes back. The user object is re-created by Supabase but the
          // user ID is the same. Skip fetchProfile() if we already have this
          // user's profile — avoids a spinner flash on tab-switch.
          const incomingId = newSession.user.id
          if (incomingId !== lastFetchedUserIdRef.current) {
            lastFetchedUserIdRef.current = incomingId
            const p = await fetchProfile(incomingId)
            if (mounted) setProfile(p)
          }
          // If userId is the same (TOKEN_REFRESHED), keep the existing profile —
          // do NOT setProfile(null) here which would cause RoleRoute to flash
          // the spinner while we re-fetch an identical row.
        } else {
          // SIGNED_OUT or session expired — clear everything
          lastFetchedUserIdRef.current = null
          setProfile(null)
        }
      }
    )

    return () => {
      // Set this run's flag to false — does not affect the next mount's flag
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

