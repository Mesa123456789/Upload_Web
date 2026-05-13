// ---------------------------------------------------------------------------
// router.tsx — Application route definitions
//
// Route structure:
//
//   Public (no auth):
//     /login           → LoginPage
//     /auth/callback   → AuthCallbackPage (handles Google OAuth redirect)
//
//   Student routes (auth required, any role):
//     /project/setup     → Step 1: fill game info (SetupPage)
//     /project/build     → Step 2: configure Ads + IAP (BuildPage)
//     /project/guardrail → Step 3: view AI guardrail result (GuardrailPage)
//     /project/output    → Step 4: summary + export (OutputPage)
//
//   Instructor routes (auth required + role = "instructor"):
//     /instructor/dashboard → overview stats + projects table
//     /instructor/courses   → manage courses
//     /instructor/projects  → view all student projects
//
//   Legacy redirect:
//     /  → redirect based on role (student → /project/setup,
//                                  instructor → /instructor/dashboard)
//
// Guard layers:
//   ProtectedRoute — checks session (logged in?)
//   RoleRoute      — checks profile.role (right role?)
// ---------------------------------------------------------------------------

import { createBrowserRouter, Navigate } from "react-router-dom";

// Auth pages
import LoginPage from "../features/auth/pages/LoginPage";
import AuthCallbackPage from "../features/auth/pages/AuthCallbackPage";

// Student pages
import SetupPage from "../features/project/pages/SetupPage";
import BuildPage from "../features/project/pages/BuildPage";
import GuardrailPage from "../features/project/pages/GuardrailPage";
import OutputPage from "../features/project/pages/OutputPage";

// Instructor pages
import InstructorDashboardPage from "../features/instructor/pages/InstructorDashboardPage";
import InstructorCoursesPage from "../features/instructor/pages/InstructorCoursesPage";
import InstructorProjectsPage from "../features/instructor/pages/InstructorProjectsPage";

// Route guards
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

export const router = createBrowserRouter([
  // -------------------------------------------------------------------------
  // Public routes — accessible without login
  // -------------------------------------------------------------------------
  { path: "/login", element: <LoginPage /> },
  {
    // After Google OAuth, Supabase redirects here.
    // AuthCallbackPage reads the session, then redirects by role.
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },

  // -------------------------------------------------------------------------
  // Root redirect — "/" sends users to their role-specific home
  //
  // Why redirect instead of showing a page?
  //   "/" has no meaning in this app — the real entry points are
  //   /project/setup (student) and /instructor/dashboard (instructor).
  //   Redirecting avoids maintaining a separate home page component.
  //
  // RoleRedirect is a tiny inline component that reads profile.role
  // and navigates. It's inside ProtectedRoute so we know user is logged in.
  // -------------------------------------------------------------------------
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RoleRedirect />
      </ProtectedRoute>
    ),
  },

  // -------------------------------------------------------------------------
  // Student routes — any authenticated user can access
  //   (instructor can also preview student flow if needed)
  // -------------------------------------------------------------------------
  {
    path: "/project/setup",
    element: (
      <ProtectedRoute>
        <SetupPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/project/build",
    element: (
      <ProtectedRoute>
        <BuildPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/project/guardrail",
    element: (
      <ProtectedRoute>
        <GuardrailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/project/output",
    element: (
      <ProtectedRoute>
        <OutputPage />
      </ProtectedRoute>
    ),
  },

  // -------------------------------------------------------------------------
  // Instructor routes — auth + role = "instructor" required
  // -------------------------------------------------------------------------
  {
    path: "/instructor/dashboard",
    element: (
      <ProtectedRoute>
        <RoleRoute allowed={["instructor"]}>
          <InstructorDashboardPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/instructor/courses",
    element: (
      <ProtectedRoute>
        <RoleRoute allowed={["instructor"]}>
          <InstructorCoursesPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/instructor/projects",
    element: (
      <ProtectedRoute>
        <RoleRoute allowed={["instructor"]}>
          <InstructorProjectsPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
]);

// ---------------------------------------------------------------------------
// RoleRedirect — reads profile.role and navigates to the correct home
//
// Placed here (not a separate file) because it's only used for the "/" route
// and is too small to warrant its own file.
// ---------------------------------------------------------------------------

import { useAuth } from "../features/auth/context/AuthContext";

function RoleRedirect() {
  const { profile, loading } = useAuth();

  // Still loading profile — spinner to prevent flicker
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (profile?.role === "instructor") {
    return <Navigate to="/instructor/dashboard" replace />;
  }

  // Default: student (and any unknown role) goes to setup
  return <Navigate to="/project/setup" replace />;
}
