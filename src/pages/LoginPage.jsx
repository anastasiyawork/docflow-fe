import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi, ApiRequestError } from '../api/auth'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)
    try {
      const response = await authApi.login({ email, password })
      login(response)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const normalized = {}
        for (const [field, value] of Object.entries(err.details)) {
          normalized[field] = Array.isArray(value) ? value.join(' ') : value
        }
        setFieldErrors(normalized)
        if (Object.keys(normalized).length === 0) {
          setError(err.message)
        }
      } else {
        setError('Network error. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Sign in</h1>
        <p className="auth-subtitle">Welcome back to DocFlow</p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth-switch">
          No account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  )
}
