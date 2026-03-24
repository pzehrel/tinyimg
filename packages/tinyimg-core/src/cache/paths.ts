import { join } from 'node:path'
import { homedir } from 'node:os'

/**
 * Get the project-level cache directory path.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @returns Path to project cache directory: `.node_modules/.tinyimg_cache/`
 *
 * @example
 * ```ts
 * const cachePath = getProjectCachePath('/Users/test/project')
 * // Returns: '/Users/test/project/.node_modules/.tinyimg_cache'
 * ```
 */
export function getProjectCachePath(projectRoot: string): string {
  return join(projectRoot, '.node_modules', '.tinyimg_cache')
}

/**
 * Get the global cache directory path.
 *
 * @returns Path to global cache directory: `~/.tinyimg/cache/`
 *
 * @example
 * ```ts
 * const cachePath = getGlobalCachePath()
 * // Returns: '/Users/username/.tinyimg/cache'
 * ```
 */
export function getGlobalCachePath(): string {
  return join(homedir(), '.tinyimg', 'cache')
}
