import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import { RouteLoadingSkeleton } from '../shared/components/Skeleton'

interface RoleRouteProps {
  // The role required to access child routes
  role: 'student' | 'instructor'
}

// Wraps routes that require a specific role.
// Must be nested inside ProtectedRoute (session already guaranteed).
export default function RoleRoute({ role }: RoleRouteProps) {
  const { profile, loading } = useAuth()

  // Still loading auth state — show spinner, do NOT redirect yet.
  // This prevents a race where session exists but profile hasn't loaded,
  // which would cause an incorrect redirect away from instructor pages.
  if (loading || !profile) {
    return <RouteLoadingSkeleton />
  }

  if (profile.role !== role) {
    // User is authenticated but has a different role — send them home
    const fallback = profile.role === 'instructor' ? '/instructor/dashboard' : '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
