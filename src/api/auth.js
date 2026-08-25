export class ApiRequestError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

const BASE_URL = '/api'
const TOKEN_KEY = 'docflow_token'

const onUnauthorizedListeners = new Set()

export function onUnauthorized(listener) {
  onUnauthorizedListeners.add(listener)
  return () => onUnauthorizedListeners.delete(listener)
}

async function request(path, { method = 'POST', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorizedListeners.forEach((listener) => listener())
    }
    let message = 'Something went wrong. Please try again.'
    const details = {}
    try {
      const error = await response.json()
      message = error.message ?? message
      Object.assign(details, error.details)
    } catch {
    }
    throw new ApiRequestError(message, response.status, details)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export const authApi = {
  register: (payload) => request('/auth/register', { body: payload }),

  login: (payload) => request('/auth/login', { body: payload }),
}
