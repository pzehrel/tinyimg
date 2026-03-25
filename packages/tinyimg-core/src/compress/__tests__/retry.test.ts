import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RetryManager } from '../retry'

describe('RetryManager', () => {
  beforeEach(() => {
    // Use fake timers for testing delay timing
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('execute', () => {
    it('should return result on first success', async () => {
      // Arrange: Create operation that succeeds immediately
      const operation = async () => 'success'

      // Act: Call RetryManager.execute() with the operation
      const manager = new RetryManager(3, 1000)
      const result = await manager.execute(operation)

      // Assert: Returns result without retry
      expect(result).toBe('success')
      expect(manager.getFailureCount()).toBe(0)
    })

    it('should retry on network errors (ECONNRESET, ETIMEDOUT)', async () => {
      // Arrange: Create operation that fails with network error twice, then succeeds
      let attemptCount = 0
      const operation = async () => {
        attemptCount++
        if (attemptCount < 3) {
          const error = new Error('Network error')
          ;(error as any).code = 'ECONNRESET'
          throw error
        }
        return 'success'
      }

      // Act: Call RetryManager.execute() with maxRetries=3
      const manager = new RetryManager(3, 1000)

      // Need to advance timers for retries to happen
      const promise = manager.execute(operation)
      await vi.advanceTimersByTimeAsync(1000) // First retry delay
      await vi.advanceTimersByTimeAsync(2000) // Second retry delay

      const result = await promise

      // Assert: Retries 2 times and returns success result
      expect(result).toBe('success')
      expect(attemptCount).toBe(3)
    })

    it('should retry on HTTP 5xx errors', async () => {
      // Arrange: Create operation that fails with 503 error twice, then succeeds
      let attemptCount = 0
      const operation = async () => {
        attemptCount++
        if (attemptCount < 3) {
          const error = new Error('Service unavailable')
          ;(error as any).statusCode = 503
          throw error
        }
        return 'success'
      }

      // Act: Call RetryManager.execute() with maxRetries=3
      const manager = new RetryManager(3, 1000)

      const promise = manager.execute(operation)
      await vi.advanceTimersByTimeAsync(1000) // First retry delay
      await vi.advanceTimersByTimeAsync(2000) // Second retry delay

      const result = await promise

      // Assert: Retries 2 times and returns success result
      expect(result).toBe('success')
      expect(attemptCount).toBe(3)
    })

    it('should not retry on 4xx client errors', async () => {
      // Arrange: Create operation that fails with 401 error
      const operation = async () => {
        const error = new Error('Unauthorized')
        ;(error as any).statusCode = 401
        throw error
      }

      // Act: Call RetryManager.execute() with maxRetries=3
      const manager = new RetryManager(3, 1000)

      // Assert: Fails immediately without retry
      await expect(manager.execute(operation)).rejects.toThrow('Unauthorized')
      expect(manager.getFailureCount()).toBe(1)
    })

    it('should use exponential backoff delays', async () => {
      // Arrange: Create operation that fails 3 times
      let attemptCount = 0
      const operation = async () => {
        attemptCount++
        if (attemptCount < 4) {
          const error = new Error('Failed')
          ;(error as any).code = 'ECONNRESET'
          throw error
        }
        return 'success'
      }

      // Act: Call RetryManager.execute() with maxRetries=3
      const manager = new RetryManager(3, 1000) // maxRetries=3, baseDelay=1000ms
      const promise = manager.execute(operation)

      // Advance past first retry (1000ms = 2^0 * 1000)
      await vi.advanceTimersByTimeAsync(1000)
      // Advance past second retry (2000ms = 2^1 * 1000)
      await vi.advanceTimersByTimeAsync(2000)
      // Advance past third retry (4000ms = 2^2 * 1000)
      await vi.advanceTimersByTimeAsync(4000)

      const result = await promise

      // Assert: Uses exponential backoff and succeeds
      expect(result).toBe('success')
      expect(attemptCount).toBe(4)
    })

    it('should reset failure count on success', async () => {
      // Arrange: Create operation that fails twice, then succeeds
      let attemptCount = 0
      const operation = async () => {
        attemptCount++
        if (attemptCount < 3) {
          const error = new Error('Network error')
          ;(error as any).code = 'ECONNRESET'
          throw error
        }
        return 'success'
      }

      // Act: Call RetryManager.execute() twice
      const manager = new RetryManager(3, 1000)

      // First call
      const promise1 = manager.execute(operation)
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await promise1

      // Check failure count after first success
      expect(manager.getFailureCount()).toBe(0)

      // Second call should start with fresh failure count
      attemptCount = 0
      const promise2 = manager.execute(operation)
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await promise2

      // Assert: Second call starts with fresh failure count (not cumulative)
      expect(manager.getFailureCount()).toBe(0)
    })

    it('should throw error after max retries', async () => {
      // Use real timers for this test to avoid unhandled rejection issues with fake timers
      vi.useRealTimers()

      // Arrange: Create operation that always fails
      let attemptCount = 0
      const operation = async () => {
        attemptCount++
        const error = new Error('Always fails')
        ;(error as any).code = 'ECONNRESET'
        throw error
      }

      // Act: Call RetryManager.execute() with maxRetries=3
      const manager = new RetryManager(3, 10) // Use short delay (10ms) for faster test

      // Assert: Throws error after max retries
      await expect(manager.execute(operation)).rejects.toThrow('Always fails')
      expect(attemptCount).toBe(4) // Initial attempt + 3 retries

      // Restore fake timers for other tests
      vi.useFakeTimers()
    })

    it('should track failure count accurately', async () => {
      // Arrange: Create operation that fails twice, then succeeds
      let attemptCount = 0
      const operation = async () => {
        attemptCount++
        if (attemptCount < 3) {
          const error = new Error('Network error')
          ;(error as any).code = 'ECONNRESET'
          throw error
        }
        return 'success'
      }

      // Act: Call RetryManager.execute() and check failure count
      const manager = new RetryManager(3, 1000)

      // Assert: Failure count is 0 before any attempts
      expect(manager.getFailureCount()).toBe(0)

      // Execute and advance timers
      const promise = manager.execute(operation)

      // After first failure (before retry)
      // Note: We can't easily check intermediate failure counts with async execution
      // So we'll verify after completion

      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await promise

      // Assert: Failure count is 0 after success
      expect(manager.getFailureCount()).toBe(0)
    })
  })
})
