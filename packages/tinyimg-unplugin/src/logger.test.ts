import { describe, expect, test } from 'vitest'
import { CompressionStats } from '../stats'

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
      expect(lines[1]).toMatch(/✓ \[tinyimg\] Saved 9\.00 KB \(original: 24\.00 KB → compressed: 15\.00 KB\)/)
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
      expect(lines[1]).toMatch(/✓ \[tinyimg\] Saved 7\.00 KB \(original: 18\.00 KB → compressed: 11\.00 KB\)/)
    })
  })
})

describe('TinyimgLogger', () => {
  test.skip('initializes with verbose mode', () => {
    expect(true).toBe(false)
  })

  test.skip('initializes with summary mode', () => {
    expect(true).toBe(false)
  })

  test.skip('tracks compression statistics', () => {
    expect(true).toBe(false)
  })

  test.skip('logs individual file in verbose mode', () => {
    expect(true).toBe(false)
  })

  test.skip('logs summary at end', () => {
    expect(true).toBe(false)
  })

  test.skip('logs warning in non-strict mode', () => {
    expect(true).toBe(false)
  })

  test.skip('logs error in strict mode', () => {
    expect(true).toBe(false)
  })
})
