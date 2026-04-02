import type { Buffer } from 'node:buffer'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { calculateMD5 } from './hash'

/**
 * Cache storage for reading and writing compressed image data.
 *
 * Uses atomic writes (temp file + rename) for concurrent safety.
 * Handles corruption gracefully by returning null on read failures.
 */
export class CacheStorage {
  constructor(private readonly cacheDir: string) {}

  /**
   * Ensure cache directory exists.
   */
  private async ensureDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true, mode: 0o755 })
  }

  /**
   * Get the cache file path for an image.
   *
   * @param imagePath - Absolute path to the source image
   * @returns Path to cache file (MD5 hash as filename, no extension)
   */
  async getCachePath(imagePath: string): Promise<string> {
    const md5Hash = await calculateMD5(imagePath)
    return join(this.cacheDir, md5Hash)
  }

  /**
   * Read cached compressed image data.
   *
   * @param imagePath - Absolute path to the source image
   * @returns Cached Buffer or null if not found/corrupted
   */
  async read(imagePath: string): Promise<Buffer | null> {
    try {
      const cachePath = await this.getCachePath(imagePath)
      const data = await readFile(cachePath)
      return data
    }
    catch {
      // Silent failure on cache miss or corruption
      return null
    }
  }

  /**
   * Write compressed image data to cache.
   *
   * Uses atomic write pattern: temp file + rename.
   *
   * @param imagePath - Absolute path to the source image
   * @param data - Compressed image data to cache
   */
  async write(imagePath: string, data: Buffer): Promise<void> {
    await this.ensureDir()

    const cachePath = await this.getCachePath(imagePath)
    const tmpPath = `${cachePath}.tmp`

    // Atomic write: temp file + rename
    await writeFile(tmpPath, data)
    await rename(tmpPath, cachePath)
  }
}

/**
 * Read cached image data from multiple cache directories in priority order.
 *
 * @param imagePath - Absolute path to the source image
 * @param cacheDirs - Array of cache directories (priority order)
 * @returns First successful Buffer read or null if all miss
 */
export async function readCache(
  imagePath: string,
  cacheDirs: string[],
): Promise<Buffer | null> {
  for (const cacheDir of cacheDirs) {
    const storage = new CacheStorage(cacheDir)
    const data = await storage.read(imagePath)
    if (data !== null) {
      return data
    }
  }

  return null
}

/**
 * Write compressed image data to cache.
 *
 * @param imagePath - Absolute path to the source image
 * @param data - Compressed image data to cache
 * @param cacheDir - Cache directory to write to
 */
export async function writeCache(
  imagePath: string,
  data: Buffer,
  cacheDir: string,
): Promise<void> {
  const storage = new CacheStorage(cacheDir)
  await storage.write(imagePath, data)
}
