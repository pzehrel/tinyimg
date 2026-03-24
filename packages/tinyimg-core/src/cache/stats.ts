import { readdir, stat } from 'node:fs/promises'
import { getGlobalCachePath, getProjectCachePath } from './paths'

/**
 * Cache statistics interface.
 */
export interface CacheStats {
  count: number
  size: number
}

/**
 * Format bytes to human-readable format.
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.23 MB", "456 KB")
 *
 * @example
 * ```ts
 * formatBytes(0) // "0 B"
 * formatBytes(512) // "512 B"
 * formatBytes(1024) // "1.00 KB"
 * formatBytes(1024 * 1024) // "1.00 MB"
 * formatBytes(1024 * 1024 * 1024) // "1.00 GB"
 * ```
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Get cache statistics for a directory.
 *
 * @param cacheDir - Cache directory path
 * @returns Cache statistics (count and size)
 *
 * @example
 * ```ts
 * const stats = await getCacheStats('/path/to/cache')
 * console.log(`Files: ${stats.count}, Size: ${formatBytes(stats.size)}`)
 * ```
 */
export async function getCacheStats(cacheDir: string): Promise<CacheStats> {
  try {
    const files = await readdir(cacheDir)

    let count = 0
    let size = 0

    for (const file of files) {
      const filePath = `${cacheDir}/${file}`
      const stats = await stat(filePath)

      if (stats.isFile()) {
        count++
        size += stats.size
      }
    }

    return { count, size }
  }
  catch {
    // Directory doesn't exist or is not accessible
    return { count: 0, size: 0 }
  }
}

/**
 * Get cache statistics for both project and global cache.
 *
 * @param projectRoot - Optional project root directory
 * @returns Object with project and global cache statistics
 *
 * @example
 * ```ts
 * // Get both project and global stats
 * const stats = await getAllCacheStats('/project/path')
 * console.log(`Project: ${stats.project?.count}, Global: ${stats.global.count}`)
 *
 * // Get only global stats
 * const globalOnly = await getAllCacheStats()
 * console.log(`Global: ${globalOnly.global.count}`)
 * ```
 */
export async function getAllCacheStats(projectRoot?: string): Promise<{
  project: CacheStats | null
  global: CacheStats
}> {
  const global = await getCacheStats(getGlobalCachePath())

  let project: CacheStats | null = null
  if (projectRoot) {
    project = await getCacheStats(getProjectCachePath(projectRoot))
  }

  return { project, global }
}
