import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import LoginPage from '../features/auth/pages/LoginPage'
import AuthCallbackPage from '../features/auth/pages/AuthCallbackPage'
import ProtectedRoute from './ProtectedRoute'
import RoleRoute from './RoleRoute'
import StudentDashboardPage from '../features/student/pages/StudentDashboardPage'
import StudentProjectsPage from '../features/student/pages/StudentProjectsPage'
import JoinCoursePage from '../features/student/pages/JoinCoursePage'
import CourseDetailPage from '../features/student/pages/CourseDetailPage'
import SetupPage from '../features/projects/pages/SetupPage'
import BuildPage from '../features/projects/pages/BuildPage'
import GuardrailPage from '../features/projects/pages/GuardrailPage'
import OutputPage from '../features/projects/pages/OutputPage'
import ProfilePage from '../features/profile/pages/ProfilePage'
import InstructorDashboardPage from '../features/instructor/pages/InstructorDashboardPage'
import InstructorCoursesPage from '../features/instructor/pages/InstructorCoursesPage'
import InstructorProjectsPage from '../features/instructor/pages/InstructorProjectsPage'
import InstructorStudentsPage from '../features/instructor/pages/InstructorStudentsPage'
import InstructorProjectDetailPage from '../features/instructor/pages/InstructorProjectDetailPage'
import InstructorStudentProfilePage from '../features/instructor/pages/InstructorStudentProfilePage'
import AdminRoute from './AdminRoute'
import AdminLayout from './layout/AdminLayout'
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage'
import AdminUsersPage from '../features/admin/pages/AdminUsersPage'
import { RouteLoadingSkeleton } from '../shared/components/Skeleton'
import ProjectLayout from '../features/projects/pages/ProjectLayout'

// RoleRedirect — routes user to their role-specific home page.
// ProtectedRoute guarantees a session exists before this renders,
// but profile may still be loading — wait for it before redirecting.
function RoleRedirect() {
  const { profile, loading } = useAuth()

  // Show spinner while profile is still being fetched.
  // Returning null here would leave a blank screen — spinner is friendlier.
  if (loading || !profile) {
    return <RouteLoadingSkeleton />
  }

  if (profile.role === 'instructor') {
    return <Navigate to="/instructor/dashboard" replace />
  }
  return <Navigate to="/dashboard" replace />
}

export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },

  // ── Protected routes (require auth) ────────────────
  {
    element: <ProtectedRoute />,
    children: [

      // Root redirects to role-specific dashboard when authenticated.
      // If not authenticated, ProtectedRoute sends the user to /login.
      {
        path: '/',
        element: <RoleRedirect />,
      },

      // Student routes
      {
        path: '/dashboard',
        element: <StudentDashboardPage />,
      },
      {
        path: '/projects',
        element: <StudentProjectsPage />,
      },
      {
        path: '/join',
        element: <JoinCoursePage />,
      },
      // Course detail — student can view class info, classmates, and leave course
      {
        path: '/course/:courseId',
        element: <CourseDetailPage />,
      },
      // Profile page — accessible by both students and instructors
      {
        path: '/profile',
        element: <ProfilePage />,
      },

      // Project flow — /project/new uses SetupPage with courseId from query
      {
        element: <ProjectLayout />,
        children: [
          {
            path: '/project/new',
            element: <SetupPage />,
          },
          {
            path: '/project/:id/setup',
            element: <SetupPage />,
          },
          {
            path: '/project/:id/build',
            element: <BuildPage />,
          },
          {
            path: '/project/:id/guardrail',
            element: <GuardrailPage />,
          },
          {
            path: '/project/:id/output',
            element: <OutputPage />,
          },

          ],
        },
      // Instructor routes (require instructor role)
      {
        element: <RoleRoute role="instructor" />,
        children: [
          {
            path: '/instructor/dashboard',
            element: <InstructorDashboardPage />,
          },
          {
            path: '/instructor/courses',
            element: <InstructorCoursesPage />,
          },
          {
            path: '/instructor/projects',
            element: <InstructorProjectsPage />,
          },
          {
            path: '/instructor/students',
            element: <InstructorStudentsPage />,
          },
          {
            // Read-only detail view of a single student project
            path: '/instructor/project/:projectId',
            element: <InstructorProjectDetailPage />,
          },
          {
            // Read-only view of a student's profile — accessible by instructor
            path: '/instructor/student/:studentId',
            element: <InstructorStudentProfilePage />,
          },
        ],
      },
      // Admin routes (require the 'admin' extra role — independent of
      // the primary student/instructor role, so instructor+admin users
      // pass both this guard and the instructor RoleRoute above).
      // AdminLayout gives /admin/* its own sidebar, separate from the
      // student/instructor Sidebar used by every other route above.
      {
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                path: '/admin/dashboard',
                element: <AdminDashboardPage />,
              },
              {
                path: '/admin/users',
                element: <AdminUsersPage />,
              },
            ],
          },
        ],
      },
    ],
  },
])
