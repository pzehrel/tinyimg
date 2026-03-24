import { beforeEach, describe, expect, it } from 'vitest'
import { SMALL_PNG, LARGE_PNG, createMockPngBuffer, mockTinifySuccess, mockTinifyQuota, resetTinifyMocks } from './fixtures'

describe('TinyPngApiCompressor', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetTinifyMocks()
  })

  describe('compress', () => {
    it.skip('should compress image using tinify API with valid key', async () => {
      // TODO: Implement test in Plan 04-01
      // Arrange: Set up tinify mock with valid key and successful compression
      // Act: Call compressor.compress() with SMALL_PNG
      // Assert: Returns compressed buffer
    })

    it.skip('should enforce 5MB file size limit', async () => {
      // TODO: Implement test in Plan 04-01
      // Arrange: Create buffer > 5MB (LARGE_PNG)
      // Act: Call compressor.compress() with LARGE_PNG
      // Assert: Throws error or returns null to trigger fallback
    })

    it.skip('should retry on network errors up to maxRetries', async () => {
      // TODO: Implement test in Plan 04-01
      // Arrange: Mock tinify to throw network error (ECONNRESET)
      // Act: Call compressor.compress() with retry config
      // Assert: Retries up to maxRetries times before failing
    })

    it.skip('should decrement quota after successful compression', async () => {
      // TODO: Implement test in Plan 04-01
      // Arrange: Set up KeyPool with test key, mock successful compression
      // Act: Call compressor.compress()
      // Assert: KeyPool quota decremented by 1
    })

    it.skip('should throw error after max retries exceeded', async () => {
      // TODO: Implement test in Plan 04-01
      // Arrange: Mock tinify to always fail
      // Act: Call compressor.compress() with maxRetries=3
      // Assert: Throws error after 3 failed attempts
    })

    it.skip('should not retry on client errors (4xx)', async () => {
      // TODO: Implement test in Plan 04-01
      // Arrange: Mock tinify to throw 4xx error (e.g., invalid credentials)
      // Act: Call compressor.compress()
      // Assert: Fails immediately without retry
    })
  })
})
