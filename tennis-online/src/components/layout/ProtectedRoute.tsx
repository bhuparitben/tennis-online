import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  role?: 'admin' | 'ambassador'
}

export default function ProtectedRoute({ role }: Props) {
  const { isAuthenticated, checking, user } = useAuth()

  // The very first render can't yet know whether the session cookie is
  // valid — /auth/me is still in flight. Render nothing rather than bounce
  // to /login and immediately back, which would flash the login page on
  // every reload even for a signed-in user.
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role && user?.role !== role) return <Navigate to="/login" replace />

  return <Outlet />
}
