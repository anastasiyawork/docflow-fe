import { FC } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n'

export const NotFoundPage: FC = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('notFound.title')}</h1>
        <p className="auth-subtitle">{t('notFound.message')}</p>
        <p>
          <Link to="/">{t('notFound.home')}</Link>
        </p>
      </div>
    </div>
  )
}
