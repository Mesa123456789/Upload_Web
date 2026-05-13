import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../features/auth/context/AuthContext";

// ---------------------------------------------------------------------------
// ProtectedRoute
//
// A wrapper that guards any route requiring authentication.
//
// Three states:
//   1. loading=true  → still checking session — show nothing (avoids flicker)
//   2. user is null  → not logged in → redirect to /login
//   3. user exists   → render the protected page normally
//
// Usage in router.tsx:
//   { path: "/", element: <ProtectedRoute><UploadPage /></ProtectedRoute> }
// ---------------------------------------------------------------------------

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // While Supabase reads session from localStorage, render nothing.
  // This prevents the brief flash of /login for already-authenticated users.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  // No session — send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Session confirmed — render the actual page
  return <>{children}</>;
}
