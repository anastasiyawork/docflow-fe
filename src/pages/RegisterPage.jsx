import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi, handleAuthError } from '../api/auth'
import { INVALID_SESSION_MESSAGE } from '../constants'
import { useAuth } from '../auth/AuthContext'
import { LOGIN_PATH } from '../constants/endpoints'

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [submitting, setSubmitting] = useState(false)

  function clearFieldError(field) {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (password !== passwordConfirmation) {
      setFieldErrors({ passwordConfirmation: 'Passwords do not match' })
      return
    }

    setSubmitting(true)
    try {
      const response = await authApi.register({
        email,
        password,
        passwordConfirmation,
      })
      if (!login(response)) {
        setError(INVALID_SESSION_MESSAGE)
        return
      }
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      const { error: authError, fieldErrors: authFieldErrors } = handleAuthError(err)
      setFieldErrors(authFieldErrors)
      setError(authError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <p className="auth-subtitle">Start working with your documents</p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            clearFieldError('email')
          }}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        {fieldErrors.email && (
          <span className="field-error">{fieldErrors.email}</span>
        )}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearFieldError('password')
          }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {fieldErrors.password && (
          <span className="field-error">{fieldErrors.password}</span>
        )}

        <label htmlFor="passwordConfirmation">Confirm password</label>
        <input
          id="passwordConfirmation"
          type="password"
          value={passwordConfirmation}
          onChange={(event) => {
            setPasswordConfirmation(event.target.value)
            clearFieldError('passwordConfirmation')
          }}
          placeholder="Repeat password"
          autoComplete="new-password"
          required
        />
        {fieldErrors.passwordConfirmation && (
          <span className="field-error">{fieldErrors.passwordConfirmation}</span>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to={LOGIN_PATH}>Sign in</Link>
        </p>
      </form>
    </div>
  )
}
