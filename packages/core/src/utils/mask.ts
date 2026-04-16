/**
 * Masks a key by replacing its middle characters with `****`.
 *
 * - If the key is 4 characters or shorter, returns `****`.
 * - If the key is 5–8 characters, returns the first 2 and last 2 characters with `****` in between.
 * - If the key is 9 characters or longer, returns the first 4 and last 4 characters with `****` in between.
 */
export function maskKey(key: string): string {
  if (key.length <= 4) {
    return '****'
  }
  if (key.length <= 8) {
    return `${key.slice(0, 2)}****${key.slice(-2)}`
  }
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}
