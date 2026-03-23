import type { Buffer } from 'node:buffer'
import type { CompressionMode, CompressOptions } from './types'
import { AllCompressionFailedError } from '../errors/types'
/**
 * Compress buffer with automatic fallback through multiple compressors
 *
 * @param buffer - Original image data
 * @param options - Compression options (mode, compressors, maxRetries)
 * @returns Compressed image data
 * @throws AllCompressionFailedError when all compressors fail
 *
 * @example
 * ```ts
 * try {
 *   const compressed = await compressWithFallback(buffer, { mode: 'auto' })
 * } catch (error) {
 *   if (error instanceof AllCompressionFailedError) {
 *     // All compression methods failed
 *   }
 * }
 * ```
 */
export async function compressWithFallback(
  buffer: Buffer,
  options: CompressOptions = {},
): Promise<{ buffer: Buffer, compressorName: string }> {
  const compressors = options.compressors ?? []

  for (const compressor of compressors) {
    try {
      const result = await compressor.compress(buffer)
      return { buffer: result, compressorName: compressor.constructor.name }
    }
    catch (error: any) {
      // If this is AllCompressionFailedError, propagate immediately
      if (error.name === 'AllCompressionFailedError') {
        throw error
      }

      // Otherwise, try next compressor
      continue
    }
  }

  throw new AllCompressionFailedError('All compression methods failed')
}

/**
 * Get default compressor types for a given mode
 * This is a helper - actual compressor instances created in service layer
 *
 * @param mode - Compression mode
 * @returns Compressor type names (not instances)
 *
 * @example
 * ```ts
 * const types = getCompressorTypesForMode('auto')
 * // Returns: ['TinyPngApiCompressor', 'TinyPngWebCompressor']
 * ```
 */
export function getCompressorTypesForMode(mode: CompressionMode = 'auto'): string[] {
  switch (mode) {
    case 'api':
      return ['TinyPngApiCompressor']
    case 'web':
      return ['TinyPngWebCompressor']
    case 'auto':
    default:
      return ['TinyPngApiCompressor', 'TinyPngWebCompressor']
  }
}
