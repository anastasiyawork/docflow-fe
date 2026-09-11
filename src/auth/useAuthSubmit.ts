import { useCallback, useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, handleApiError } from '../api/auth'
import { INVALID_SESSION_MESSAGE } from '../constants'
import { useAuth } from './AuthContext'
import { getSafeFrom } from './types'
import { t } from '../i18n'

interface AuthSubmitInput {
  email: string
  password: string
  passwordConfirmation?: string
}

export function useAuthSubmit(type: 'login' | 'register') {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const clearFieldError = useCallback((field: string): void => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleSubmit = useCallback(
    async (event: SyntheticEvent<HTMLFormElement>, input: AuthSubmitInput): Promise<void> => {
      event.preventDefault()
      setError(null)
      setFieldErrors({})

      if (type === 'register' && input.password !== input.passwordConfirmation) {
        setFieldErrors({ passwordConfirmation: t('errors.passwordsMismatch') })
        return
      }

      setSubmitting(true)
      try {
        const response =
          type === 'register'
            ? await authApi.register({
                email: input.email,
                password: input.password,
                passwordConfirmation: input.passwordConfirmation ?? '',
              })
            : await authApi.login({ email: input.email, password: input.password })

        if (!login(response)) {
          setError(INVALID_SESSION_MESSAGE())
          return
        }
        navigate(getSafeFrom(window.history.state?.usr), { replace: true })
      } catch (err) {
        const { error: apiError, fieldErrors: apiFieldErrors } = handleApiError(err)
        setFieldErrors(apiFieldErrors)
        setError(apiError)
      } finally {
        setSubmitting(false)
      }
    },
    [type, login, navigate],
  )

  return { error, fieldErrors, submitting, clearFieldError, handleSubmit }
}
