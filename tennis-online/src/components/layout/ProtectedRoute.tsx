import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  role?: 'admin' | 'ambassador'
}

export default function ProtectedRoute({ role }: Props) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role && user?.role !== role) return <Navigate to="/login" replace />

  return <Outlet />
}
