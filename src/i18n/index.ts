import messages from './en.json'

function getMessage(path: string): string {
  const keys = path.split('.')
  let value: any = messages

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return path
    }
  }

  return typeof value === 'string' ? value : path
}

export const t = getMessage
