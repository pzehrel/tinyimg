import { TinyPngHttpClient } from '../compress/http-client'
import { maskKey } from './masker'

const MONTHLY_LIMIT = 500 // Free tier limit

// Compression-count cache (D-12)
const compressionCountCache = new Map<string, number>()

export async function queryQuota(key: string): Promise<number> {
  try {
    const client = new TinyPngHttpClient()

    // Check cache first (D-15)
    if (compressionCountCache.has(key)) {
      const usedThisMonth = compressionCountCache.get(key)!
      const remaining = Math.max(0, MONTHLY_LIMIT - usedThisMonth)
      return remaining
    }

    // First time: validate key and get compression count (D-13)
    const isValid = await client.validateKey(key)
    if (!isValid) {
      return 0
    }

    const usedThisMonth = await client.getCompressionCount(key)

    // Cache the result (D-12)
    compressionCountCache.set(key, usedThisMonth)

    const remaining = Math.max(0, MONTHLY_LIMIT - usedThisMonth)
    return remaining
  }
  catch {
    // TinyPngHttpClient.validateKey() 对 5xx 抛出异常
    // 保持与旧代码一致的行为：所有错误情况返回 0
    return 0
  }
}

/**
 * Update the compression-count cache for a given API key.
 * Called after successful compression to keep cache fresh.
 *
 * @param key - API key
 * @param count - New compression count value
 */
export function updateCompressionCountCache(key: string, count: number): void {
  compressionCountCache.set(key, count)
}

/**
 * Get the cached compression count for a given API key.
 * Returns undefined if not cached.
 *
 * @internal
 */
export function getCachedCompressionCount(key: string): number | undefined {
  return compressionCountCache.get(key)
}

/**
 * Clear the compression-count cache.
 * Useful for testing and resetting state.
 *
 * @internal
 */
export function clearCompressionCountCache(): void {
  compressionCountCache.clear()
}

export interface QuotaTracker {
  key: string
  remaining: number
  localCounter: number
  decrement: () => void
  isZero: () => boolean
}

export function createQuotaTracker(key: string, remaining: number): QuotaTracker {
  const localCounter = remaining

  return {
    key,
    remaining,
    localCounter,
    decrement() {
      if (this.localCounter > 0) {
        this.localCounter--

        if (this.localCounter === 0) {
          console.warn(`⚠ Key ${maskKey(this.key)} quota exhausted, switching to next key`)
        }
      }
    },
    isZero() {
      return this.localCounter === 0
    },
  }
}
