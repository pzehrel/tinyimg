export function formatExtras(tags: (string | undefined)[]): string {
  const filtered = tags.filter((t): t is string => typeof t === 'string')
  return filtered.length ? ` (${filtered.join(', ')})` : ''
}

export function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
