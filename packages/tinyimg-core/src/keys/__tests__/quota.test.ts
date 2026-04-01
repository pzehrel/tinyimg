import https from 'node:https'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockClientRequest } from '../../compress/__tests__/fixtures'
import { clearCompressionCountCache, createQuotaTracker, getCachedCompressionCount, queryQuota, updateCompressionCountCache } from '../quota'

describe('queryQuota', () => {
  let requestSpy: any

  beforeEach(() => {
    requestSpy = vi.spyOn(https, 'request')
    clearCompressionCountCache()
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
            fn(Buffer.from(JSON.stringify({ compressionCount: 42 })))
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
            fn(Buffer.from(JSON.stringify({})))
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
            fn(Buffer.from(JSON.stringify({ compressionCount: 0 })))
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
            fn(Buffer.from(JSON.stringify({ compressionCount: 500 })))
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
            fn(Buffer.from(JSON.stringify({ compressionCount: 501 })))
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

describe('compression-count cache', () => {
  let requestSpy: any

  beforeEach(() => {
    requestSpy = vi.spyOn(https, 'request')
    clearCompressionCountCache()
  })

  it('should cache compression-count on first queryQuota call', async () => {
    // Arrange: Mock HTTPS response with compressionCount: 42
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
            fn(Buffer.from(JSON.stringify({ compressionCount: 42 })))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)
      return createMockClientRequest()
    })

    // Act: First call
    const result1 = await queryQuota('test-key')

    // Assert: HTTP request sent
    expect(requestSpy).toHaveBeenCalledTimes(2) // validateKey + getCompressionCount
    expect(result1).toBe(458) // 500 - 42

    // Act: Second call (should use cache)
    const result2 = await queryQuota('test-key')

    // Assert: No additional HTTP requests (cache hit)
    expect(requestSpy).toHaveBeenCalledTimes(2) // Still 2 (no new calls)
    expect(result2).toBe(458)
  })

  it('should isolate cache by API key', async () => {
    // Arrange: Mock different compression counts for different keys
    let callCount = 0
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      callCount++
      const count = callCount <= 2 ? 10 : 20 // First key: 10, Second key: 20
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
            fn(Buffer.from(JSON.stringify({ compressionCount: count })))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)
      return createMockClientRequest()
    })

    // Act: Query two different keys
    const result1 = await queryQuota('key1')
    const result2 = await queryQuota('key2')

    // Assert: Different results (cache isolated)
    expect(result1).toBe(490) // 500 - 10
    expect(result2).toBe(480) // 500 - 20
  })

  it('should update cache via updateCompressionCountCache()', async () => {
    // Arrange: Initial cache value
    updateCompressionCountCache('test-key', 100)

    // Act: Update cache
    updateCompressionCountCache('test-key', 150)

    // Assert: Cache updated
    expect(getCachedCompressionCount('test-key')).toBe(150)
  })

  it('should clear cache via clearCompressionCountCache()', async () => {
    // Arrange: Set cache
    updateCompressionCountCache('test-key', 100)

    // Act: Clear cache
    clearCompressionCountCache()

    // Assert: Cache cleared
    expect(getCachedCompressionCount('test-key')).toBeUndefined()
  })

  it('should return undefined for non-cached key', () => {
    // Act: Get non-cached key
    const result = getCachedCompressionCount('non-existent-key')

    // Assert: Returns undefined
    expect(result).toBeUndefined()
  })
})
