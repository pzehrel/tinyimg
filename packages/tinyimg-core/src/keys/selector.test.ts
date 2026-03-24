import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrioritySelector, RandomSelector, RoundRobinSelector } from './selector'

// Mock dependencies
vi.mock('../utils/logger', () => ({
  logWarning: vi.fn(),
}))

vi.mock('./validator', () => ({
  validateKey: vi.fn(),
}))

vi.mock('./quota', () => ({
  queryQuota: vi.fn(),
  createQuotaTracker: vi.fn(() => ({
    key: 'test-key',
    remaining: 100,
    localCounter: 100,
    decrement: vi.fn(),
    isZero: vi.fn(() => false),
  })),
}))

describe('key Selection Strategies', () => {
  const mockKeys = ['key1', 'key2', 'key3']

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('randomSelector', () => {
    let selector: RandomSelector

    beforeEach(() => {
      selector = new RandomSelector()
    })

    it('should select random key from available keys', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockResolvedValue(true as never)
      vi.mocked(queryQuota).mockResolvedValue(100 as never)

      const result = await selector.select(mockKeys)

      expect(result).not.toBeNull()
      expect(mockKeys).toContain(result!.key)
    })

    it('should validate and filter keys before selection', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockImplementation(async (key: string) => {
        return key !== 'invalid-key'
      })
      vi.mocked(queryQuota).mockResolvedValue(100 as never)

      const keysWithInvalid = [...mockKeys, 'invalid-key']
      const result = await selector.select(keysWithInvalid)

      expect(result).not.toBeNull()
      expect(mockKeys).toContain(result!.key)
    })

    it('should skip keys with zero quota', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockResolvedValue(true as never)
      vi.mocked(queryQuota).mockImplementation(async (key: string) => {
        return key === 'key1' ? 0 : 100
      })

      const result = await selector.select(mockKeys)

      expect(result).not.toBeNull()
      expect(result!.key).not.toBe('key1')
    })

    it('should return null when no keys available', async () => {
      const { validateKey } = await import('./validator')

      vi.mocked(validateKey).mockResolvedValue(false as never)

      const result = await selector.select(mockKeys)

      expect(result).toBeNull()
    })
  })

  describe('roundRobinSelector', () => {
    let selector: RoundRobinSelector

    beforeEach(() => {
      selector = new RoundRobinSelector()
    })

    it('should cycle through keys in order', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockResolvedValue(true as never)
      vi.mocked(queryQuota).mockResolvedValue(100 as never)

      const results = []
      for (let i = 0; i < 6; i++) {
        const result = await selector.select(mockKeys)
        results.push(result!.key)
      }

      // Should cycle through keys in order
      expect(results[0]).toBe('key1')
      expect(results[1]).toBe('key2')
      expect(results[2]).toBe('key3')
      expect(results[3]).toBe('key1')
      expect(results[4]).toBe('key2')
      expect(results[5]).toBe('key3')
    })

    it('should reset cycle index', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockResolvedValue(true as never)
      vi.mocked(queryQuota).mockResolvedValue(100 as never)

      await selector.select(mockKeys)
      await selector.select(mockKeys)
      selector.reset()

      const result = await selector.select(mockKeys)

      expect(result!.key).toBe('key1')
    })

    it('should validate and filter keys before selection', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockImplementation(async (key: string) => {
        return key !== 'invalid-key'
      })
      vi.mocked(queryQuota).mockResolvedValue(100 as never)

      const keysWithInvalid = [...mockKeys, 'invalid-key']
      const result = await selector.select(keysWithInvalid)

      expect(result).not.toBeNull()
      expect(mockKeys).toContain(result!.key)
    })

    it('should skip keys with zero quota', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockResolvedValue(true as never)
      vi.mocked(queryQuota).mockImplementation(async (key: string) => {
        return key === 'key1' ? 0 : 100
      })

      const result = await selector.select(mockKeys)

      expect(result).not.toBeNull()
      expect(result!.key).not.toBe('key1')
    })

    it('should return null when no keys available', async () => {
      const { validateKey } = await import('./validator')

      vi.mocked(validateKey).mockResolvedValue(false as never)

      const result = await selector.select(mockKeys)

      expect(result).toBeNull()
    })
  })

  describe('prioritySelector', () => {
    let selector: PrioritySelector

    beforeEach(() => {
      selector = new PrioritySelector()
    })

    it('should select first available key', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockResolvedValue(true as never)
      vi.mocked(queryQuota).mockResolvedValue(100 as never)

      const result = await selector.select(mockKeys)

      expect(result).not.toBeNull()
      expect(result!.key).toBe('key1')
    })

    it('should validate and filter keys before selection', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockImplementation(async (key: string) => {
        return key !== 'invalid-key'
      })
      vi.mocked(queryQuota).mockResolvedValue(100 as never)

      const keysWithInvalid = ['invalid-key', ...mockKeys]
      const result = await selector.select(keysWithInvalid)

      expect(result).not.toBeNull()
      expect(result!.key).toBe('key1')
    })

    it('should skip keys with zero quota', async () => {
      const { validateKey } = await import('./validator')
      const { queryQuota } = await import('./quota')

      vi.mocked(validateKey).mockResolvedValue(true as never)
      vi.mocked(queryQuota).mockImplementation(async (key: string) => {
        return key === 'key1' ? 0 : 100
      })

      const result = await selector.select(mockKeys)

      expect(result).not.toBeNull()
      expect(result!.key).toBe('key2')
    })

    it('should return null when no keys available', async () => {
      const { validateKey } = await import('./validator')

      vi.mocked(validateKey).mockResolvedValue(false as never)

      const result = await selector.select(mockKeys)

      expect(result).toBeNull()
    })
  })
})
