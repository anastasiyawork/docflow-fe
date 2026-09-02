import createClient from 'openapi-fetch'
import { TOKEN_KEY } from '../constants'
import { GITHUB_EXCHANGE_ENDPOINT, LOGIN_ENDPOINT, REGISTER_ENDPOINT } from '../constants/endpoints'
import { t } from '../i18n'
import type { paths } from './schema'
import { ApiRequestError, type ApiErrorBody } from './errors'

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

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])

async function unwrap<T>(
  promise: (init: RequestInit & { signal: AbortSignal }) => Promise<any>,
  options?: { method?: string },
): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase()
  const canRetry = IDEMPOTENT_METHODS.has(method)
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
        if (response.status >= 500) {
          throw new ApiRequestError(t('errors.serverUnavailable'), response.status)
        }
        throw new ApiRequestError(t('errors.noDataReceived'), response.status)
      }

      return data
    } catch (err) {
      lastError = err
      const shouldRetry = canRetry && attempt < MAX_RETRIES && isRetryableError(err)
      if (!shouldRetry) throw err
    }
  }

  throw lastError
}

export { client, unwrap }
