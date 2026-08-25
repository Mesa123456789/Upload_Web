import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import { RouteLoadingSkeleton } from '../shared/components/Skeleton'

// Wraps any route that requires an authenticated session.
// Shows spinner while auth state is loading.
// Redirects to /login if no session is found — with ?deactivated=1 if the
// session was cleared because the account was deactivated, so LoginPage
// can show the right message instead of a generic "please sign in".
// Header is rendered inside PageContainer on each page — not here.
export default function ProtectedRoute() {
  const { session, loading, deactivated } = useAuth()

  if (loading) {
    return <RouteLoadingSkeleton />
  }

  if (!session) {
    return <Navigate to={deactivated ? '/login?deactivated=1' : '/login'} replace />
  }

  return <Outlet />
}
