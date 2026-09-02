import { FC, SyntheticEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authApi, handleAuthError } from '../api/auth'
import { INVALID_SESSION_MESSAGE } from '../constants'
import { useAuth } from '../auth/AuthContext'
import { LOGIN_PATH } from '../constants/endpoints'
import { AuthForm } from '../auth/AuthForm'
import { t } from '../i18n'

interface LocationState {
  from?: string
}

export const RegisterPage: FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function clearFieldError(field: string): void {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (password !== passwordConfirmation) {
      setFieldErrors({ passwordConfirmation: t('errors.passwordsMismatch') })
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
        setError(INVALID_SESSION_MESSAGE())
        return
      }
      navigate((location.state as LocationState)?.from ?? '/', { replace: true })
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
      type="register"
      email={email}
      password={password}
      passwordConfirmation={passwordConfirmation}
      setEmail={setEmail}
      setPassword={setPassword}
      setPasswordConfirmation={setPasswordConfirmation}
      error={error}
      fieldErrors={fieldErrors}
      submitting={submitting}
      onSubmit={handleSubmit}
      onClearFieldError={clearFieldError}
      switchLink={{
        text: t('auth.register.haveAccount'),
        label: t('auth.register.signIn'),
        to: LOGIN_PATH,
      }}
    />
  )
}
