import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '../components/ui/Feedback'
import { useAuth } from '../context/AuthContext'
import { ROLE_HOME } from '../utils/format'

/**
 * Client-side route guard for UX only. Real authorisation is enforced by the backend
 * on every API call (role permissions + object-level querysets).
 */
export function ProtectedRoute({ roles }) {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />
  return <Outlet />
}

/** Login/register pages: redirect already-authenticated users to their dashboard. */
export function GuestRoute() {
  const { user, initializing } = useAuth()
  if (initializing) return <PageLoader />
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />
  return <Outlet />
}
