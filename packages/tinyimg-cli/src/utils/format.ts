import path from 'node:path'
import kleur from 'kleur'

/**
 * Format progress counter for batch compression
 */
export function formatProgress(current: number, total: number): string {
  return kleur.cyan(`Compressing ${current}/${total}...`)
}

/**
 * Format compression result with size comparison
 */
export function formatResult(
  inputPath: string,
  outputPath: string,
  originalSize: number,
  compressedSize: number,
): string {
  const basename = path.basename(inputPath)
  const savedBytes = originalSize - compressedSize
  const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1)

  const originalStr = formatBytes(originalSize)
  const compressedStr = formatBytes(compressedSize)

  return kleur.green('✓') + ' ' + kleur.yellow(`${basename}: ${originalStr} → ${compressedStr} (${savedPercent}% saved)`)
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)}KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}
