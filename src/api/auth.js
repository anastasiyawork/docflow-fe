import createClient from 'openapi-fetch'
import { TOKEN_KEY } from '../constants'

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
  async onResponse({ response }) {
    if (response.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      onUnauthorizedListeners.forEach((listener) => listener())
    }
    return response
  },
})

async function unwrap(promise) {
  const { data, error, response } = await promise

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
  register: (payload) => unwrap(client.POST('/api/auth/register', { body: payload })),

  login: (payload) => unwrap(client.POST('/api/auth/login', { body: payload })),
}
