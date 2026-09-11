import messages from './en.json'

type InterpolationValues = Record<string, string | number>

function interpolate(template: string, values?: InterpolationValues): string {
  if (!values) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

function getMessage(path: string, values?: InterpolationValues): string {
  const keys = path.split('.')
  let value: any = messages

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return path
    }
  }

  return typeof value === 'string' ? interpolate(value, values) : path
}

export const t = getMessage
