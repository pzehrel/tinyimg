import { logWarning } from '../utils/logger'

export class RetryManager {
  private failureCount = 0

  constructor(
    private maxRetries: number = 8,
    private baseDelay: number = 1000, // 1 second
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation()
        this.failureCount = 0 // Reset on success
        return result
      }
      catch (error) {
        this.failureCount++

        if (attempt === this.maxRetries || !this.shouldRetry(error)) {
          throw error
        }

        const delay = this.baseDelay * Math.pow(2, attempt)
        logWarning(`Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`)
        await this.sleep(delay)
      }
    }

    throw new Error('Max retries exceeded')
  }

  private shouldRetry(error: any): boolean {
    // Network errors
    if (error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return true
    }

    // HTTP 5xx server errors
    if (error.statusCode && error.statusCode >= 500 && error.statusCode < 600) {
      return true
    }

    // Don't retry on 4xx client errors
    return false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getFailureCount(): number {
    return this.failureCount
  }

  reset(): void {
    this.failureCount = 0
  }
}
