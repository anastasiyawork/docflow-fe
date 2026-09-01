import createClient from 'openapi-fetch'
import type { Client } from 'openapi-fetch'
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, TOKEN_KEY } from '../constants'
import { GITHUB_EXCHANGE_ENDPOINT, LOGIN_ENDPOINT, REGISTER_ENDPOINT } from '../constants/endpoints'
import type { paths } from './schema'
import { t } from '../i18n'


export interface ApiErrorBody {
  message?: string
  details?: Record<string, string | string[]>
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: Record<string, string | string[]> = {},
  ) {
    super(message)
  }
}

export function normalizeFieldErrors(details?: Record<string, string | string[]>): Record<string, string> {
  const normalized: Record<string, string> = {}
  for (const [field, value] of Object.entries(details ?? {})) {
    normalized[field] = Array.isArray(value) ? value.join(' ') : String(value)
  }
  return normalized
}

export interface AuthErrorResult {
  fieldErrors: Record<string, string>
  error: string | null
}

export function handleAuthError(err: unknown): AuthErrorResult {
  if (err instanceof ApiRequestError) {
    const fieldErrors = normalizeFieldErrors(err.details)
    return {
      fieldErrors,
      error: Object.keys(fieldErrors).length === 0 ? err.message : null,
    }
  }

  if (err instanceof TypeError) {
    return {
      fieldErrors: {},
      error: typeof NETWORK_ERROR_MESSAGE === 'function' ? NETWORK_ERROR_MESSAGE() : NETWORK_ERROR_MESSAGE,
    }
  }

  return {
    fieldErrors: {},
    error: typeof GENERIC_ERROR_MESSAGE === 'function' ? GENERIC_ERROR_MESSAGE() : GENERIC_ERROR_MESSAGE,
  }
}

type UnauthorizedListener = () => void

const onUnauthorizedListeners = new Set<UnauthorizedListener>()

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  onUnauthorizedListeners.add(listener)
  return () => {
    onUnauthorizedListeners.delete(listener)
  }
}

const client = createClient<paths>({ baseUrl: '' })

client.use({
  async onRequest({ request }) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  async onResponse({ request, response }) {
    const pathname = new URL(request.url).pathname
    const isAuthEndpoint =
      pathname === LOGIN_ENDPOINT || pathname === REGISTER_ENDPOINT || pathname === GITHUB_EXCHANGE_ENDPOINT
    if (response.status === 401 && !isAuthEndpoint && localStorage.getItem(TOKEN_KEY)) {
      onUnauthorizedListeners.forEach((listener) => listener())
    }
    return response
  },
})

const REQUEST_TIMEOUT_MS = 10_000
const MAX_RETRIES = 2

function withTimeout<T>(promise: (init: RequestInit & { signal: AbortSignal }) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return promise({ signal: controller.signal }).finally(() => clearTimeout(timerId))
}

function isRetryableError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ApiRequestError && err.status === 408) return true
  if (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof TypeError) return true
  if (typeof err === 'object' && err !== null) {
    const errObj = err as Record<string, unknown>
    if (typeof errObj.name === 'string' && (errObj.name === 'AbortError' || errObj.name === 'TypeError')) return true
    if (typeof errObj.message === 'string') {
      const message = (errObj.message as string).toLowerCase()
      return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed')
    }
  }
  return false
}

async function unwrap<T>(
  promise: (init: RequestInit & { signal: AbortSignal }) => Promise<any>,
): Promise<T> {
  let lastError: unknown = new Error('Unknown error')

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      let result
      try {
        result = await withTimeout(promise)
      } catch (err) {
        if (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') {
          throw new ApiRequestError(t('errors.requestTimeout'), 408)
        }
        throw err
      }

      const { data, error, response } = result as {
        data?: T
        error?: ApiErrorBody
        response: Response
      }

      if (error) {
        const apiError = error
        throw new ApiRequestError(
          apiError?.message ?? t('errors.generic'),
          response.status,
          apiError?.details ?? {},
        )
      }

      if (!data) {
        throw new ApiRequestError(t('errors.noDataReceived'), response.status)
      }

      return data
    } catch (err) {
      lastError = err
      const shouldRetry = attempt < MAX_RETRIES && isRetryableError(err)
      if (!shouldRetry) throw err
    }
  }

  throw lastError
}

interface AuthRequest {
  email: string
  password: string
}

interface RegisterRequest {
  email: string
  password: string
  passwordConfirmation: string
}

interface AuthResponse {
  token: string
  expiresAt?: number
}

interface GithubCodeRequest {
  code: string
}

export const authApi = {
  register: (payload: RegisterRequest) =>
    unwrap<AuthResponse>((init) => client.POST(REGISTER_ENDPOINT, { ...init, body: payload })),

  login: (payload: AuthRequest) =>
    unwrap<AuthResponse>((init) => client.POST(LOGIN_ENDPOINT, { ...init, body: payload })),

  exchangeGithubCode: (code: string) =>
    unwrap<AuthResponse>((init) => client.POST(GITHUB_EXCHANGE_ENDPOINT, { ...init, body: { code } })),
}
