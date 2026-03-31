import https from 'node:https'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockClientRequest } from '../../compress/__tests__/fixtures'
import { createQuotaTracker, queryQuota } from '../quota'

describe('queryQuota', () => {
  let requestSpy: any

  beforeEach(() => {
    requestSpy = vi.spyOn(https, 'request')
  })

  it('should return remaining quota for valid API key', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 200,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(JSON.stringify({ compressionCount: 42 }))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('valid-api-key')
    expect(result).toBe(458) // 500 - 42
  })

  it('should return 500 when compressionCount is missing', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 200,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(JSON.stringify({}))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('test-api-key')
    expect(result).toBe(500) // 500 - 0
  })

  it('should return 0 when compressionCount is 0', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 200,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(JSON.stringify({ compressionCount: 0 }))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('test-api-key')
    expect(result).toBe(500) // 500 - 0
  })

  it('should return 0 for invalid API key (401)', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 401,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn('Unauthorized')
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('invalid-api-key')
    expect(result).toBe(0)
  })

  it('should return 0 for forbidden API key (403)', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 403,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn('Forbidden')
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('forbidden-api-key')
    expect(result).toBe(0)
  })

  it('should return 0 on 500 server error', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 500,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn('Internal Server Error')
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('test-api-key')
    expect(result).toBe(0) // Catch block returns 0
  })

  it('should return 0 on 503 service unavailable', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 503,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn('Service Unavailable')
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('test-api-key')
    expect(result).toBe(0) // Catch block returns 0
  })

  it('should return 0 on 429 rate limit', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 429,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn('Too Many Requests')
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('test-api-key')
    expect(result).toBe(0)
  })

  it('should return 0 when quota is exhausted (500 used)', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 200,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(JSON.stringify({ compressionCount: 500 }))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('test-api-key')
    expect(result).toBe(0) // 500 - 500 = 0
  })

  it('should return 0 when quota is over limit (501 used)', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 200,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(JSON.stringify({ compressionCount: 501 }))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await queryQuota('test-api-key')
    expect(result).toBe(0) // Math.max(0, 500 - 501) = 0
  })
})

describe('quotaTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create quota tracker with correct initial values', () => {
    const tracker = createQuotaTracker('test-key', 100)
    expect(tracker.key).toBe('test-key')
    expect(tracker.remaining).toBe(100)
    expect(tracker.localCounter).toBe(100)
    expect(tracker.isZero()).toBe(false)
  })

  it('should decrement quota correctly', () => {
    const tracker = createQuotaTracker('test-key', 10)
    expect(tracker.remaining).toBe(10)
    expect(tracker.localCounter).toBe(10)

    tracker.decrement()
    expect(tracker.localCounter).toBe(9)

    tracker.decrement()
    expect(tracker.localCounter).toBe(8)
  })

  it('should detect zero quota', () => {
    const tracker = createQuotaTracker('test-key', 1)
    expect(tracker.isZero()).toBe(false)

    tracker.decrement()
    expect(tracker.isZero()).toBe(true)
  })

  it('should not decrement below zero', () => {
    const tracker = createQuotaTracker('test-key', 1)
    expect(tracker.localCounter).toBe(1)

    tracker.decrement()
    expect(tracker.localCounter).toBe(0)

    tracker.decrement() // Should not go below 0
    expect(tracker.localCounter).toBe(0)
  })

  it('should handle initial zero quota', () => {
    const tracker = createQuotaTracker('test-key', 0)
    expect(tracker.remaining).toBe(0)
    expect(tracker.localCounter).toBe(0)
    expect(tracker.isZero()).toBe(true)

    tracker.decrement() // Should not go below 0
    expect(tracker.localCounter).toBe(0)
  })

  it('should log warning when quota exhausted', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn')
    const tracker = createQuotaTracker('test-key', 1)

    tracker.decrement() // This should trigger warning

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '⚠ Key test****-key quota exhausted, switching to next key',
    )
  })

  it('should not log warning when quota not exhausted', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn')
    const tracker = createQuotaTracker('test-key', 10)

    tracker.decrement()

    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })
})
