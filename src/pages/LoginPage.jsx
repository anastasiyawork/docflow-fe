import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authApi, handleAuthError } from '../api/auth'
import { GITHUB_AUTH_FAILED_CODE, GITHUB_AUTH_FAILED_MESSAGE, INVALID_SESSION_MESSAGE } from '../constants'
import { useAuth } from '../auth/AuthContext'
import { GITHUB_OAUTH_ENDPOINT, LOGIN_PATH, REGISTER_PATH } from '../constants/endpoints'
import { AuthForm } from '../auth/AuthForm'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryError = new URLSearchParams(location.search).get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(
    location.state?.error ?? (queryError === GITHUB_AUTH_FAILED_CODE ? GITHUB_AUTH_FAILED_MESSAGE : null),
  )
  const [fieldErrors, setFieldErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!queryError) return
    navigate(LOGIN_PATH, {
      replace: true,
      state: { ...location.state, error: queryError === GITHUB_AUTH_FAILED_CODE ? GITHUB_AUTH_FAILED_MESSAGE : INVALID_SESSION_MESSAGE },
    })
  }, [location.search, location.state, navigate, queryError])

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
    setSubmitting(true)
    try {
      const response = await authApi.login({ email, password })
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
    <AuthForm
      type="login"
      email={email}
      password={password}
      passwordConfirmation=""
      setEmail={setEmail}
      setPassword={setPassword}
      setPasswordConfirmation={() => {}}
      error={error}
      fieldErrors={fieldErrors}
      submitting={submitting}
      onSubmit={handleSubmit}
      onClearFieldError={clearFieldError}
      githubHref={GITHUB_OAUTH_ENDPOINT}
      switchLink={{
        text: 'No account?',
        label: 'Create one',
        to: REGISTER_PATH,
      }}
    />
  )
}
