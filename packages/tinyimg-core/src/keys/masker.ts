export function maskKey(key: string): string {
  if (key.length < 8) {
    return '****'
  }
  const first = key.substring(0, 4)
  const last = key.substring(key.length - 4)
  return `${first}****${last}`
}
