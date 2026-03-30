import type { DetectOptions } from './types'
import sharp from 'sharp'
import { createConcurrencyLimiter } from '../compress/concurrency'

/**
 * Detect if a PNG file has alpha channel transparency
 *
 * Uses pixel sampling (not just metadata) to avoid false positives.
 * Strategy:
 * 1. Quick reject: non-PNG format -> false
 * 2. Quick reject: no alpha channel in metadata -> false
 * 3. Pixel sampling: downsample to 100x100 and scan for alpha < 255
 *
 * @param filePath - Path to the image file
 * @param _options - Detection options (reserved for future use)
 * @returns Promise<boolean> - true if PNG has transparent pixels, false otherwise
 */
export async function detectAlpha(
  filePath: string,
  _options?: DetectOptions,
): Promise<boolean> {
  // Get metadata first
  const metadata = await sharp(filePath).metadata()

  // Non-PNG: return false (no alpha for non-PNG formats)
  if (metadata.format !== 'png') {
    return false
  }

  // Quick reject: no alpha channel in metadata
  if (!metadata.hasAlpha) {
    return false
  }

  // Pixel sampling: downsample to small size for performance
  // Resize to max 100x100 (fit inside preserves aspect ratio)
  const { data } = await sharp(filePath)
    .resize(100, 100, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Scan alpha channel: every 4th byte starting at index 3
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      return true
    }
  }

  return false
}

/**
 * Detect alpha channel transparency for multiple PNG files
 *
 * @param filePaths - Array of file paths
 * @param options - Detection options including concurrency
 * @returns Promise<Map<string, boolean>> - Map of file paths to transparency results
 */
export async function detectAlphas(
  filePaths: string[],
  options?: DetectOptions,
): Promise<Map<string, boolean>> {
  const { concurrency = 8 } = options ?? {}
  const limit = createConcurrencyLimiter(concurrency)

  const tasks = filePaths.map(path =>
    limit(() => detectAlpha(path, options)),
  )
  const results = await Promise.all(tasks)
  return new Map(filePaths.map((path, i) => [path, results[i]]))
}
