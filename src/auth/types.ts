/** Состояние, передаваемое через navigation state между auth-страницами */
export interface LocationState {
  error?: string
  from?: string
}

/**
 * Безопасное извлечение пути возврата из navigation state.
 * Разрешаем только внутренние пути: строка, начинающаяся с '/',
 * но не с '//' (протокол-относительный URL ведёт на чужой домен).
 */
export function getSafeFrom(state: unknown): string {
  const from = (state as LocationState | null)?.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from
  return '/'
}
