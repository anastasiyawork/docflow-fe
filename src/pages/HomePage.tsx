import { FC } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { t } from '../i18n'
import { DOCUMENTS_PATH } from '../constants/endpoints'

export const HomePage: FC = () => {
  const { logout } = useAuth()

  function handleLogout(): void {
    logout()
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
        <Link to={DOCUMENTS_PATH} className="home-documents-link">
          {t('home.documents')}
        </Link>
      </main>
    </div>
  )
}
