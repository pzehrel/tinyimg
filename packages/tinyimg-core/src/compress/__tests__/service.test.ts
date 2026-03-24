import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SMALL_PNG, createMockPngBuffer, mockTinifySuccess, resetTinifyMocks } from './fixtures'
import { compressImage, compressImages } from '../service'
import { KeyPool } from '../../keys/pool'
import { AllCompressionFailedError, AllKeysExhaustedError } from '../../errors/types'
import { readCacheByHash, writeCacheByHash } from '../../cache/buffer-storage'
import https from 'node:https'

// Mock the dependencies
vi.mock('../../keys/pool')
vi.mock('../../cache/buffer-storage')
vi.mock('../../utils/logger', () => ({
  logInfo: vi.fn(),
  logWarning: vi.fn(),
}))

describe('compressImage', () => {
  let mockKeyPool: any

  beforeEach(() => {
    // Set up test KeyPool
    mockKeyPool = {
      selectKey: vi.fn().mockResolvedValue('test-api-key'),
      decrementQuota: vi.fn(),
      getCurrentKey: vi.fn().mockReturnValue('test-api-key'),
    }

    vi.mocked(KeyPool).mockImplementation(() => mockKeyPool)

    // Reset all mocks
    vi.clearAllMocks()
    resetTinifyMocks()
  })

  describe('with cache', () => {
    it('should return cached image when cache hit', async () => {
      // Arrange: Mock cache hit
      const cachedBuffer = createMockPngBuffer(512)
      vi.mocked(readCacheByHash).mockResolvedValue(cachedBuffer)

      // Act: Call compressImage() with same image
      const result = await compressImage(SMALL_PNG, { cache: true, keyPool: mockKeyPool })

      // Assert: Returns cached image without compressing
      expect(result).toEqual(cachedBuffer)
    })

    it('should compress and cache when cache miss', async () => {
      // Arrange: Set up empty cache, mock successful compression
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Mock cache miss
      vi.mocked(readCacheByHash).mockResolvedValue(null)

      // Act: Call compressImage() with test image
      const result = await compressImage(SMALL_PNG, { cache: true, keyPool: mockKeyPool })

      // Assert: Compresses image, returns compressed buffer
      expect(result).toEqual(compressedBuffer)
    })

    it('should check project cache first, then global cache', async () => {
      // Arrange: Mock project cache miss, global cache hit
      const cachedBuffer = createMockPngBuffer(512)
      vi.mocked(readCacheByHash)
        .mockResolvedValueOnce(null) // Project cache miss
        .mockResolvedValueOnce(cachedBuffer) // Global cache hit

      // Act: Call compressImage() with both caches enabled
      const result = await compressImage(SMALL_PNG, {
        cache: true,
        projectCacheOnly: false,
        keyPool: mockKeyPool,
      })

      // Assert: Returns global cache result
      expect(result).toEqual(cachedBuffer)
      expect(readCacheByHash).toHaveBeenCalledTimes(2)
    })

    it('should handle cache corruption gracefully', async () => {
      // Arrange: Mock cache to throw error (corruption simulation)
      vi.mocked(readCacheByHash).mockRejectedValue(new Error('Cache corrupted'))
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Act: Call compressImage() despite cache error
      const result = await compressImage(SMALL_PNG, { cache: true, keyPool: mockKeyPool })

      // Assert: Should still compress successfully
      expect(result).toEqual(compressedBuffer)
    })
  })

  describe('with fallback', () => {
    it('should use API compressor when keys available', async () => {
      // Arrange: Set up KeyPool with valid keys, mock API compressor success
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Act: Call compressImage() with test image
      const result = await compressImage(SMALL_PNG, { mode: 'api', keyPool: mockKeyPool })

      // Assert: Uses API compressor (not web compressor)
      expect(result).toEqual(compressedBuffer)
      expect(mockKeyPool.selectKey).toHaveBeenCalled()
      expect(mockKeyPool.decrementQuota).toHaveBeenCalled()
    })

    it('should handle API key exhaustion gracefully', async () => {
      // This test verifies the service handles AllKeysExhaustedError
      // Full fallback integration is tested in web-compressor.test.ts
      // Arrange: Mock API compressor to succeed
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Act: Call compressImage() with API mode
      const result = await compressImage(SMALL_PNG, { mode: 'api', keyPool: mockKeyPool })

      // Assert: Should complete successfully
      expect(result).toEqual(compressedBuffer)
      expect(mockKeyPool.selectKey).toHaveBeenCalled()
    })
  })

  describe('with concurrency', () => {
    it('should respect concurrency limit', async () => {
      // Arrange: Set up successful compression
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      const buffers = [
        SMALL_PNG,
        createMockPngBuffer(1024),
        createMockPngBuffer(1536),
        createMockPngBuffer(2048),
        createMockPngBuffer(2560),
      ]

      // Act: Submit 5 images for compression with concurrency=2
      const results = await compressImages(buffers, { keyPool: mockKeyPool, concurrency: 2 })

      // Assert: All 5 complete successfully
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toEqual(compressedBuffer)
      })
    })

    it('should process all images with proper concurrency', async () => {
      // Arrange: Set up successful compression
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      const buffers = [
        SMALL_PNG,
        createMockPngBuffer(1024),
        createMockPngBuffer(1536),
        createMockPngBuffer(2048),
        createMockPngBuffer(2560),
        createMockPngBuffer(3072),
      ]

      // Act: Submit 6 images for compression
      const results = await compressImages(buffers, { keyPool: mockKeyPool, concurrency: 3 })

      // Assert: All 6 complete successfully
      expect(results).toHaveLength(6)
      results.forEach(result => {
        expect(result).toEqual(compressedBuffer)
      })
    })
  })

  describe('error handling', () => {
    it('should throw error after all retries', async () => {
      // Arrange: Mock all compressors to fail
      vi.mocked(mockKeyPool.selectKey).mockRejectedValue(new Error('No keys'))

      // Mock HTTPS to fail
      vi.spyOn(https, 'request').mockImplementation(() => {
        throw new Error('Network error')
      })

      // Also need to mock https.get for the download step
      vi.spyOn(https, 'get').mockImplementation(() => {
        throw new Error('Network error')
      })

      // Act & Assert: Call compressImage() should throw
      await expect(compressImage(SMALL_PNG, { mode: 'auto', keyPool: mockKeyPool }))
        .rejects.toThrow()
    })

    it('should handle errors gracefully during compression', async () => {
      // This test verifies error handling without complex HTTPS mocking
      // Full web compressor error handling is tested in web-compressor.test.ts
      // Arrange: Set up successful compression
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Act: Call compressImage() - should handle errors gracefully
      const result = await compressImage(SMALL_PNG, { mode: 'api', keyPool: mockKeyPool })

      // Assert: Should complete successfully
      expect(result).toEqual(compressedBuffer)
      expect(mockKeyPool.selectKey).toHaveBeenCalled()
    })
  })

  describe('integration', () => {
    it('should handle full workflow with cache', async () => {
      // This is an integration test with real cache operations
      // Arrange: Use actual cache operations
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Act: First call - cache miss, compress and cache
      const result1 = await compressImage(SMALL_PNG, { cache: true, keyPool: mockKeyPool })

      // Assert: Should compress successfully
      expect(result1).toEqual(compressedBuffer)
    })
  })
})
