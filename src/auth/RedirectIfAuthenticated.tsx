import { FC } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { getSafeFrom } from './types'

export const RedirectIfAuthenticated: FC = () => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (isAuthenticated) {
    return <Navigate to={getSafeFrom(location.state)} replace />
  }

  return <Outlet />
}
