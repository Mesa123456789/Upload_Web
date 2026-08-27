import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import { RouteLoadingSkeleton } from '../shared/components/Skeleton'
import { isProfileComplete } from '../features/profile/utils/profileCompletion'

// Wraps any route that requires an authenticated session.
// Shows spinner while auth state is loading.
// Redirects to /login if no session is found — with ?deactivated=1 if the
// session was cleared because the account was deactivated, so LoginPage
// can show the right message instead of a generic "please sign in".
// Header is rendered inside PageContainer on each page — not here.
export default function ProtectedRoute() {
  const { session, profile, loading, deactivated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <RouteLoadingSkeleton />
  }

  if (!session) {
    return <Navigate to={deactivated ? '/login?deactivated=1' : '/login'} replace />
  }

  if (!profile) {
    return <RouteLoadingSkeleton />
  }

  if (location.pathname !== '/profile' && !isProfileComplete(profile)) {
    return <Navigate to="/profile" replace state={{ from: location }} />
  }

  return <Outlet />
}
