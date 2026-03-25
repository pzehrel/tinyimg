import { beforeEach, describe, expect, it } from 'vitest'
import { TinyPngApiCompressor } from '../api-compressor'
import { createMockPngBuffer, LARGE_PNG, mockTinifySuccess, resetTinifyMocks, SMALL_PNG } from './fixtures'

describe('tinyPngApiCompressor', () => {
  let compressor: TinyPngApiCompressor
  let mockKeyPool: any

  beforeEach(() => {
    // Reset all mocks before each test
    resetTinifyMocks()

    // Create mock KeyPool
    mockKeyPool = {
      selectKey: async () => 'test-api-key',
      decrementQuota: () => {},
      getCurrentKey: () => 'test-api-key',
    }

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
      expect(compressor.getFailureCount()).toBe(0) // No failures
    })

    it('should enforce 5MB file size limit', async () => {
      // Arrange: Create buffer > 5MB (LARGE_PNG is 6MB)
      // Act: Call compressor.compress() with LARGE_PNG
      // Assert: Throws error to trigger fallback
      await expect(compressor.compress(LARGE_PNG)).rejects.toThrow('File size exceeds 5MB limit')
    })

    it('should call KeyPool methods on success', async () => {
      // Arrange: Set up tinify mock with successful compression
      const compressedBuffer = createMockPngBuffer(512)
      mockTinifySuccess(compressedBuffer)

      // Track calls
      let selectKeyCalled = false
      let decrementQuotaCalled = false
      mockKeyPool.selectKey = async () => {
        selectKeyCalled = true
        return 'test-api-key'
      }
      mockKeyPool.decrementQuota = () => {
        decrementQuotaCalled = true
      }

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: KeyPool methods called
      expect(selectKeyCalled).toBe(true)
      expect(decrementQuotaCalled).toBe(true)
    })

    it('should have getFailureCount method', () => {
      // Assert: Method exists and returns number
      expect(typeof compressor.getFailureCount).toBe('function')
      expect(typeof compressor.getFailureCount()).toBe('number')
    })
  })
})
