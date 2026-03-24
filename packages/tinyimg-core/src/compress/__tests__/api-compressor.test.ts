import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SMALL_PNG, LARGE_PNG, createMockPngBuffer, mockTinifySuccess, mockTinifyQuota, resetTinifyMocks } from './fixtures'
import { TinyPngApiCompressor } from '../api-compressor'
import { KeyPool } from '../../keys/pool'

describe('TinyPngApiCompressor', () => {
  let compressor: TinyPngApiCompressor
  let mockKeyPool: KeyPool

  beforeEach(() => {
    // Reset all mocks before each test
    resetTinifyMocks()

    // Create mock KeyPool
    mockKeyPool = {
      selectKey: vi.fn().mockResolvedValue('test-api-key'),
      decrementQuota: vi.fn(),
      getCurrentKey: vi.fn().mockReturnValue('test-api-key'),
    } as any

    compressor = new TinyPngApiCompressor(mockKeyPool, 8)
  })

  describe('compress', () => {
    it('should compress image using tinify API with valid key', async () => {
      // Arrange: Set up tinify mock with valid key and successful compression
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Act: Call compressor.compress() with SMALL_PNG
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Returns compressed buffer
      expect(result).toEqual(compressedBuffer)
      expect(mockKeyPool.selectKey).toHaveBeenCalled()
      expect(mockKeyPool.decrementQuota).toHaveBeenCalled()
    })

    it('should enforce 5MB file size limit', async () => {
      // Arrange: Create buffer > 5MB (LARGE_PNG is 6MB)
      // Act: Call compressor.compress() with LARGE_PNG
      // Assert: Throws error to trigger fallback
      await expect(compressor.compress(LARGE_PNG)).rejects.toThrow('File size exceeds 5MB limit')
    })

    it('should retry on network errors up to maxRetries', async () => {
      // Arrange: Mock tinify to throw network error (ECONNRESET)
      const networkError = new Error('Connection reset')
      ;(networkError as any).code = 'ECONNRESET'

      vi.doMock('tinify', () => ({
        fromBuffer: vi.fn().mockImplementation(() => {
          throw networkError
        }),
        key: '',
      }))

      // Act: Call compressor.compress() with retry config
      // Assert: Retries up to maxRetries times before failing
      await expect(compressor.compress(SMALL_PNG)).rejects.toThrow('Connection reset')

      // Check that retries were attempted (failure count should be > 1)
      expect(compressor.getFailureCount()).toBeGreaterThan(0)
    })

    it('should decrement quota after successful compression', async () => {
      // Arrange: Set up KeyPool with test key, mock successful compression
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: KeyPool quota decremented by 1
      expect(mockKeyPool.decrementQuota).toHaveBeenCalledTimes(1)
    })

    it('should throw error after max retries exceeded', async () => {
      // Arrange: Mock tinify to always fail
      vi.doMock('tinify', () => ({
        fromBuffer: vi.fn().mockImplementation(() => {
          throw new Error('Always fails')
        }),
        key: '',
      }))

      // Act: Call compressor.compress() with maxRetries=3
      const compressorWithLowRetries = new TinyPngApiCompressor(mockKeyPool, 3)

      // Assert: Throws error after 3 failed attempts
      await expect(compressorWithLowRetries.compress(SMALL_PNG)).rejects.toThrow('Always fails')
    })

    it('should not retry on client errors (4xx)', async () => {
      // Arrange: Mock tinify to throw 4xx error (e.g., invalid credentials)
      const clientError = new Error('Unauthorized')
      ;(clientError as any).statusCode = 401

      vi.doMock('tinify', () => ({
        fromBuffer: vi.fn().mockImplementation(() => {
          throw clientError
        }),
        key: '',
      }))

      // Act: Call compressor.compress()
      // Assert: Fails immediately without retry (failure count should be 0 or 1)
      await expect(compressor.compress(SMALL_PNG)).rejects.toThrow('Unauthorized')

      // Should not have retried (failure count is only incremented if we retry)
      expect(compressor.getFailureCount()).toBe(0)
    })
  })
})
