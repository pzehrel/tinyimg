import type { Buffer } from 'node:buffer'
import type { KeyPool } from '../keys/pool'
import type { ICompressor } from './types'
import { logInfo, logWarning } from '../utils/logger'
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
      logWarning(`File exceeds 5MB limit for API compressor (${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB)`)
      throw new Error('File size exceeds 5MB limit')
    }

    return this.retryManager.execute(async () => {
      const key = await this.keyPool.selectKey()
      const client = new TinyPngHttpClient()

      const originalSize = buffer.byteLength
      const result = await client.compress(key, buffer)
      const compressedSize = result.byteLength
      const saved = ((1 - compressedSize / originalSize) * 100).toFixed(1)

      this.keyPool.decrementQuota()
      logInfo(`Compressed with [TinyPngApiCompressor]: ${originalSize} → ${compressedSize} (saved ${saved}%)`)

      return result
    })
  }

  getFailureCount(): number {
    return this.retryManager.getFailureCount()
  }
}
