import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import { RouteLoadingSkeleton } from '../shared/components/Skeleton'

// Wraps routes that require the 'admin' extra role.
// Must be nested inside ProtectedRoute (session already guaranteed).
//
// This is intentionally a SEPARATE guard from RoleRoute, not a replacement:
// RoleRoute checks the single primary profile.role (student/instructor).
// AdminRoute checks membership in the roles array. A user can hold both
// admin AND their primary role at once, so nesting both guards over the
// respective route trees gives union access naturally — no extra logic
// needed for the "instructor + admin sees both" requirement.
export default function AdminRoute() {
  const { profile, isAdmin, loading } = useAuth()

  // Still loading auth state — show spinner, do NOT redirect yet.
  if (loading || !profile) {
    return <RouteLoadingSkeleton />
  }

  if (!isAdmin) {
    const fallback = profile.role === 'instructor' ? '/instructor/dashboard' : '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
