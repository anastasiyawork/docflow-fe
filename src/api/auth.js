import createClient from 'openapi-fetch'
import { TOKEN_KEY } from '../constants'
import { GITHUB_EXCHANGE_ENDPOINT, LOGIN_ENDPOINT, REGISTER_ENDPOINT } from '../constants/endpoints'

export class ApiRequestError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function normalizeFieldErrors(details) {
  const normalized = {}
  for (const [field, value] of Object.entries(details ?? {})) {
    normalized[field] = Array.isArray(value) ? value.join(' ') : String(value)
  }
  return normalized
}

const onUnauthorizedListeners = new Set()

export function onUnauthorized(listener) {
  onUnauthorizedListeners.add(listener)
  return () => {
    onUnauthorizedListeners.delete(listener)
  }
}

/** @type {import('openapi-fetch').Client<import('./schema').paths>} */
const client = createClient({ baseUrl: '' })

client.use({
  async onRequest({ request }) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  async onResponse({ request, response }) {
    const pathname = new URL(request.url).pathname
    const isAuthEndpoint = pathname === LOGIN_ENDPOINT || pathname === REGISTER_ENDPOINT || pathname === GITHUB_EXCHANGE_ENDPOINT
    if (response.status === 401 && !isAuthEndpoint && localStorage.getItem(TOKEN_KEY)) {
      onUnauthorizedListeners.forEach((listener) => listener())
    }
    return response
  },
})

const REQUEST_TIMEOUT_MS = 10_000
const MAX_RETRIES = 2

function withTimeout(promise) {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return promise({ signal: controller.signal }).finally(() => clearTimeout(timerId))
}

function isRetryableError(err) {
  if (!err) return false
  if (err instanceof ApiRequestError && err.status === 408) return true
  if (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof TypeError) return true
  if (typeof err?.name === 'string' && (err.name === 'AbortError' || err.name === 'TypeError')) return true
  if (typeof err?.message === 'string') {
    const message = err.message.toLowerCase()
    return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed')
  }
  return false
}

async function unwrap(promise) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      let result
      try {
        result = await withTimeout(promise)
      } catch (err) {
        if (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') {
          throw new ApiRequestError('Request timed out. Please try again.', 408)
        }
        throw err
      }

      const { data, error, response } = result

      if (error) {
        const apiError = error
        throw new ApiRequestError(
          apiError?.message ?? 'Something went wrong. Please try again.',
          response.status,
          apiError?.details ?? {},
        )
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

export const authApi = {
  register: (payload) => unwrap((init) => client.POST(REGISTER_ENDPOINT, { ...init, body: payload })),

  login: (payload) => unwrap((init) => client.POST(LOGIN_ENDPOINT, { ...init, body: payload })),

  exchangeGithubCode: (code) => unwrap((init) => client.POST(GITHUB_EXCHANGE_ENDPOINT, { ...init, body: { code } })),
}
