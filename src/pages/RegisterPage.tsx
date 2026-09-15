import { FC, useState, type SyntheticEvent } from 'react'
import { LOGIN_PATH } from '../constants/endpoints'
import { AuthForm } from '../auth/AuthForm'
import { useAuthSubmit } from '../auth/useAuthSubmit'
import { t } from '../i18n'

export const RegisterPage: FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const { error, fieldErrors, submitting, clearFieldError, handleSubmit } = useAuthSubmit('register')

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    await handleSubmit(event, { email, password, passwordConfirmation })
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
      onSubmit={onSubmit}
      onClearFieldError={clearFieldError}
      switchLink={{
        text: t('auth.register.haveAccount'),
        label: t('auth.register.signIn'),
        to: LOGIN_PATH,
      }}
    />
  )
}
