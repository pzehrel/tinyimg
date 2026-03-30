import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BufferCacheStorage, readCacheByHash, writeCacheByHash } from '../buffer-storage'

// Mock dependencies
vi.mock('node:fs/promises')
vi.mock('../utils/logger')

const { mkdir, readFile, rename, writeFile } = vi.mocked(fs)

describe('bufferCacheStorage', () => {
  let storage: BufferCacheStorage
  const testCacheDir = '/test/cache'

  beforeEach(() => {
    vi.clearAllMocks()
    storage = new BufferCacheStorage(testCacheDir)
  })

  describe('constructor', () => {
    it('creates instance with cache directory', () => {
      expect(storage).toBeInstanceOf(BufferCacheStorage)
    })

    it('stores cache directory path', () => {
      expect(storage.cacheDir).toBe(testCacheDir)
    })
  })

  describe('getCachePath', () => {
    it('returns correct cache file path for hash', () => {
      const hash = 'abc123def456'
      const path = storage.getCachePath(hash)
      expect(path).toBe(`${testCacheDir}/${hash}`)
    })

    it('does not add extension to hash filename', () => {
      const hash = 'xyz789'
      const path = storage.getCachePath(hash)
      expect(path).not.toContain('.tmp')
      expect(path.endsWith(hash)).toBe(true)
    })
  })

  describe('read', () => {
    it('returns cached buffer when file exists', async () => {
      const hash = 'abc123'
      const testBuffer = Buffer.from('test data')

      vi.mocked(readFile).mockResolvedValue(testBuffer)

      const result = await storage.read(hash)

      expect(result).toEqual(testBuffer)
      expect(readFile).toHaveBeenCalledWith(`${testCacheDir}/${hash}`)
    })

    it('returns null when cache file does not exist', async () => {
      const hash = 'nonexistent'

      vi.mocked(readFile).mockRejectedValue(new Error('File not found'))

      const result = await storage.read(hash)

      expect(result).toBeNull()
    })

    it('returns null when cache file is corrupted', async () => {
      const hash = 'corrupted'

      vi.mocked(readFile).mockRejectedValue(new Error('Corrupted data'))

      const result = await storage.read(hash)

      expect(result).toBeNull()
    })

    it('handles read errors gracefully', async () => {
      const hash = 'error'

      vi.mocked(readFile).mockRejectedValue(new Error('Permission denied'))

      const result = await storage.read(hash)

      expect(result).toBeNull()
    })
  })

  describe('write', () => {
    it('writes buffer to cache with atomic write pattern', async () => {
      const hash = 'abc123'
      const testBuffer = Buffer.from('test data')

      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(writeFile).mockResolvedValue(undefined)
      vi.mocked(rename).mockResolvedValue(undefined)

      await storage.write(hash, testBuffer)

      // Verify directory was created
      expect(mkdir).toHaveBeenCalledWith(testCacheDir, { recursive: true, mode: 0o755 })

      // Verify atomic write pattern: temp file first
      expect(writeFile).toHaveBeenCalledWith(`${testCacheDir}/${hash}.tmp`, testBuffer)

      // Verify rename to final path
      expect(rename).toHaveBeenCalledWith(`${testCacheDir}/${hash}.tmp`, `${testCacheDir}/${hash}`)
    })

    it('ensures cache directory exists before writing', async () => {
      const hash = 'xyz789'
      const testBuffer = Buffer.from('data')

      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(writeFile).mockResolvedValue(undefined)
      vi.mocked(rename).mockResolvedValue(undefined)

      await storage.write(hash, testBuffer)

      expect(mkdir).toHaveBeenCalled()
      expect(writeFile).toHaveBeenCalled()
    })

    it('handles write errors', async () => {
      const hash = 'error'
      const testBuffer = Buffer.from('data')

      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(writeFile).mockRejectedValue(new Error('Disk full'))

      await expect(storage.write(hash, testBuffer)).rejects.toThrow('Disk full')
    })

    it('handles rename errors', async () => {
      const hash = 'rename-error'
      const testBuffer = Buffer.from('data')

      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(writeFile).mockResolvedValue(undefined)
      vi.mocked(rename).mockRejectedValue(new Error('Permission denied'))

      await expect(storage.write(hash, testBuffer)).rejects.toThrow('Permission denied')
    })
  })
})

