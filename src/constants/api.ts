export const REQUEST_TIMEOUT_MS = 10_000

export const MAX_RETRIES = 2

export const RETRY_BASE_DELAYS_MS = [300, 900]
export const JITTER_FACTOR = 0.3

export const MAX_RETRY_AFTER_MS = 5_000

export const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504])


export const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])