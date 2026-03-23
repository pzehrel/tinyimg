import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConcurrencyLimiter, executeWithConcurrency } from '../concurrency'

describe('createConcurrencyLimiter', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('execution control', () => {
    it('should limit concurrent executions to specified limit', async () => {
      // Arrange: Create limiter with concurrency=2
      const limit = createConcurrencyLimiter(2)
      let concurrentCount = 0
      let maxConcurrent = 0

      // Act: Start 5 tasks with delay
      const tasks = Array.from({ length: 5 }, (_, i) =>
        limit(async () => {
          concurrentCount++
          maxConcurrent = Math.max(maxConcurrent, concurrentCount)
          await new Promise(resolve => setTimeout(resolve, 50))
          concurrentCount--
          return i
        }))

      await Promise.all(tasks)

      // Assert: Only 2 tasks run concurrently
      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })

    it('should queue tasks beyond limit', async () => {
      // Arrange: Create limiter with concurrency=2
      const limit = createConcurrencyLimiter(2)
      const results: number[] = []

      // Act: Submit 5 tasks
      const tasks = Array.from({ length: 5 }, (_, i) =>
        limit(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          results.push(i)
          return i
        }))

      await Promise.all(tasks)

      // Assert: All tasks complete (tasks 3-5 were queued)
      expect(results).toHaveLength(5)
      expect(new Set(results)).toEqual(new Set([0, 1, 2, 3, 4]))
    })

    it('should process all tasks when slots available', async () => {
      // Arrange: Create limiter with concurrency=2
      const tasks = [
        () => Promise.resolve(1),
        () => Promise.resolve(2),
        () => Promise.resolve(3),
        () => Promise.resolve(4),
      ]

      // Act: Submit 4 tasks that resolve
      const results = await executeWithConcurrency(tasks, 2)

      // Assert: All 4 tasks complete successfully
      expect(results).toEqual([1, 2, 3, 4])
    })

    it('should handle empty task arrays', async () => {
      // Arrange: Create limiter with concurrency=2
      const tasks: (() => Promise<number>)[] = []

      // Act: Submit empty array of tasks
      const results = await executeWithConcurrency(tasks, 2)

      // Assert: Resolves immediately with empty array
      expect(results).toEqual([])
    })
  })
})
