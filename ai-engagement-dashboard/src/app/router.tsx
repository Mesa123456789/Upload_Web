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
//     /project/new             → Step 1: create new project (SetupPage, no projectId yet)
//     /project/:projectId/setup    → Step 1: edit existing project setup
//     /project/:projectId/build    → Step 2: Ads + IAP config
//     /project/:projectId/guardrail → Step 3: AI ethics review
//     /project/:projectId/output   → Step 4: summary + export
//
//   Instructor routes (auth required + role = "instructor"):
//     /instructor/dashboard → overview stats + projects table
//     /instructor/courses   → manage courses
//     /instructor/projects  → view all student projects
//
//   Legacy redirect:
//     /  → redirect based on role (student → /project/new,
//                                  instructor → /instructor/dashboard)
//
// Guard layers:
//   ProtectedRoute — checks session (logged in?)
//   RoleRoute      — checks profile.role (right role?)
//
// Why URL params instead of router state?
//   router.state is lost on page refresh (no persistence).
//   URL params survive refresh — the projectId stays in the URL and the page
//   can re-fetch from Supabase on mount.
// ---------------------------------------------------------------------------

import { createBrowserRouter, Navigate, Outlet, useRouteError } from "react-router-dom";

// ---------------------------------------------------------------------------
// ErrorBoundary — fallback UI when a route throws an unhandled error
// ---------------------------------------------------------------------------
function RouterErrorBoundary() {
  const error = useRouteError() as { status?: number; statusText?: string; message?: string } | undefined;
  const status = error?.status ?? 500;
  const message =
    error?.statusText ?? error?.message ?? "An unexpected error occurred.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="text-center space-y-3 max-w-sm px-4">
        <p className="text-5xl font-bold text-gray-200">{status}</p>
        <p className="text-sm text-gray-500">{message}</p>
        <a
          href="/"
          className="inline-block mt-2 text-sm text-[#9E76B4] hover:underline"
        >
          Go back home
        </a>
      </div>
    </div>
  );
}

// Auth pages
import LoginPage from "../features/auth/pages/LoginPage";
import AuthCallbackPage from "../features/auth/pages/AuthCallbackPage";

// Student pages
import StudentDashboardPage from "../features/student/pages/StudentDashboardPage";
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
  {
    // Root layout route — errorElement here catches errors from all child routes
    element: <Outlet />,
    errorElement: <RouterErrorBoundary />,
    children: [
      // -----------------------------------------------------------------------
      // Public routes
      // -----------------------------------------------------------------------
      { path: "/login", element: <LoginPage /> },
      {
        path: "/auth/callback",
        element: <AuthCallbackPage />,
      },

      // -----------------------------------------------------------------------
      // Root redirect — "/" sends users to their role-specific home
      // -----------------------------------------------------------------------
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        ),
      },

      // -----------------------------------------------------------------------
      // Student dashboard
      // -----------------------------------------------------------------------
      {
        path: "/dashboard",
        element: (
          <ProtectedRoute>
            <StudentDashboardPage />
          </ProtectedRoute>
        ),
      },

      // -----------------------------------------------------------------------
      // Student routes
      // -----------------------------------------------------------------------

      // Step 1 — new project (no projectId yet)
      {
        path: "/project/new",
        element: (
          <ProtectedRoute>
            <SetupPage />
          </ProtectedRoute>
        ),
      },

      // Step 1 — edit existing project setup
      {
        path: "/project/:projectId/setup",
        element: (
          <ProtectedRoute>
            <SetupPage />
          </ProtectedRoute>
        ),
      },

      // Step 2 — Ads + IAP config
      {
        path: "/project/:projectId/build",
        element: (
          <ProtectedRoute>
            <BuildPage />
          </ProtectedRoute>
        ),
      },

      // Step 3 — AI Guardrail review
      {
        path: "/project/:projectId/guardrail",
        element: (
          <ProtectedRoute>
            <GuardrailPage />
          </ProtectedRoute>
        ),
      },

      // Step 4 — Output + export
      {
        path: "/project/:projectId/output",
        element: (
          <ProtectedRoute>
            <OutputPage />
          </ProtectedRoute>
        ),
      },

      // -----------------------------------------------------------------------
      // Instructor routes
      // -----------------------------------------------------------------------
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
    ],
  },
]);

// ---------------------------------------------------------------------------
// RoleRedirect — reads profile.role and navigates to the correct home
// ---------------------------------------------------------------------------

import { useAuth } from "../features/auth/context/AuthContext";

function RoleRedirect() {
  const { profile, loading } = useAuth();

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

  // Default: student (and any unknown role) goes to student dashboard
  return <Navigate to="/dashboard" replace />;
}
