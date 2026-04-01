import { describe, expect, it, vi } from 'vitest'
import { maskKey } from '../keys/masker'
import { createQuotaTracker } from '../keys/quota'

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
