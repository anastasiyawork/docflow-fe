import createClient from 'openapi-fetch'
import { TOKEN_KEY } from '../constants'
import {
  IDEMPOTENT_METHODS,
  JITTER_FACTOR,
  MAX_RETRIES,
  MAX_RETRY_AFTER_MS,
  REQUEST_TIMEOUT_MS,
  RETRYABLE_STATUSES,
  RETRY_BASE_DELAYS_MS,
} from '../constants/api'
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

export class NetworkError extends Error {
  public readonly cause?: unknown

  constructor(cause?: unknown) {
    super(t('errors.network'))
    this.name = 'NetworkError'
    if (cause !== undefined) this.cause = cause
  }
}

type RequestRunner<T> = (init: { signal: AbortSignal }) => Promise<T>

async function withTimeout<T>(
  runner: RequestRunner<T>,
  options: { timeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
  const controller = new AbortController()
  const timerId = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? REQUEST_TIMEOUT_MS,
  )

  const onExternalAbort = () => controller.abort(options.signal?.reason)
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason)
    } else {
      options.signal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  try {
    return await runner({ signal: controller.signal })
  } finally {
    clearTimeout(timerId)
    options.signal?.removeEventListener('abort', onExternalAbort)
  }
}

async function runWithNormalizedErrors<T>(
  request: RequestRunner<T>,
  options: { timeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
  try {
    return await withTimeout(request, options)
  } catch (err) {
    if (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') {
      if (options.signal?.aborted) {
        throw err
      }
      throw new ApiRequestError(t('errors.requestTimeout'), 408)
    }
    if (err instanceof TypeError) {
      throw new NetworkError(err)
    }
    throw err
  }
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof NetworkError) return true
  if (err instanceof ApiRequestError && RETRYABLE_STATUSES.has(err.status)) return true
  return false
}

function getRetryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS)
  }
  const date = Date.parse(header)
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_AFTER_MS)
  }
  return null
}

function getRetryDelayMs(attempt: number, response?: Response): number {
  if (response) {
    const retryAfterMs = getRetryAfterMs(response)
    if (retryAfterMs !== null) return retryAfterMs
  }
  const base = RETRY_BASE_DELAYS_MS[Math.min(attempt, RETRY_BASE_DELAYS_MS.length - 1)]
  const jitter = 1 + (Math.random() * 2 - 1) * JITTER_FACTOR
  return Math.round(base * jitter)
}

interface FetchResult<TData, TError> {
  data?: TData
  error?: TError
  response: Response
}

export interface UnwrapOptions {
  method: string
  timeoutMs?: number
  signal?: AbortSignal
}

interface RetryContext {
  canRetry: boolean
  lastResponse?: Response
}

async function retryLoop<T>(
  options: UnwrapOptions,
  ctx: RetryContext,
  runAttempt: () => Promise<T>,
): Promise<T> {
  ctx.canRetry = IDEMPOTENT_METHODS.has(options.method.toUpperCase())
  let lastError: unknown = new Error('Unknown error')

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await runAttempt()
    } catch (err) {
      lastError = err
      const shouldRetry = ctx.canRetry && attempt < MAX_RETRIES && isRetryableError(err)
      if (!shouldRetry) throw err
      await new Promise((resolve) => setTimeout(resolve, getRetryDelayMs(attempt, ctx.lastResponse)))
    }
  }

  throw lastError
}

async function unwrap<TData, TError extends ApiErrorBody = ApiErrorBody>(
  request: RequestRunner<FetchResult<TData, TError>>,
  options: UnwrapOptions,
): Promise<TData> {
  const ctx: RetryContext = { canRetry: false }

  return retryLoop(options, ctx, async () => {
    const result = await runWithNormalizedErrors(request, options)
    const { data, error, response } = result
    ctx.lastResponse = response

    if (!response.ok) {
      const apiError = error
      throw new ApiRequestError(
        apiError?.message ?? t('errors.generic'),
        response.status,
        apiError?.details ?? {},
      )
    }

    if (data === undefined) {
      if (response.status >= 500) {
        throw new ApiRequestError(t('errors.serverUnavailable'), response.status)
      }
      throw new ApiRequestError(t('errors.noDataReceived'), response.status)
    }

    return data
  })
}

async function requestVoid<TError extends ApiErrorBody = ApiErrorBody>(
  request: RequestRunner<FetchResult<unknown, TError>>,
  options: UnwrapOptions,
): Promise<void> {
  const ctx: RetryContext = { canRetry: false }

  return retryLoop(options, ctx, async () => {
    const result = await runWithNormalizedErrors(request, options)
    const { error, response } = result
    ctx.lastResponse = response

    if (!response.ok) {
      const apiError = error
      throw new ApiRequestError(
        apiError?.message ?? t('errors.generic'),
        response.status,
        apiError?.details ?? {},
      )
    }
  })
}

export { client, unwrap, requestVoid }
