import { FC, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { INVALID_SESSION_MESSAGE } from '../constants'
import { useAuth } from '../auth/AuthContext'
import { authApi, handleApiError } from '../api/auth'
import { LOGIN_PATH } from '../constants/endpoints'
import { type LocationState } from '../auth/types'
import { t } from '../i18n'

export const GithubAuthSuccessPage: FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      navigate(LOGIN_PATH, {
        replace: true,
        state: { error: INVALID_SESSION_MESSAGE() } satisfies LocationState,
      })
      return
    }

    authApi
      .exchangeGithubCode(code)
      .then((response) => {
        if (!login(response)) {
          throw new Error('Invalid token')
        }
        navigate('/', { replace: true })
      })
      .catch((error) => {
        const { error: authError } = handleApiError(error)
        navigate(LOGIN_PATH, {
          replace: true,
          state: { error: authError ?? INVALID_SESSION_MESSAGE() } satisfies LocationState,
        })
      })
  }, [login, navigate, searchParams])

  return <div className="auth-page">{t('github.signingIn')}</div>
}
