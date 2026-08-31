import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>404</h1>
        <p className="auth-subtitle">Page not found</p>
        <p>
          <Link to="/">Go home</Link>
        </p>
      </div>
    </div>
  )
}
