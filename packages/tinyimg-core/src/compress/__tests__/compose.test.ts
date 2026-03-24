import { beforeEach, describe, expect, it } from 'vitest'
import { SMALL_PNG, createMockPngBuffer } from './fixtures'

describe('compressWithFallback', () => {
  beforeEach(() => {
    // Reset compressor mocks before each test
  })

  describe('fallback behavior', () => {
    it.skip('should try compressors in sequence', async () => {
      // TODO: Implement test in Plan 04-04
      // Arrange: Create [apiCompressor, webCompressor] array
      // Act: Call compressWithFallback() with test buffer
      // Assert: Tries apiCompressor first, then webCompressor if API fails
    })

    it.skip('should return first successful result', async () => {
      // TODO: Implement test in Plan 04-04
      // Arrange: Create compressors where first succeeds
      // Act: Call compressWithFallback()
      // Assert: Returns result from first compressor without trying others
    })

    it.skip('should try next compressor on failure', async () => {
      // TODO: Implement test in Plan 04-04
      // Arrange: Create compressors where first fails, second succeeds
      // Act: Call compressWithFallback()
      // Assert: Falls back to second compressor and returns its result
    })

    it.skip('should throw AllCompressionFailedError when all fail', async () => {
      // TODO: Implement test in Plan 04-04
      // Arrange: Create compressors where all fail
      // Act: Call compressWithFallback()
      // Assert: Throws AllCompressionFailedError
    })

    it.skip('should support mode: "api" for API-only', async () => {
      // TODO: Implement test in Plan 04-04
      // Arrange: Call compressWithFallback() with mode='api'
      // Act: Execute compression
      // Assert: Only uses API compressor, not web compressor
    })

    it.skip('should support mode: "web" for web-only', async () => {
      // TODO: Implement test in Plan 04-04
      // Arrange: Call compressWithFallback() with mode='web'
      // Act: Execute compression
      // Assert: Only uses web compressor, not API compressor
    })

    it.skip('should use default compressors in auto mode', async () => {
      // TODO: Implement test in Plan 04-04
      // Arrange: Call compressWithFallback() with mode='auto' (or undefined)
      // Act: Execute compression
      // Assert: Uses [TinyPngApiCompressor, TinyPngWebCompressor] by default
    })
  })
})
