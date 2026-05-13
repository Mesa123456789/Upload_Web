import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";
import type { Profile } from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// AuthContext
//
// Provides the current auth state to the entire React tree.
// Any component can call `useAuth()` to get the user + profile without
// prop-drilling.
//
// Why `loading`?
//   On first render, Supabase needs a moment to read the session from
//   localStorage. During that window, `user` is null — which looks the same
//   as "not logged in". Without a loading flag, ProtectedRoute would
//   immediately redirect to /login even for a user who IS logged in,
//   causing a visible flicker or wrong redirect.
//
// Why `profile` (not just `user`)?
//   Supabase Auth's `User` object only holds auth info (email, uid).
//   The `role` field lives in our `profiles` table. We need the profile
//   to do role-based redirects and to render role-specific UI.
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  profile: Profile | null; // full profile row including `role`
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
});

// Fetch the profile row for a given user id — returns null on any error
async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // returns null (not error) if row doesn't exist yet

  if (error) {
    console.error("[AuthContext] fetchProfile error:", error);
    return null;
  }
  return data;
}

// AuthProvider — wrap the entire app with this so every route can read auth state
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Step 1: read the current session immediately (already in localStorage)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // If we have a user, also fetch their profile to get `role`
      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      }

      setLoading(false); // done — safe to render routes now
    });

    // Step 2: subscribe to future auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Re-fetch profile whenever auth state changes (e.g. after login)
      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      } else {
        setProfile(null); // clear profile on logout
      }
      // Don't set loading here — this fires AFTER the initial check above
    });

    // Cleanup: unsubscribe when the provider unmounts (e.g. tests, HMR)
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth — convenience hook so callers don't need to import AuthContext directly
export function useAuth() {
  return useContext(AuthContext);
}
