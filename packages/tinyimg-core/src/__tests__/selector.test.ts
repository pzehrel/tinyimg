import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RandomSelector, RoundRobinSelector, PrioritySelector } from '../keys/selector.js'
import { KeyPool } from '../keys/pool.js'
import { AllKeysExhaustedError, NoValidKeysError } from '../errors/types.js'

// Mock dependencies
vi.mock('../keys/validator.js', () => ({
  validateKey: vi.fn(() => Promise.resolve(true))
}))

vi.mock('../keys/quota.js', () => ({
  queryQuota: vi.fn(() => Promise.resolve(100)),
  createQuotaTracker: vi.fn((key, remaining) => ({
    key,
    remaining,
    localCounter: remaining,
    decrement: vi.fn(function() { this.localCounter-- }),
    isZero: vi.fn(function() { return this.localCounter === 0 })
  }))
}))

vi.mock('../config/loader.js', () => ({
  loadKeys: vi.fn(() => [
    { key: 'key1_123456789012' },
    { key: 'key2_123456789012' },
    { key: 'key3_123456789012' }
  ])
}))

describe('Key Selection Strategies', () => {
  const keys = ['key1', 'key2', 'key3']

  it('RandomSelector selects random key', async () => {
    const selector = new RandomSelector()
    const selected = await selector.select(keys)
    expect(selected).toBeTruthy()
    expect(keys).toContain(selected!.key)
  })

  it('RoundRobinSelector cycles through keys', async () => {
    const selector = new RoundRobinSelector()
    const first = await selector.select(keys)
    const second = await selector.select(keys)
    const third = await selector.select(keys)
    const fourth = await selector.select(keys)

    // Should cycle back to first after 3 selections
    expect(first!.key).toBe(fourth!.key)
  })

  it('PrioritySelector returns first available', async () => {
    const selector = new PrioritySelector()
    const selected = await selector.select(keys)
    expect(selected!.key).toBe('key1')
  })
})

describe('KeyPool', () => {
  it('initializes with loaded keys', () => {
    const pool = new KeyPool('random')
    expect(pool.getCurrentKey()).toBeNull()
  })

  it('selects key using configured strategy', async () => {
    const pool = new KeyPool('random')
    const key = await pool.selectKey()
    expect(key).toBeTruthy()
    expect(typeof key).toBe('string')
  })

  it('throws NoValidKeysError when no keys configured', () => {
    vi.doMock('../config/loader.js', () => ({
      loadKeys: vi.fn(() => [])
    }))

    expect(() => new KeyPool('random')).toThrow(NoValidKeysError)
  })

  it('handles quota exhaustion', async () => {
    const pool = new KeyPool('random')
    const key = await pool.selectKey()

    // Simulate quota exhaustion
    vi.mocked(await import('../keys/quota.js')).queryQuota.mockResolvedValue(0)

    await expect(pool.selectKey()).rejects.toThrow(AllKeysExhaustedError)
  })
})
