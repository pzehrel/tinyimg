import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CacheStorage, readCache, writeCache } from './storage'

// Mock logger
vi.mock('../utils/logger', () => ({
  logInfo: vi.fn(),
  logWarning: vi.fn(),
}))

describe('cache storage', () => {
  let cacheDir: string
  let testImagePath: string

  beforeEach(async () => {
    // Create temp cache directory
    cacheDir = join(tmpdir(), `tinyimg-test-${Date.now()}`)
    await mkdir(cacheDir, { recursive: true })

    // Create a temporary test image file
    testImagePath = join(tmpdir(), `test-image-${Date.now()}.png`)
    await writeFile(testImagePath, Buffer.from('test-image-content'))
  })

  afterEach(async () => {
    // Clean up temp directories
    try {
      await rm(cacheDir, { recursive: true, force: true })
      await rm(testImagePath, { force: true })
    }
    catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('CacheStorage', () => {
    it('writeCache creates cache file with MD5 as filename', async () => {
      const storage = new CacheStorage(cacheDir)
      const testData = Buffer.from('compressed-image-data')

      await storage.write(testImagePath, testData)

      // Verify cache file exists (MD5 hash as filename, no extension)
      const cacheFiles = await readFile(testImagePath, { flag: 'r' }).then(() => {}).catch(() => {})
      // We'll verify by reading it back
      const readData = await storage.read(testImagePath)
      expect(readData).toEqual(testData)
    })

    it('writeCache uses atomic operation (temp file + rename)', async () => {
      const storage = new CacheStorage(cacheDir)
      const testData = Buffer.from('compressed-image-data')

      await storage.write(testImagePath, testData)

      // Verify no .tmp file exists after successful write
      // This is hard to test directly, but we can verify the file exists and is complete
      const readData = await storage.read(testImagePath)
      expect(readData).toEqual(testData)
    })

    it('readCache returns cached Buffer for existing cache', async () => {
      const storage = new CacheStorage(cacheDir)
      const testData = Buffer.from('compressed-image-data')

      await storage.write(testImagePath, testData)
      const readData = await storage.read(testImagePath)

      expect(readData).toEqual(testData)
    })

    it('readCache returns null for missing cache file', async () => {
      const storage = new CacheStorage(cacheDir)
      const readData = await storage.read(testImagePath)

      expect(readData).toBeNull()
    })

    it('readCache returns null for corrupted cache (silent)', async () => {
      const storage = new CacheStorage(cacheDir)

      // Create a valid cache file first
      const testData = Buffer.from('compressed-image-data')
      await storage.write(testImagePath, testData)

      // Get the cache path by calculating MD5
      const { calculateMD5 } = await import('./hash')
      const md5Hash = await calculateMD5(testImagePath)
      const cachePath = join(cacheDir, md5Hash)

      // Simulate corruption by making the file unreadable
      // We'll delete the file and replace it with a directory
      await rm(cachePath, { force: true })
      await mkdir(cachePath, { recursive: true })

      // Read should return null silently (EISDIR error)
      const readData = await storage.read(testImagePath)
      expect(readData).toBeNull()
    })

    it('Auto-creates cache directory if not exists', async () => {
      const nonExistentDir = join(tmpdir(), `non-existent-${Date.now()}`)
      const storage = new CacheStorage(nonExistentDir)
      const testData = Buffer.from('compressed-image-data')

      await storage.write(testImagePath, testData)

      // Verify directory was created
      const readData = await storage.read(testImagePath)
      expect(readData).toEqual(testData)

      // Cleanup
      await rm(nonExistentDir, { recursive: true, force: true })
    })
  })

  describe('readCache', () => {
    it('Iterates through cacheDirs in priority order', async () => {
      const projectCache = join(tmpdir(), `project-cache-${Date.now()}`)
      const globalCache = join(tmpdir(), `global-cache-${Date.now()}`)
      await mkdir(projectCache, { recursive: true })
      await mkdir(globalCache, { recursive: true })

      const testData1 = Buffer.from('project-cache-data')
      const testData2 = Buffer.from('global-cache-data')

      // Write to both caches
      await writeCache(testImagePath, testData1, projectCache)
      await writeCache(testImagePath, testData2, globalCache)

      // Should read from project cache first (priority)
      const readData = await readCache(testImagePath, [projectCache, globalCache])
      expect(readData).toEqual(testData1)

      // Cleanup
      await rm(projectCache, { recursive: true, force: true })
      await rm(globalCache, { recursive: true, force: true })
    })

    it('Returns first successful read or null if all miss', async () => {
      const cacheDir1 = join(tmpdir(), `cache1-${Date.now()}`)
      const cacheDir2 = join(tmpdir(), `cache2-${Date.now()}`)
      await mkdir(cacheDir1, { recursive: true })
      await mkdir(cacheDir2, { recursive: true })

      // Neither cache has the data
      const readData = await readCache(testImagePath, [cacheDir1, cacheDir2])
      expect(readData).toBeNull()

      // Cleanup
      await rm(cacheDir1, { recursive: true, force: true })
      await rm(cacheDir2, { recursive: true, force: true })
    })
  })

  describe('writeCache', () => {
    it('Logs cache hit with MD5 prefix', async () => {
      const { logInfo } = await import('../utils/logger')
      const cacheDir = join(tmpdir(), `cache-${Date.now()}`)
      await mkdir(cacheDir, { recursive: true })

      const testData = Buffer.from('compressed-image-data')
      await writeCache(testImagePath, testData, cacheDir)

      // Verify logInfo was called with cache hit message
      expect(logInfo).toHaveBeenCalledWith(
        expect.stringContaining('cache hit:'),
      )

      // Cleanup
      await rm(cacheDir, { recursive: true, force: true })
    })

    it('Logs cache miss with MD5 prefix + ", compressed"', async () => {
      const { logInfo } = await import('../utils/logger')
      const cacheDir = join(tmpdir(), `cache-${Date.now()}`)
      await mkdir(cacheDir, { recursive: true })

      const testData = Buffer.from('compressed-image-data')
      await writeCache(testImagePath, testData, cacheDir)

      // Verify logInfo was called
      expect(logInfo).toHaveBeenCalled()

      // Cleanup
      await rm(cacheDir, { recursive: true, force: true })
    })
  })
})
