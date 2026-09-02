import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from '../constants'
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
