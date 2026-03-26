import { formatBytes } from '@pz4l/tinyimg-core'
import { CompressionStats } from './stats'

export interface LoggerOptions {
  verbose?: boolean
  strict?: boolean
}

export class TinyimgLogger {
  private stats: CompressionStats
  private verbose: boolean
  private strict: boolean

  constructor(options: LoggerOptions = {}) {
    this.verbose = options.verbose ?? false
    this.strict = options.strict ?? false
    this.stats = new CompressionStats()
  }

  logCompressing(path: string): void {
    if (this.verbose) {
      console.log(`[tinyimg] Compressing ${path}...`)
    }
  }

  logCompressed(path: string, originalSize: number, compressedSize: number): void {
    this.stats.recordCompressed(path, originalSize, compressedSize)

    if (this.verbose) {
      const saved = ((1 - compressedSize / originalSize) * 100).toFixed(1)
      console.log(`[tinyimg] ✓ Compressed: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${saved}% saved)`)
    }
  }

  logCacheHit(path: string, size: number): void {
    this.stats.recordCached(path, size)

    if (this.verbose) {
      console.log(`[tinyimg] Cache hit: ${path}`)
    }
  }

  logError(path: string, error: string): void {
    this.stats.recordError(path, error)

    if (this.strict) {
      // Strict mode (D-13)
      console.error(`[tinyimg] ✖ Failed to compress ${path}: ${error}. Build failed.`)
    }
    else {
      // Non-strict mode (D-12)
      console.warn(`[tinyimg] ⚠ Failed to compress ${path}: ${error}. Using original file.`)
    }
  }

  logSummary(): void {
    const lines = this.stats.formatSummary()
    lines.forEach(line => console.log(line))
  }

  getStats(): CompressionStats {
    return this.stats
  }

  shouldThrowOnError(): boolean {
    return this.strict
  }
}

export function createLogger(options: LoggerOptions = {}): TinyimgLogger {
  return new TinyimgLogger(options)
}
