import { FC, useEffect, useState, type SyntheticEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GITHUB_AUTH_FAILED_CODE, GITHUB_AUTH_FAILED_MESSAGE, INVALID_SESSION_MESSAGE } from '../constants'
import { GITHUB_OAUTH_ENDPOINT, LOGIN_PATH, REGISTER_PATH } from '../constants/endpoints'
import { AuthForm } from '../auth/AuthForm'
import { useAuthSubmit } from '../auth/useAuthSubmit'
import { type LocationState } from '../auth/types'
import { t } from '../i18n'

export const LoginPage: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryError = new URLSearchParams(location.search).get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, fieldErrors, submitting, clearFieldError, handleSubmit } = useAuthSubmit('login')

  useEffect(() => {
    if (!queryError) return
    navigate(LOGIN_PATH, {
      replace: true,
      state: {
        ...(location.state as LocationState),
        error:
          queryError === GITHUB_AUTH_FAILED_CODE
            ? GITHUB_AUTH_FAILED_MESSAGE()
            : INVALID_SESSION_MESSAGE(),
      },
    })
  }, [location.search, location.state, navigate, queryError])

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    await handleSubmit(event, { email, password })
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
      onSubmit={onSubmit}
      onClearFieldError={clearFieldError}
      githubHref={GITHUB_OAUTH_ENDPOINT}
      switchLink={{
        text: t('auth.login.noAccount'),
        label: t('auth.login.createOne'),
        to: REGISTER_PATH,
      }}
    />
  )
}
