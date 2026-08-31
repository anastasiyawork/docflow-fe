import { Link } from 'react-router-dom'

export function AuthForm({
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
  githubHref = undefined,
  switchLink = undefined,
}) {
  const isRegister = type === 'register'

  const title = isRegister ? 'Create account' : 'Sign in'
  const subtitle = isRegister ? 'Start working with your documents' : 'Welcome back to DocFlow'
  const submitText = isRegister ? (submitting ? 'Creating…' : 'Create account') : (submitting ? 'Signing in…' : 'Sign in')

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            onClearFieldError('email')
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
            onClearFieldError('password')
          }}
          placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? 8 : undefined}
          required
        />
        {fieldErrors.password && (
          <span className="field-error">{fieldErrors.password}</span>
        )}

        {isRegister && (
          <>
            <label htmlFor="passwordConfirmation">Confirm password</label>
            <input
              id="passwordConfirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => {
                setPasswordConfirmation(event.target.value)
                onClearFieldError('passwordConfirmation')
              }}
              placeholder="Repeat password"
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
            Sign in with GitHub
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
