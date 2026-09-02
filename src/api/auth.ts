import { GITHUB_EXCHANGE_ENDPOINT, LOGIN_ENDPOINT, REGISTER_ENDPOINT } from '../constants/endpoints'
import { client, unwrap } from './client'

export { onUnauthorized } from './client'
export { ApiRequestError, handleApiError, normalizeFieldErrors } from './errors'
export type { ApiErrorBody, AuthErrorResult } from './errors'

interface AuthRequest { email: string; password: string }
interface RegisterRequest { email: string; password: string; passwordConfirmation: string }
interface AuthResponse { token: string; expiresAt?: number }

export const authApi = {
  register: (payload: RegisterRequest) =>
    unwrap<AuthResponse>((init) => client.POST(REGISTER_ENDPOINT, { ...init, body: payload })),
  login: (payload: AuthRequest) =>
    unwrap<AuthResponse>((init) => client.POST(LOGIN_ENDPOINT, { ...init, body: payload })),
  exchangeGithubCode: (code: string) =>
    unwrap<AuthResponse>((init) => client.POST(GITHUB_EXCHANGE_ENDPOINT, { ...init, body: { code } })),
}
