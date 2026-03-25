import { describe, expect, test, vi } from 'vitest'
import { CompressionStats } from './stats'
import { TinyimgLogger } from './logger'

describe('CompressionStats', () => {
  describe('recordCompressed', () => {
    test('increments compressed count', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)

      const summary = stats.getSummary()
      expect(summary.compressedCount).toBe(1)
    })

    test('updates original and compressed sizes', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)

      const summary = stats.getSummary()
      expect(summary.originalSize).toBe(15000)
      expect(summary.compressedSize).toBe(8000)
    })

    test('accumulates multiple compressed files', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)
      stats.recordCompressed('assets/icon.png', 5000, 3000)

      const summary = stats.getSummary()
      expect(summary.compressedCount).toBe(2)
      expect(summary.originalSize).toBe(20000)
      expect(summary.compressedSize).toBe(11000)
    })

    test('stores file result', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)

      const results = stats.getFileResults()
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        path: 'assets/logo.png',
        originalSize: 15000,
        compressedSize: 8000,
        cached: false,
      })
    })
  })

  describe('recordCached', () => {
    test('increments cached count', () => {
      const stats = new CompressionStats()
      stats.recordCached('assets/logo.png', 8000)

      const summary = stats.getSummary()
      expect(summary.cachedCount).toBe(1)
    })

    test('updates sizes with cached file size', () => {
      const stats = new CompressionStats()
      stats.recordCached('assets/logo.png', 8000)

      const summary = stats.getSummary()
      expect(summary.originalSize).toBe(8000)
      expect(summary.compressedSize).toBe(8000)
    })

    test('stores file result with cached flag', () => {
      const stats = new CompressionStats()
      stats.recordCached('assets/logo.png', 8000)

      const results = stats.getFileResults()
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        path: 'assets/logo.png',
        originalSize: 8000,
        compressedSize: 8000,
        cached: true,
      })
    })
  })

  describe('recordError', () => {
    test('stores error without affecting sizes', () => {
      const stats = new CompressionStats()
      stats.recordError('assets/logo.png', 'All keys exhausted')

      const summary = stats.getSummary()
      expect(summary.compressedCount).toBe(0)
      expect(summary.cachedCount).toBe(0)
      expect(summary.originalSize).toBe(0)
      expect(summary.compressedSize).toBe(0)
    })

    test('stores file result with error', () => {
      const stats = new CompressionStats()
      stats.recordError('assets/logo.png', 'All keys exhausted')

      const results = stats.getFileResults()
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        path: 'assets/logo.png',
        originalSize: 0,
        cached: false,
        error: 'All keys exhausted',
      })
    })
  })

  describe('getSummary', () => {
    test('calculates bytes saved correctly', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)
      stats.recordCompressed('assets/icon.png', 5000, 3000)

      const summary = stats.getSummary()
      expect(summary.bytesSaved).toBe(9000) // (15000-8000) + (5000-3000)
    })

    test('calculates total file count', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)
      stats.recordCached('assets/icon.png', 3000)
      stats.recordError('assets/banner.png', 'Network error')

      const summary = stats.getSummary()
      expect(summary.fileCount).toBe(3)
    })
  })

  describe('formatSummary', () => {
    test('formats normal summary with compressed and cached files', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)
      stats.recordCompressed('assets/icon.png', 5000, 3000)
      stats.recordCached('assets/banner.png', 4000)

      const lines = stats.formatSummary()
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe('✓ [tinyimg] Compressed 3 images (1 cached, 2 compressed)')
      expect(lines[1]).toMatch(/✓ \[tinyimg\] Saved \d+\.\d+ KB \(original: \d+\.\d+ KB → compressed: \d+\.\d+ KB\)/)
    })

    test('formats silent message when all files cached', () => {
      const stats = new CompressionStats()
      stats.recordCached('assets/logo.png', 8000)
      stats.recordCached('assets/icon.png', 3000)

      const lines = stats.formatSummary()
      expect(lines).toHaveLength(1)
      expect(lines[0]).toBe('[tinyimg] All images cached (0 compressed, 2 cached)')
    })

    test('handles zero compressed files with cached files', () => {
      const stats = new CompressionStats()
      stats.recordCached('assets/logo.png', 8000)

      const lines = stats.formatSummary()
      expect(lines).toHaveLength(1)
      expect(lines[0]).toBe('[tinyimg] All images cached (0 compressed, 1 cached)')
    })

    test('handles mixed compressed and cached with errors', () => {
      const stats = new CompressionStats()
      stats.recordCompressed('assets/logo.png', 15000, 8000)
      stats.recordCached('assets/icon.png', 3000)
      stats.recordError('assets/banner.png', 'Network error')

      const lines = stats.formatSummary()
      expect(lines).toHaveLength(2)
      expect(lines[0]).toBe('✓ [tinyimg] Compressed 3 images (1 cached, 1 compressed)')
      expect(lines[1]).toMatch(/✓ \[tinyimg\] Saved \d+\.\d+ KB \(original: \d+\.\d+ KB → compressed: \d+\.\d+ KB\)/)
    })
  })
})

