import { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LOGIN_PATH } from '../constants/endpoints'
import { t } from '../i18n'

export const HomePage: FC = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout(): void {
    logout()
    navigate(LOGIN_PATH, { replace: true })
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>{t('home.title')}</h1>
        <button type="button" onClick={handleLogout}>
          {t('home.signOut')}
        </button>
      </header>
      <main>
        <p>{t('home.message')}</p>
      </main>
    </div>
  )
}
