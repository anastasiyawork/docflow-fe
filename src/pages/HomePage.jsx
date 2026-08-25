import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { logout } = useAuth()

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>DocFlow</h1>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>
      <main>
        <p>You are signed in.</p>
      </main>
    </div>
  )
}
