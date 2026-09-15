export interface LocationState {
  error?: string
  from?: string
}

export function getSafeFrom(state: unknown): string {
  const from = (state as LocationState | null)?.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from
  return '/'
}
