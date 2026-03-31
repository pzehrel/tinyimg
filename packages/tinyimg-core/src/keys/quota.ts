import { TinyPngHttpClient } from '../compress/http-client'
import { maskKey } from './masker'

const MONTHLY_LIMIT = 500 // Free tier limit

export async function queryQuota(key: string): Promise<number> {
  try {
    const client = new TinyPngHttpClient()

    // 先验证 key 是否有效
    const isValid = await client.validateKey(key)
    if (!isValid) {
      return 0
    }

    // 获取已使用额度
    const usedThisMonth = await client.getCompressionCount(key)
    const remaining = Math.max(0, MONTHLY_LIMIT - usedThisMonth)
    return remaining
  }
  catch {
    // TinyPngHttpClient.validateKey() 对 5xx 抛出异常
    // 保持与旧代码一致的行为：所有错误情况返回 0
    return 0
  }
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
