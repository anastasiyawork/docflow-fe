import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>DocFlow</h1>
        <button type="button" onClick={handleLogout}>
          Sign out
        </button>
      </header>
      <main>
        <p>You are signed in.</p>
      </main>
    </div>
  )
}
