/**
 * Compressor interface for compression implementations
 *
 * @example
 * ```ts
 * const compressor: ICompressor = {
 *   compress: async (buffer: Buffer) => {
 *     // Compression logic
 *     return compressedBuffer
 *   }
 * }
 * ```
 */
export interface ICompressor {
  /**
   * Compress an image buffer
   *
   * @param buffer - Original image data
   * @returns Compressed image data
   * @throws Error when compression fails
   */
  compress(buffer: Buffer): Promise<Buffer>
}

/**
 * Compression mode for selecting compression strategy
 */
export type CompressionMode = 'auto' | 'api' | 'web'

/**
 * Options for compression operations
 *
 * @example
 * ```ts
 * const options: CompressOptions = {
 *   mode: 'api',
 *   maxRetries: 5,
 *   compressors: [customCompressor]
 * }
 * ```
 */
export interface CompressOptions {
  /**
   * Compression mode (default: 'auto')
   * - 'auto': Try API compressor first, fallback to web compressor
   * - 'api': Use API compressor only
   * - 'web': Use web compressor only
   */
  mode?: CompressionMode

  /**
   * Custom compressor array for fallback chain
   * If not provided, uses default compressors based on mode
   */
  compressors?: ICompressor[]

  /**
   * Maximum retry attempts for transient failures (default: 3)
   */
  maxRetries?: number
}

/**
 * Re-export from service.ts for public API
 * This is defined in compress/service.ts but exported here for consistency
 */
export type { CompressServiceOptions } from './service'
