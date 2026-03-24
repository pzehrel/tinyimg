export function logWarning(message: string): void {
  console.warn(`⚠ ${message}`)
}

export function logInfo(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`ℹ ${message}`)
}
