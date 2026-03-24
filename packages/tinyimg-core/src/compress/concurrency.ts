import pLimit from 'p-limit'

/**
 * Create a concurrency limiter for async operations
 *
 * @param concurrency - Max concurrent operations (default: 8)
 * @returns Limit function that wraps async operations
 *
 * @example
 * ```ts
 * const limit = createConcurrencyLimiter(2)
 * const task1 = limit(() => asyncOperation1())
 * const task2 = limit(() => asyncOperation2())
 * await Promise.all([task1, task2])
 * ```
 */
export function createConcurrencyLimiter(concurrency: number = 8) {
  return pLimit(concurrency)
}

/**
 * Execute tasks with concurrency control
 *
 * @param tasks - Array of async functions to execute
 * @param concurrency - Max concurrent tasks (default: 8)
 * @returns Promise resolving to array of results
 *
 * @example
 * ```ts
 * const tasks = [
 *   () => compressImage(buffer1),
 *   () => compressImage(buffer2),
 *   () => compressImage(buffer3)
 * ]
 * const results = await executeWithConcurrency(tasks, 2)
 * // Only 2 compressions run at a time
 * ```
 */
export async function executeWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 8,
): Promise<T[]> {
  const limit = createConcurrencyLimiter(concurrency)

  // Map each task to a limited execution
  const limitedTasks = tasks.map(task => limit(task))

  // Wait for all to complete
  return Promise.all(limitedTasks)
}
