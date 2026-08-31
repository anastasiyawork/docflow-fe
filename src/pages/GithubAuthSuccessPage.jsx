import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { INVALID_SESSION_MESSAGE } from '../constants'
import { useAuth } from '../auth/AuthContext'
import { authApi, handleAuthError } from '../api/auth'
import { LOGIN_PATH } from '../constants/endpoints'

export function GithubAuthSuccessPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      navigate(LOGIN_PATH, {
        replace: true,
        state: { error: INVALID_SESSION_MESSAGE },
      })
      return
    }

    authApi.exchangeGithubCode(code)
      .then((response) => {
        if (!login(response)) {
          throw new Error('Invalid token')
        }
        navigate('/', { replace: true })
      })
      .catch((error) => {
        const { error: authError } = handleAuthError(error)
        navigate(LOGIN_PATH, {
          replace: true,
          state: { error: authError ?? INVALID_SESSION_MESSAGE },
        })
      })
  }, [login, navigate, searchParams])

  return <div className="auth-page">Signing you in with GitHub...</div>
}
