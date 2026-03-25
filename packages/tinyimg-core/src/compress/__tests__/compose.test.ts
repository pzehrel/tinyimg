import type { ICompressor } from '../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AllCompressionFailedError } from '../../errors/types'
import { compressWithFallback, getCompressorTypesForMode } from '../compose'
import { SMALL_PNG } from './fixtures'

describe('compressWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fallback behavior', () => {
    it('should try compressors in sequence', async () => {
      // Arrange: Create [apiCompressor, webCompressor] array
      const mockApiCompressor: ICompressor = {
        compress: vi.fn().mockRejectedValue(new Error('API failed')),
      }
      const mockWebCompressor: ICompressor = {
        compress: vi.fn().mockResolvedValue(SMALL_PNG),
      }
      const compressors = [mockApiCompressor, mockWebCompressor]

      // Act: Call compressWithFallback() with test buffer
      const result = await compressWithFallback(SMALL_PNG, { compressors })

      // Assert: Tries apiCompressor first, then webCompressor
      expect(mockApiCompressor.compress).toHaveBeenCalledTimes(1)
      expect(mockWebCompressor.compress).toHaveBeenCalledTimes(1)
      expect(result).toEqual(SMALL_PNG)
    })

    it('should return first successful result', async () => {
      // Arrange: Create compressors where first succeeds
      const mockCompressor1: ICompressor = {
        compress: vi.fn().mockResolvedValue(SMALL_PNG),
      }
      const mockCompressor2: ICompressor = {
        compress: vi.fn().mockResolvedValue(SMALL_PNG),
      }
      const compressors = [mockCompressor1, mockCompressor2]

      // Act: Call compressWithFallback()
      const result = await compressWithFallback(SMALL_PNG, { compressors })

      // Assert: Returns result from first compressor without trying others
      expect(mockCompressor1.compress).toHaveBeenCalledTimes(1)
      expect(mockCompressor2.compress).not.toHaveBeenCalled()
      expect(result).toEqual(SMALL_PNG)
    })

    it('should try next compressor on failure', async () => {
      // Arrange: Create compressors where first fails, second succeeds
      const mockCompressor1: ICompressor = {
        compress: vi.fn().mockRejectedValue(new Error('First failed')),
      }
      const mockCompressor2: ICompressor = {
        compress: vi.fn().mockResolvedValue(SMALL_PNG),
      }
      const compressors = [mockCompressor1, mockCompressor2]

      // Act: Call compressWithFallback()
      const result = await compressWithFallback(SMALL_PNG, { compressors })

      // Assert: Falls back to second compressor and returns its result
      expect(mockCompressor1.compress).toHaveBeenCalledTimes(1)
      expect(mockCompressor2.compress).toHaveBeenCalledTimes(1)
      expect(result).toEqual(SMALL_PNG)
    })

    it('should throw AllCompressionFailedError when all fail', async () => {
      // Arrange: Create compressors where all fail
      const mockCompressor1: ICompressor = {
        compress: vi.fn().mockRejectedValue(new Error('Failed 1')),
      }
      const mockCompressor2: ICompressor = {
        compress: vi.fn().mockRejectedValue(new Error('Failed 2')),
      }
      const compressors = [mockCompressor1, mockCompressor2]

      // Act & Assert: Throws AllCompressionFailedError
      await expect(compressWithFallback(SMALL_PNG, { compressors }))
        .rejects
        .toThrow(AllCompressionFailedError)
      await expect(compressWithFallback(SMALL_PNG, { compressors }))
        .rejects
        .toThrow('All compression methods failed')
    })

    it('should support mode: "api" for API-only', async () => {
      // Arrange: Call compressWithFallback() with mode='api'
      const types = getCompressorTypesForMode('api')

      // Act & Assert: Only uses API compressor, not web compressor
      expect(types).toEqual(['TinyPngApiCompressor'])
      expect(types).not.toContain('TinyPngWebCompressor')
    })

    it('should support mode: "web" for web-only', async () => {
      // Arrange: Call compressWithFallback() with mode='web'
      const types = getCompressorTypesForMode('web')

      // Act & Assert: Only uses web compressor, not API compressor
      expect(types).toEqual(['TinyPngWebCompressor'])
      expect(types).not.toContain('TinyPngApiCompressor')
    })

    it('should use default compressors in auto mode', async () => {
      // Arrange: Call compressWithFallback() with mode='auto' (or undefined)
      const autoTypes = getCompressorTypesForMode('auto')
      const undefinedTypes = getCompressorTypesForMode(undefined)

      // Act & Assert: Uses [TinyPngApiCompressor, TinyPngWebCompressor] by default
      expect(autoTypes).toEqual(['TinyPngApiCompressor', 'TinyPngWebCompressor'])
      expect(undefinedTypes).toEqual(['TinyPngApiCompressor', 'TinyPngWebCompressor'])
    })
  })
})
