import type { Buffer } from 'node:buffer'
import type { KeyPool } from '../keys/pool'
import type { ICompressor } from './types'
import { updateCompressionCountCache } from '../keys/quota'
import { TinyPngHttpClient } from './http-client'
import { RetryManager } from './retry'

// Re-export TinyPngWebCompressor for convenience
export { TinyPngWebCompressor } from './web-compressor'

// 5MB limit per CONTEXT.md D-09 - design decision, not tinify API limit
// tinify API supports up to 500MB, but we limit to 5MB for quota management
const MAX_FILE_SIZE = 5 * 1024 * 1024

export class TinyPngApiCompressor implements ICompressor {
  private retryManager: RetryManager

  constructor(
    private keyPool: KeyPool,
    maxRetries: number = 8,
  ) {
    this.retryManager = new RetryManager(maxRetries)
  }

  async compress(buffer: Buffer): Promise<Buffer> {
    // Check 5MB limit per CONTEXT.md D-09
    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit')
    }

    return this.retryManager.execute(async () => {
      const key = await this.keyPool.selectKey()
      const client = new TinyPngHttpClient()

      const { buffer: compressedBuffer, compressionCount } = await client.compress(key, buffer)

      // Update compression-count cache (D-14, 解决 warning #2)
      // compressionCount 可能为 undefined（如果 TinyPNG API 不返回该字段）
      if (typeof compressionCount === 'number') {
        updateCompressionCountCache(key, compressionCount)
      }

      this.keyPool.decrementQuota()

      return compressedBuffer
    })
  }

  getFailureCount(): number {
    return this.retryManager.getFailureCount()
  }
}
