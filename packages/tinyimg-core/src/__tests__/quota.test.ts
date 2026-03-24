import tinify from 'tinify'
import { describe, expect, it, vi } from 'vitest'

import { createQuotaTracker, queryQuota } from '../keys/quota'

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

describe('quota Tracking', () => {
  it('calculates remaining quota', async () => {
    vi.mocked(tinify.validate).mockResolvedValue(undefined as never)
    Object.defineProperty(tinify, 'compressionCount', { get: () => 100, configurable: true })

    const quota = await queryQuota('test_key')
    expect(quota).toBe(400) // 500 - 100
  })

  it('returns 0 for exhausted quota', async () => {
    vi.mocked(tinify.validate).mockResolvedValue(undefined as never)
    Object.defineProperty(tinify, 'compressionCount', { get: () => 500, configurable: true })

    const quota = await queryQuota('test_key')
    expect(quota).toBe(0) // 500 - 500 = 0
  })

  it('tracks quota with local counter', () => {
    const tracker = createQuotaTracker('test_key', 10)
    expect(tracker.localCounter).toBe(10)
    expect(tracker.isZero()).toBe(false)

    tracker.decrement()
    expect(tracker.localCounter).toBe(9)

    // Exhaust quota
    for (let i = 0; i < 9; i++) {
      tracker.decrement()
    }
    expect(tracker.isZero()).toBe(true)
  })

  it('emits warning when quota exhausted', () => {
    const tracker = createQuotaTracker('test_key', 1)
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    tracker.decrement()
    expect(tracker.isZero()).toBe(true)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('quota exhausted'),
    )

    consoleWarnSpy.mockRestore()
  })

  it('does not decrement below zero', () => {
    const tracker = createQuotaTracker('test_key', 0)
    tracker.decrement()
    expect(tracker.localCounter).toBe(0)

    tracker.decrement()
    expect(tracker.localCounter).toBe(0)
  })
})
