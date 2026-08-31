import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LOGIN_PATH } from '../constants/endpoints'

export function HomePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate(LOGIN_PATH, { replace: true })
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
