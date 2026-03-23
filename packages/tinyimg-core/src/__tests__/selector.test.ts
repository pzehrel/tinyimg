import { describe, expect, it, vi } from 'vitest'
import { AllKeysExhaustedError, NoValidKeysError } from '../errors/types'
import { KeyPool } from '../keys/pool'
import { PrioritySelector, RandomSelector, RoundRobinSelector } from '../keys/selector'

// Mock dependencies
vi.mock('../keys/validator', () => ({
  validateKey: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('../keys/quota', () => ({
  queryQuota: vi.fn(() => Promise.resolve(100)),
  createQuotaTracker: vi.fn((key, remaining) => ({
    key,
    remaining,
    localCounter: remaining,
    decrement: vi.fn(function (this: any) { this.localCounter-- }),
    isZero: vi.fn(function (this: any) { return this.localCounter === 0 }),
  })),
}))

vi.mock('../config/loader', () => ({
  loadKeys: vi.fn(() => [
    { key: 'key1_123456789012' },
    { key: 'key2_123456789012' },
    { key: 'key3_123456789012' },
  ]),
}))

describe('key Selection Strategies', () => {
  const keys = ['key1', 'key2', 'key3']

  it('randomSelector selects random key', async () => {
    const selector = new RandomSelector()
    const selected = await selector.select(keys)
    expect(selected).toBeTruthy()
    expect(keys).toContain(selected!.key)
  })

  it('roundRobinSelector cycles through keys', async () => {
    const selector = new RoundRobinSelector()
    const first = await selector.select(keys)
    const _second = await selector.select(keys)
    const _third = await selector.select(keys)
    const fourth = await selector.select(keys)

    // Should cycle back to first after 3 selections
    expect(first!.key).toBe(fourth!.key)
  })

  it('prioritySelector returns first available', async () => {
    const selector = new PrioritySelector()
    const selected = await selector.select(keys)
    expect(selected!.key).toBe('key1')
  })
})

describe('keyPool', () => {
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

  it('throws NoValidKeysError when no keys configured', async () => {
    const { loadKeys: loadKeysMocked } = await import('../config/loader')
    vi.mocked(loadKeysMocked).mockReturnValueOnce([])

    expect(() => new KeyPool('random')).toThrow(NoValidKeysError)
  })

  it('handles quota exhaustion', async () => {
    const pool = new KeyPool('random')
    const _key = await pool.selectKey()

    // Decrement all quota to force re-selection
    for (let i = 0; i < 100; i++) {
      pool.decrementQuota()
    }

    // Mock queryQuota to return 0 for all keys
    const { queryQuota: queryQuotaMocked } = await import('../keys/quota')
    vi.mocked(queryQuotaMocked).mockResolvedValue(0)

    // Now selectKey should fail with AllKeysExhaustedError
    await expect(pool.selectKey()).rejects.toThrow(AllKeysExhaustedError)
  })
})
