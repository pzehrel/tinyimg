import { describe, it, expect } from 'vitest'

describe('Public API Exports', () => {
  it('exports loadKeys function', async () => {
    const { loadKeys } = await import('../index.js')
    expect(typeof loadKeys).toBe('function')
  })

  it('exports maskKey function', async () => {
    const { maskKey } = await import('../index.js')
    expect(typeof maskKey).toBe('function')
  })

  it('exports KeyPool class', async () => {
    const { KeyPool } = await import('../index.js')
    expect(typeof KeyPool).toBe('function')
  })

  it('exports error types', async () => {
    const { AllKeysExhaustedError, NoValidKeysError } = await import('../index.js')
    expect(typeof AllKeysExhaustedError).toBe('function')
    expect(typeof NoValidKeysError).toBe('function')
  })

  it('exports all key management functions', async () => {
    const index = await import('../index.js')
    expect(index).toHaveProperty('loadKeys')
    expect(index).toHaveProperty('maskKey')
    expect(index).toHaveProperty('validateKey')
    expect(index).toHaveProperty('queryQuota')
    expect(index).toHaveProperty('createQuotaTracker')
    expect(index).toHaveProperty('KeyPool')
    expect(index).toHaveProperty('RandomSelector')
    expect(index).toHaveProperty('RoundRobinSelector')
    expect(index).toHaveProperty('PrioritySelector')
  })
})
