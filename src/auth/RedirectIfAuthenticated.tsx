import { FC } from 'react'
import { Navigate, Outlet, useLocation, LocationState } from 'react-router-dom'
import { useAuth } from './AuthContext'

export const RedirectIfAuthenticated: FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    const state = location.state as LocationState | undefined
    return <Navigate to={(state as any)?.from ?? '/'} replace />
  }

  return <Outlet />
}
