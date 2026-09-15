import { FC, ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n'

interface SwitchLink {
  text: string
  label: string
  to: string
}

interface AuthFormProps {
  type: 'login' | 'register'
  email: string
  password: string
  passwordConfirmation?: string
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  setPasswordConfirmation?: (value: string) => void
  error: string | null
  fieldErrors: Record<string, string>
  submitting: boolean
  onSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => void | Promise<void>
  onClearFieldError: (field: string) => void
  githubHref?: string
  switchLink?: SwitchLink
}

export const AuthForm: FC<AuthFormProps> = ({
  type,
  email,
  password,
  passwordConfirmation,
  setEmail,
  setPassword,
  setPasswordConfirmation,
  error,
  fieldErrors,
  submitting,
  onSubmit,
  onClearFieldError,
  githubHref,
  switchLink,
}) => {
  const isRegister = type === 'register'

  const title = isRegister ? t('auth.register.title') : t('auth.login.title')
  const subtitle = isRegister ? t('auth.register.subtitle') : t('auth.login.subtitle')
  const submitText = isRegister
    ? submitting
      ? t('auth.register.submitting')
      : t('auth.register.submit')
    : submitting
      ? t('auth.login.submitting')
      : t('auth.login.submit')

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <label htmlFor="email">{t('auth.form.email')}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setEmail(event.target.value)
            onClearFieldError('email')
          }}
          placeholder={t('auth.form.emailPlaceholder')}
          autoComplete="email"
          required
        />
        {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}

        <label htmlFor="password">{t('auth.form.password')}</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setPassword(event.target.value)
            onClearFieldError('password')
          }}
          placeholder={isRegister ? t('auth.form.passwordNew') : t('auth.form.passwordPlaceholder')}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? 8 : undefined}
          required
        />
        {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}

        {isRegister && (
          <>
            <label htmlFor="passwordConfirmation">{t('auth.form.passwordConfirm')}</label>
            <input
              id="passwordConfirmation"
              type="password"
              value={passwordConfirmation ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setPasswordConfirmation?.(event.target.value)
                onClearFieldError('passwordConfirmation')
              }}
              placeholder={t('auth.form.passwordConfirmPlaceholder')}
              autoComplete="new-password"
              required
            />
            {fieldErrors.passwordConfirmation && (
              <span className="field-error">{fieldErrors.passwordConfirmation}</span>
            )}
          </>
        )}

        <button type="submit" disabled={submitting}>
          {submitText}
        </button>

        {!isRegister && githubHref && (
          <a className="github-button" href={githubHref}>
            {t('auth.login.signInWithGithub')}
          </a>
        )}

        {switchLink && (
          <p className="auth-switch">
            {switchLink.text}{' '}
            <Link to={switchLink.to}>{switchLink.label}</Link>
          </p>
        )}
      </form>
    </div>
  )
}
