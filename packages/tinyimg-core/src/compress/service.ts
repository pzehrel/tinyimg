import type { Buffer } from 'node:buffer'
import { KeyPool } from '../keys/pool'
import { calculateMD5FromBuffer } from '../cache/hash'
import { getProjectCachePath, getGlobalCachePath } from '../cache/paths'
import { readCacheByHash, writeCacheByHash } from '../cache/buffer-storage'
import { TinyPngApiCompressor, TinyPngWebCompressor } from './api-compressor'
import { compressWithFallback } from './compose'
import { createConcurrencyLimiter } from './concurrency'
import { logInfo, logWarning } from '../utils/logger'
import type { ICompressor, CompressOptions } from './types'

export interface CompressServiceOptions extends CompressOptions {
  /**
   * Enable cache (default: true)
   */
  cache?: boolean

  /**
   * Use project cache only, ignore global cache (default: false)
   */
  projectCacheOnly?: boolean

  /**
   * Concurrency limit for batch operations (default: 8)
   */
  concurrency?: number

  /**
   * Optional KeyPool instance for testing or advanced usage
   * If not provided, a new KeyPool will be created with 'random' strategy
   */
  keyPool?: KeyPool
}

/**
 * Compress a single image with cache integration and fallback
 *
 * @param buffer - Original image data
 * @param options - Compression options
 * @returns Compressed image data
 */
export async function compressImage(
  buffer: Buffer,
  options: CompressServiceOptions = {},
): Promise<Buffer> {
  const {
    cache = true,
    projectCacheOnly = false,
    mode = 'auto',
    maxRetries = 8,
  } = options

  // Step 1: Calculate MD5 for cache key
  const hash = await calculateMD5FromBuffer(buffer)
  const hashPrefix = hash.substring(0, 8)

  // Step 2: Check cache if enabled
  if (cache) {
    try {
      // Try project cache first
      const projectCachePath = getProjectCachePath(process.cwd())
      const cached = await readCacheByHash(hash, [projectCachePath])
      if (cached) {
        logInfo(`ℹ Cache hit: ${hashPrefix}`)
        return cached
      }

      // Try global cache if not project-only
      if (!projectCacheOnly) {
        const globalCachePath = getGlobalCachePath()
        const globalCached = await readCacheByHash(hash, [globalCachePath])
        if (globalCached) {
          logInfo(`ℹ Cache hit (global): ${hashPrefix}`)
          return globalCached
        }
      }
    }
    catch (error: any) {
      logWarning(`Cache read failed: ${error.message}`)
      // Continue to compression on cache errors
    }
  }

  // Step 3: Compress with fallback
  logInfo(`ℹ Cache miss: ${hashPrefix}, compressing...`)

  const compressed = await compressWithFallback(buffer, {
    mode,
    maxRetries,
    compressors: createCompressors(options),
  })

  // Step 4: Write to project cache if enabled
  if (cache) {
    try {
      const projectCachePath = getProjectCachePath(process.cwd())
      await writeCacheByHash(hash, compressed, projectCachePath)
      logInfo(`ℹ Cached: ${hashPrefix}`)
    }
    catch (error: any) {
      logWarning(`Cache write failed: ${error.message}`)
      // Don't fail compression on cache write errors
    }
  }

  return compressed
}

/**
 * Compress multiple images with concurrency control
 *
 * @param buffers - Array of image buffers
 * @param options - Compression options
 * @returns Array of compressed buffers
 */
export async function compressImages(
  buffers: Buffer[],
  options: CompressServiceOptions = {},
): Promise<Buffer[]> {
  const { concurrency = 8 } = options
  const limit = createConcurrencyLimiter(concurrency)

  const tasks = buffers.map(buffer =>
    limit(() => compressImage(buffer, options)),
  )

  return Promise.all(tasks)
}

/**
 * Create compressor instances based on options
 * Factory function to inject KeyPool for API compressor
 */
function createCompressors(options: CompressServiceOptions): ICompressor[] {
  const { mode = 'auto', maxRetries = 8, keyPool } = options
  const compressors: ICompressor[] = []

  // Create or use provided KeyPool for API compressor
  // Note: This will use keys from env var or config file (from Phase 2)
  const pool = keyPool || new KeyPool('random') // Could be made configurable

  if (mode === 'auto' || mode === 'api') {
    compressors.push(new TinyPngApiCompressor(pool, maxRetries))
  }

  if (mode === 'auto' || mode === 'web') {
    compressors.push(new TinyPngWebCompressor(maxRetries))
  }

  return compressors
}
