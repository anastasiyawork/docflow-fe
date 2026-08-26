import createClient from 'openapi-fetch'
import { TOKEN_KEY } from '../constants'
import { LOGIN_ENDPOINT, REGISTER_ENDPOINT } from '../constants/endpoints'

export class ApiRequestError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function normalizeFieldErrors(details) {
  const normalized = /** @type {Record<string, string>} */ ({})
  for (const [field, value] of Object.entries(details ?? {})) {
    normalized[field] = /** @type {string} */ (Array.isArray(value) ? value.join(' ') : value)
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

/**
 * @typedef {import('./schema').paths} ApiPaths
 */
/** @type {import('openapi-fetch').Client<ApiPaths>} */
const client = createClient({ baseUrl: '' })

client.use({
  async onRequest({ request }) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  async onResponse({ request, response }) {
    const pathname = new URL(request.url).pathname
    const isAuthEndpoint = pathname === LOGIN_ENDPOINT || pathname === REGISTER_ENDPOINT
    if (response.status === 401 && !isAuthEndpoint && localStorage.getItem(TOKEN_KEY)) {
      onUnauthorizedListeners.forEach((listener) => listener())
    }
    return response
  },
})

const REQUEST_TIMEOUT_MS = 10_000

function withTimeout(promise) {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return promise({ signal: controller.signal }).finally(() => clearTimeout(timerId))
}

async function unwrap(promise) {
  let result
  try {
    result = await withTimeout(promise)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError('Request timed out. Please try again.', 408)
    }
    throw err
  }

  const { data, error, response } = result

  if (error) {
    const apiError = /** @type {any} */ (error)
    throw new ApiRequestError(
      apiError?.message ?? 'Something went wrong. Please try again.',
      response.status,
      apiError?.details ?? {},
    )
  }

  return data
}

export const authApi = {
  register: (payload) => unwrap((init) => client.POST(REGISTER_ENDPOINT, { ...init, body: payload })),

  login: (payload) => unwrap((init) => client.POST(LOGIN_ENDPOINT, { ...init, body: payload })),
}