describe('TinyimgLogger', () => {
  test('initializes with verbose mode', () => {
    const logger = new TinyimgLogger({ verbose: true })
    const stats = logger.getStats()
    expect(stats).toBeInstanceOf(CompressionStats)
  })

  test('initializes with summary mode', () => {
    const logger = new TinyimgLogger({ verbose: false })
    const stats = logger.getStats()
    expect(stats).toBeInstanceOf(CompressionStats)
  })

  test('tracks compression statistics', () => {
    const logger = new TinyimgLogger()
    logger.logCompressed('assets/logo.png', 15000, 8000)
    logger.logCached('assets/icon.png', 3000)

    const stats = logger.getStats().getSummary()
    expect(stats.compressedCount).toBe(1)
    expect(stats.cachedCount).toBe(1)
    expect(stats.fileCount).toBe(2)
  })

  test('logs individual file in verbose mode', () => {
    const logger = new TinyimgLogger({ verbose: true })
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    logger.logCompressing('assets/logo.png')
    logger.logCompressed('assets/logo.png', 15000, 8000)
    logger.logCacheHit('assets/icon.png', 3000)

    expect(consoleSpy).toHaveBeenCalledTimes(3)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '[tinyimg] Compressing assets/logo.png...')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, '[tinyimg] ✓ Compressed: 15.00 KB → 8.00 KB (46.7% saved)')
    expect(consoleSpy).toHaveBeenNthCalledWith(3, '[tinyimg] Cache hit: assets/icon.png')

    consoleSpy.mockRestore()
  })

  test('logs summary at end', () => {
    const logger = new TinyimgLogger()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    logger.logCompressed('assets/logo.png', 15000, 8000)
    logger.logCached('assets/icon.png', 3000)
    logger.logSummary()

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '✓ [tinyimg] Compressed 2 images (1 cached, 1 compressed)')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, expect.stringMatching(/✓ \[tinyimg\] Saved \d+\.\d+ KB \(original: \d+\.\d+ KB → compressed: \d+\.\d+ KB\)/))

    consoleSpy.mockRestore()
  })

  test('logs warning in non-strict mode', () => {
    const logger = new TinyimgLogger({ strict: false })
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.logError('assets/logo.png', 'All keys exhausted')

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    expect(consoleWarnSpy).toHaveBeenCalledWith('[tinyimg] ⚠ Failed to compress assets/logo.png: All keys exhausted. Using original file.')

    consoleWarnSpy.mockRestore()
  })

  test('logs error in strict mode', () => {
    const logger = new TinyimgLogger({ strict: true })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.logError('assets/logo.png', 'All keys exhausted')

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith('[tinyimg] ✖ Failed to compress assets/logo.png: All keys exhausted. Build failed.')

    consoleErrorSpy.mockRestore()
  })
})
