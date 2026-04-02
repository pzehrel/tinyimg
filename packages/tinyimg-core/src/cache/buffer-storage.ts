import type { Buffer } from 'node:buffer'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Cache storage for reading and writing compressed image data by hash.
 *
 * Uses atomic writes (temp file + rename) for concurrent safety.
 * Handles corruption gracefully by returning null on read failures.
 */
export class BufferCacheStorage {
  constructor(private readonly cacheDir: string) {}

  /**
   * Ensure cache directory exists.
   */
  private async ensureDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true, mode: 0o755 })
  }

  /**
   * Get the cache file path for an image hash.
   *
   * @param hash - MD5 hash of the image buffer
   * @returns Path to cache file (MD5 hash as filename, no extension)
   */
  getCachePath(hash: string): string {
    return join(this.cacheDir, hash)
  }

  /**
   * Read cached compressed image data by hash.
   *
   * @param hash - MD5 hash of the image buffer
   * @returns Cached Buffer or null if not found/corrupted
   */
  async read(hash: string): Promise<Buffer | null> {
    try {
      const cachePath = this.getCachePath(hash)
      const data = await readFile(cachePath)
      return data
    }
    catch {
      // Silent failure on cache miss or corruption
      return null
    }
  }

  /**
   * Write compressed image data to cache by hash.
   *
   * Uses atomic write pattern: temp file + rename.
   *
   * @param hash - MD5 hash of the image buffer
   * @param data - Compressed image data to cache
   */
  async write(hash: string, data: Buffer): Promise<void> {
    await this.ensureDir()

    const cachePath = this.getCachePath(hash)
    const tmpPath = `${cachePath}.tmp`

    // Atomic write: temp file + rename
    await writeFile(tmpPath, data)
    await rename(tmpPath, cachePath)
  }
}

/**
 * Read cached image data from multiple cache directories in priority order.
 *
 * @param hash - MD5 hash of the image buffer
 * @param cacheDirs - Array of cache directories (priority order)
 * @returns First successful Buffer read or null if all miss
 */
export async function readCacheByHash(
  hash: string,
  cacheDirs: string[],
): Promise<Buffer | null> {
  for (const cacheDir of cacheDirs) {
    const storage = new BufferCacheStorage(cacheDir)
    const data = await storage.read(hash)
    if (data !== null) {
      return data
    }
  }

  return null
}

/**
 * Write compressed image data to cache by hash.
 *
 * @param hash - MD5 hash of the image buffer
 * @param data - Compressed image data to cache
 * @param cacheDir - Cache directory to write to
 */
export async function writeCacheByHash(
  hash: string,
  data: Buffer,
  cacheDir: string,
): Promise<void> {
  const storage = new BufferCacheStorage(cacheDir)
  await storage.write(hash, data)
}
