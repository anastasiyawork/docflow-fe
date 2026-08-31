import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/'} replace />
  }

  return <Outlet />
}
