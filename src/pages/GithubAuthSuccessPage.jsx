import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { INVALID_SESSION_MESSAGE } from '../constants'
import { useAuth } from '../auth/AuthContext'

export function GithubAuthSuccessPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token || !login({ token })) {
      navigate('/login', {
        replace: true,
        state: { error: INVALID_SESSION_MESSAGE },
      })
      return
    }
    navigate('/', { replace: true })
  }, [login, navigate, searchParams])

  return <div className="auth-page">Signing you in with GitHub...</div>
}
