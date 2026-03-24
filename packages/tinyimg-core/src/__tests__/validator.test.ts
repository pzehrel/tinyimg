import { describe, it, expect, vi } from 'vitest'
import { validateKey } from '../keys/validator.js'

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

import tinify from 'tinify'

// Create error classes
class AccountError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccountError'
  }
}

class ConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectionError'
  }
}

class ServerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServerError'
  }
}

describe('Key Validation', () => {
  it('returns true for valid key', async () => {
    vi.mocked(tinify.validate).mockResolvedValue(undefined as never)
    const result = await validateKey('valid_key_123456')
    expect(result).toBe(true)
  })

  it('returns false for invalid key (AccountError)', async () => {
    const err = new AccountError('Invalid credentials')
    vi.mocked(tinify.validate).mockRejectedValue(err as never)
    const result = await validateKey('invalid_key')
    expect(result).toBe(false)
  })

  it('throws for network errors (ConnectionError)', async () => {
    const err = new ConnectionError('Network error')
    vi.mocked(tinify.validate).mockRejectedValue(err as never)
    await expect(validateKey('test_key')).rejects.toThrow('Network error')
  })

  it('throws for server errors (ServerError)', async () => {
    const err = new ServerError('Server error')
    vi.mocked(tinify.validate).mockRejectedValue(err as never)
    await expect(validateKey('test_key')).rejects.toThrow('Server error')
  })

  it('uses tinify.validate() method', async () => {
    vi.mocked(tinify.validate).mockResolvedValue(undefined as never)
    await validateKey('test_key')
    expect(tinify.validate).toHaveBeenCalled()
  })
})
