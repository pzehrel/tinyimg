import { basename as pathBasename } from 'pathe'

/**
 * Format progress counter for batch compression
 * 返回无颜色字符串（颜色由调用方通过 logger 添加）
 */
export function formatProgress(current: number, total: number): string {
  return `Compressing ${current}/${total}...`
}

/**
 * Format compression result with size comparison
 * 返回无颜色字符串（颜色由调用方通过 logger 添加）
 */
export function formatResult(
  inputPath: string,
  _outputPath: string,
  originalSize: number,
  compressedSize: number,
): string {
  const basename = pathBasename(inputPath)
  const savedBytes = originalSize - compressedSize
  const savedPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : '0.0'

  const originalStr = formatBytes(originalSize)
  const compressedStr = formatBytes(compressedSize)

  return `${basename}: ${originalStr} → ${compressedStr} (${savedPercent}% saved)`
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
