// ---------------------------------------------------------------------------
// RoleRoute.tsx — Role-based route guard
//
// Why do we need this on top of ProtectedRoute?
//   ProtectedRoute only checks "is the user logged in?"
//   RoleRoute checks "does the logged-in user have the right role?"
//
// Without RoleRoute, a student could manually navigate to
// /instructor/dashboard and see instructor UI (even though RLS would
// block any actual data queries). It's better to redirect early at the
// router level — defense in depth.
//
// Usage in router.tsx:
//   <ProtectedRoute>
//     <RoleRoute allowed={["instructor"]}>
//       <InstructorDashboardPage />
//     </RoleRoute>
//   </ProtectedRoute>
//
// If profile is still loading — show spinner (same as ProtectedRoute).
// If role not allowed — redirect to their correct home page.
// ---------------------------------------------------------------------------

import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../features/auth/context/AuthContext";
import type { Profile } from "../lib/database.types";

interface RoleRouteProps {
  children: ReactNode;
  allowed: Profile["role"][]; // e.g. ["instructor"] or ["student", "admin"]
}

export default function RoleRoute({ children, allowed }: RoleRouteProps) {
  const { profile, loading } = useAuth();

  // Still fetching profile — wait before deciding
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  // Profile loaded — check role
  if (!profile || !allowed.includes(profile.role)) {
    // Redirect to the user's correct home instead of showing an error page
    const home = profile?.role === "instructor" ? "/instructor/dashboard" : "/project/setup";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
