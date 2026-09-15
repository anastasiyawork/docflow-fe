import { t } from '../i18n'

const byteFormatter = new Intl.NumberFormat(undefined, {
  style: 'unit',
  unit: 'byte',
  notation: 'compact',
  unitDisplay: 'narrow',
  maximumFractionDigits: 1,
})

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  return byteFormatter.format(bytes)
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return dateTimeFormatter.format(date)
}

export function statusLabel(status: string): string {
  const key = `documents.status.${status}`
  const translated = t(key)
  return translated === key ? status : translated
}
