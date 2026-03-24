import tinify from 'tinify'
import { maskKey } from './masker'

const MONTHLY_LIMIT = 500 // Free tier limit

export async function queryQuota(key: string): Promise<number> {
  try {
    tinify.key = key
    await tinify.validate() // Required to set compressionCount
    const usedThisMonth = tinify.compressionCount ?? 0
    const remaining = Math.max(0, MONTHLY_LIMIT - usedThisMonth)
    return remaining
  }
  catch (error: any) {
    // Invalid key or quota exhausted - return 0
    if (error?.message?.includes('credentials') || error?.message?.includes('Unauthorized') || error?.constructor?.name === 'AccountError') {
      return 0
    }
    throw error
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