describe('readCacheByHash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns buffer from first cache directory on hit', async () => {
    const hash = 'abc123'
    const testBuffer = Buffer.from('cached data')
    const cacheDirs = ['/cache1', '/cache2', '/cache3']

    vi.mocked(readFile).mockResolvedValue(testBuffer)

    const result = await readCacheByHash(hash, cacheDirs)

    expect(result).toEqual(testBuffer)
    expect(readFile).toHaveBeenCalledTimes(1)
    expect(readFile).toHaveBeenCalledWith(`${cacheDirs[0]}/${hash}`)
  })

  it('tries next cache directory on miss', async () => {
    const hash = 'abc123'
    const testBuffer = Buffer.from('cached data')
    const cacheDirs = ['/cache1', '/cache2', '/cache3']

    // First cache misses, second hits
    vi.mocked(readFile)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce(testBuffer)

    const result = await readCacheByHash(hash, cacheDirs)

    expect(result).toEqual(testBuffer)
    expect(readFile).toHaveBeenCalledTimes(2)
    expect(readFile).toHaveBeenNthCalledWith(1, `${cacheDirs[0]}/${hash}`)
    expect(readFile).toHaveBeenNthCalledWith(2, `${cacheDirs[1]}/${hash}`)
  })

  it('returns null when all cache directories miss', async () => {
    const hash = 'miss'
    const cacheDirs = ['/cache1', '/cache2', '/cache3']

    vi.mocked(readFile).mockRejectedValue(new Error('Not found'))

    const result = await readCacheByHash(hash, cacheDirs)

    expect(result).toBeNull()
    expect(readFile).toHaveBeenCalledTimes(cacheDirs.length)
  })

  it('stops at first successful read', async () => {
    const hash = 'hit'
    const testBuffer = Buffer.from('data')
    const cacheDirs = ['/cache1', '/cache2', '/cache3']

    vi.mocked(readFile).mockResolvedValue(testBuffer)

    const result = await readCacheByHash(hash, cacheDirs)

    expect(result).toEqual(testBuffer)
    // Should only call once, not continue to other directories
    expect(readFile).toHaveBeenCalledTimes(1)
  })
})

describe('writeCacheByHash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes buffer to specified cache directory', async () => {
    const hash = 'abc123'
    const testBuffer = Buffer.from('data to cache')
    const cacheDir = '/cache/write'

    vi.mocked(mkdir).mockResolvedValue(undefined)
    vi.mocked(writeFile).mockResolvedValue(undefined)
    vi.mocked(rename).mockResolvedValue(undefined)

    await writeCacheByHash(hash, testBuffer, cacheDir)

    expect(mkdir).toHaveBeenCalledWith(cacheDir, { recursive: true, mode: 0o755 })
    expect(writeFile).toHaveBeenCalledWith(`${cacheDir}/${hash}.tmp`, testBuffer)
    expect(rename).toHaveBeenCalledWith(`${cacheDir}/${hash}.tmp`, `${cacheDir}/${hash}`)
  })

  it('creates storage instance with correct directory', async () => {
    const hash = 'xyz789'
    const testBuffer = Buffer.from('data')
    const cacheDir = '/custom/cache'

    vi.mocked(mkdir).mockResolvedValue(undefined)
    vi.mocked(writeFile).mockResolvedValue(undefined)
    vi.mocked(rename).mockResolvedValue(undefined)

    await writeCacheByHash(hash, testBuffer, cacheDir)

    expect(mkdir).toHaveBeenCalledWith(cacheDir, { recursive: true, mode: 0o755 })
  })
})
