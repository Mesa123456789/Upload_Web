import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import Spinner from '../shared/components/Spinner'

// Wraps any route that requires an authenticated session.
// Shows spinner while auth state is loading.
// Redirects to /login if no session is found.
// Header is rendered inside PageContainer on each page — not here.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
