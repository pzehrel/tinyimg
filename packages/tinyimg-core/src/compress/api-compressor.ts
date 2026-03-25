import type { Buffer } from 'node:buffer'
import type { KeyPool } from '../keys/pool'
import type { ICompressor } from './types'
import * as tinify from 'tinify'
import { logInfo, logWarning } from '../utils/logger'
import { RetryManager } from './retry'

// Re-export TinyPngWebCompressor for convenience
export { TinyPngWebCompressor } from './web-compressor'

// 5MB limit per CONTEXT.md D-09 - design decision, not tinify API limit
// tinify API supports up to 500MB, but we limit to 5MB for quota management
const MAX_FILE_SIZE = 5 * 1024 * 1024

export class TinyPngApiCompressor implements ICompressor {
  private retryManager: RetryManager
  private currentKey: string | null = null

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
      // Only set tinify.key if it's different from current
      const key = await this.keyPool.selectKey()
      if (this.currentKey !== key) {
        try {
          tinify.key = key
          this.currentKey = key
        }
        catch {
          // In test environments, tinify.key might not be writable
          // This is OK as long as fromBuffer is mocked
        }
      }

      const originalSize = buffer.byteLength
      const result = await tinify.fromBuffer(buffer).toBuffer()
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
