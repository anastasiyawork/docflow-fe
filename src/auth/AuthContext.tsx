import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode, FC } from 'react'
import { onUnauthorized } from '../api/auth'
import { TOKEN_KEY } from '../constants'

interface Session {
  token: string
  expiresAt: number
}

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  login: (response: { token: string }) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function getTokenExpiresAt(token: string): number | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded)) as { exp?: unknown }
    if (typeof payload.exp !== 'number') return null
    return payload.exp * 1000
  } catch {
    return null
  }
}

function readStoredSession(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const expiresAt = getTokenExpiresAt(token)
  if (expiresAt === null || Date.now() >= expiresAt) {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
  return { token, expiresAt }
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(readStoredSession)

  useEffect(() => {
    if (!session?.expiresAt) return undefined
    const delay = Math.max(session.expiresAt - Date.now(), 0) + 1000
    const timerId = setTimeout(() => setSession(readStoredSession()), delay)
    return () => clearTimeout(timerId)
  }, [session])

  const login = useCallback((response: { token: string }): boolean => {
    const expiresAt = getTokenExpiresAt(response.token)
    if (expiresAt === null) {
      console.error('JWT has no exp claim')
      return false
    }
    localStorage.setItem(TOKEN_KEY, response.token)
    setSession({ token: response.token, expiresAt })
    return true
  }, [])

  const logout = useCallback((): void => {
    localStorage.removeItem(TOKEN_KEY)
    setSession(null)
  }, [])

  useEffect(() => onUnauthorized(logout), [logout])

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== null && event.key !== TOKEN_KEY) return
      setSession(readStoredSession())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value: AuthContextType = useMemo(
    () => ({
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
