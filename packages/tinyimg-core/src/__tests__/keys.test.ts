import tinify from 'tinify'
import { describe, expect, it, vi } from 'vitest'
import { maskKey } from '../keys/masker'
import { createQuotaTracker, queryQuota } from '../keys/quota'

import { validateKey } from '../keys/validator'

// Mock tinify package
vi.mock('tinify', () => {
  const validateFn = vi.fn()
  return {
    default: {
      key: '',
      validate: validateFn,
      get compressionCount() { return 0 },
    },
  }
})

// Create error classes for testing
class AccountError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccountError'
  }
}

describe('key Operations Integration Tests', () => {
  describe('key Masking', () => {
    it('masks keys correctly (short, normal, long)', () => {
      // Short key
      expect(maskKey('1234')).toBe('****')

      // Normal key
      expect(maskKey('abcd1234efgh5678')).toBe('abcd****5678')

      // Long key
      expect(maskKey('123456789012345678901234567890')).toBe('1234****7890')
    })

    it('handles edge cases', () => {
      // Empty string
      expect(maskKey('')).toBe('****')

      // Exactly 8 chars
      expect(maskKey('12345678')).toBe('1234****5678')

      // 7 chars (threshold)
      expect(maskKey('1234567')).toBe('****')

      // 9 chars
      expect(maskKey('123456789')).toBe('1234****6789')
    })
  })

  describe('key Validation', () => {
    it('validates using tinify.validate (mocked)', async () => {
      vi.mocked(tinify.validate).mockResolvedValue(undefined as never)
      const result = await validateKey('valid_key')
      expect(result).toBe(true)
      expect(tinify.validate).toHaveBeenCalled()
    })

    it('handles AccountError correctly', async () => {
      const err = new AccountError('Invalid credentials')
      vi.mocked(tinify.validate).mockRejectedValue(err as never)
      const result = await validateKey('invalid_key')
      expect(result).toBe(false)
    })

    it('re-throws other errors', async () => {
      const err = new Error('Network error')
      vi.mocked(tinify.validate).mockRejectedValue(err as never)
      await expect(validateKey('test_key')).rejects.toThrow('Network error')
    })
  })

  describe('quota Tracking', () => {
    it('returns remaining quota (mocked)', async () => {
      vi.mocked(tinify.validate).mockResolvedValue(undefined as never)
      Object.defineProperty(tinify, 'compressionCount', { get: () => 100, configurable: true })

      const quota = await queryQuota('test_key')
      expect(quota).toBe(400)
    })

    it('handles AccountError by returning 0', async () => {
      const err = new AccountError('Invalid credentials')
      vi.mocked(tinify.validate).mockRejectedValue(err as never)

      const quota = await queryQuota('invalid_key')
      expect(quota).toBe(0)
    })
  })

  describe('quotaTracker', () => {
    it('decrements counter', () => {
      const tracker = createQuotaTracker('key', 5)
      expect(tracker.localCounter).toBe(5)

      tracker.decrement()
      expect(tracker.localCounter).toBe(4)
    })

    it('detects exhaustion', () => {
      const tracker = createQuotaTracker('key', 1)
      expect(tracker.isZero()).toBe(false)

      tracker.decrement()
      expect(tracker.isZero()).toBe(true)
    })

    it('warns on exhaustion', () => {
      const tracker = createQuotaTracker('key', 1)
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      tracker.decrement()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('quota exhausted'),
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('integration Scenarios', () => {
    it('masks key in validation success message', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.mocked(tinify.validate).mockResolvedValue(undefined as never)

      await validateKey('abcd1234efgh5678')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('abcd****5678'),
      )

      consoleLogSpy.mockRestore()
    })

    it('masks key in validation warning', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const err = new AccountError('Invalid credentials')
      vi.mocked(tinify.validate).mockRejectedValue(err as never)

      await validateKey('abcd1234efgh5678')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('abcd****5678'),
      )

      consoleWarnSpy.mockRestore()
    })

    it('masks key in quota exhaustion warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const tracker = createQuotaTracker('abcd1234efgh5678', 1)

      tracker.decrement()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('abcd****5678'),
      )

      consoleWarnSpy.mockRestore()
    })
  })
})
