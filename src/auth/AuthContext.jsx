import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { onUnauthorized } from '../api/auth'
import { TOKEN_KEY } from '../constants'

const AuthContext = createContext(null)

function getTokenExpiresAt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    if (typeof payload.exp !== 'number') return null
    return payload.exp * 1000
  } catch {
    return null
  }
}

function readStoredSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const expiresAt = getTokenExpiresAt(token)
  if (expiresAt === null || Date.now() >= expiresAt) {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
  return { token, expiresAt }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setSession(readStoredSession())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!session?.expiresAt) return undefined
    const delay = Math.max(session.expiresAt - Date.now(), 0) + 1000
    const timerId = setTimeout(() => setSession(readStoredSession()), delay)
    return () => clearTimeout(timerId)
  }, [session])

  const login = useCallback((response) => {
    const expiresAt = getTokenExpiresAt(response.token)
    if (expiresAt === null) {
      console.error('JWT has no exp claim')
      return false
    }
    localStorage.setItem(TOKEN_KEY, response.token)
    setSession({ token: response.token, expiresAt })
    return true
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setSession(null)
  }, [])

  useEffect(() => onUnauthorized(logout), [logout])

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== null && event.key !== TOKEN_KEY) return
      setSession(readStoredSession())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      isLoading,
      login,
      logout,
    }),
    [session, login, logout, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
