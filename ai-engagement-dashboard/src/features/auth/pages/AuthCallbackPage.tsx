import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

// ---------------------------------------------------------------------------
// AuthCallbackPage — handles the redirect from Google after OAuth
//
// Flow:
//   Google → Supabase → redirectTo (this page)
//   Supabase automatically extracts the session from the URL hash/query params
//   We fetch the profile to get `role`, then redirect to the correct home:
//     instructor → /instructor/dashboard
//     student (or unknown) → /project/setup
// ---------------------------------------------------------------------------

// Resolve the home path based on profile role
function getHomeByRole(role: string | undefined | null): string {
  if (role === "instructor") return "/instructor/dashboard";
  return "/project/new"; // default for student and any unknown role
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state change — fires once Supabase parses the callback URL
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Fetch profile to get role — needed for redirect decision
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle() as { data: { role?: string } | null; error: unknown };

          const home = getHomeByRole(profile?.role);
          navigate(home, { replace: true });
        } else if (event === "SIGNED_OUT" || !session) {
          // Something went wrong, send back to login
          navigate("/login", { replace: true });
        }
      }
    );

    // Cleanup listener when component unmounts
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Signing you in...</p>
      </div>
    </div>
  );
}
