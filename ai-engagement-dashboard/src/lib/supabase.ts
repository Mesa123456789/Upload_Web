import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// ---------------------------------------------------------------------------
// Supabase client — replaces Firebase (firebase.ts still exists during migration)
//
// VITE_SUPABASE_URL   : your project URL, e.g. https://xxxx.supabase.co
// VITE_SUPABASE_ANON_KEY : public anon key (safe to expose in frontend — RLS
//                          policies are your actual security layer)
//
// The Database generic gives full TypeScript inference:
//   supabase.from("profiles") → knows columns, insert shape, etc.
// ---------------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

// Single shared client instance — import this wherever you need Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage so users stay logged in on refresh
    persistSession: true,
    // Automatically refresh the JWT before it expires
    autoRefreshToken: true,
  },
});

// ---------------------------------------------------------------------------
// Auth helpers — thin wrappers so feature files don't import supabase directly
// for auth logic (easier to swap later if needed)
// ---------------------------------------------------------------------------

/** Sign in with Google OAuth. Supabase handles the redirect automatically.
 *  After Google authenticates the user, Supabase will redirect to /auth/callback
 *  which should handle the session and navigate the user to the right page.
 */
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Where to land after Google authenticates — must match Supabase's allowed redirect URLs
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

/** Sign out the current user. */
export const signOut = () => supabase.auth.signOut();

/** Get the currently signed-in user (null if not logged in). */
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};
