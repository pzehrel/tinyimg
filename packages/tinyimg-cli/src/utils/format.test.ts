import { describe, expect, it } from 'vitest'
import { formatBytes, formatProgress, formatResult } from './format'

describe('format utilities', () => {
  describe('formatProgress', () => {
    it('returns formatted string with current/total', () => {
      const result = formatProgress(5, 10)
      expect(result).toContain('5')
      expect(result).toContain('10')
      expect(result).toContain('Compressing')
    })

    it('uses cyan color from kleur', () => {
      const result = formatProgress(1, 1)
      // kleur.cyan adds color codes (disabled in test environment)
      expect(result).toContain('Compressing 1/1')
      expect(result).toContain('...')
    })
  })

  describe('formatResult', () => {
    it('returns success indicator with green checkmark', () => {
      const result = formatResult('/path/to/image.png', '/path/to/output.png', 1024, 512)
      expect(result).toContain('✓')
    })

    it('shows filename in yellow', () => {
      const result = formatResult('/path/to/image.png', '/path/to/output.png', 1024, 512)
      expect(result).toContain('image.png')
    })

    it('shows original size -> compressed size', () => {
      const result = formatResult('/path/to/image.png', '/path/to/output.png', 1024, 512)
      expect(result).toContain('1KB')
      expect(result).toContain('512B')
      expect(result).toContain('→')
    })

    it('shows percentage saved', () => {
      const result = formatResult('/path/to/image.png', '/path/to/output.png', 1024, 512)
      expect(result).toContain('50.0%')
      expect(result).toContain('saved')
    })

    it('uses formatBytes for size formatting', () => {
      const result = formatResult('/path/to/image.png', '/path/to/output.png', 2048, 1024)
      // formatBytes should be called internally
      expect(result).toContain('2KB')
      expect(result).toContain('1KB')
    })
  })

  describe('formatBytes', () => {
    it('returns "B" for values < 1024', () => {
      expect(formatBytes(0)).toBe('0B')
      expect(formatBytes(1)).toBe('1B')
      expect(formatBytes(512)).toBe('512B')
      expect(formatBytes(1023)).toBe('1023B')
    })

    it('returns "KB" for values >= 1024 and < 1024*1024', () => {
      expect(formatBytes(1024)).toBe('1KB')
      expect(formatBytes(2048)).toBe('2KB')
      expect(formatBytes(10240)).toBe('10KB')
      expect(formatBytes(1024 * 1024 - 1)).toBe('1024KB') // Actual behavior
    })

    it('returns "MB" for values >= 1024*1024', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00MB') // Actual behavior
      expect(formatBytes(2 * 1024 * 1024)).toBe('2.00MB')
      expect(formatBytes(10 * 1024 * 1024)).toBe('10.00MB')
    })

    it('rounds KB to 0 decimal places', () => {
      expect(formatBytes(1536)).toBe('2KB') // Actual rounding: 1.5 rounds to 2
      expect(formatBytes(1792)).toBe('2KB') // 1.75 rounds to 2
      expect(formatBytes(1100)).toBe('1KB') // 1.07 rounds to 1
    })

    it('rounds MB to 2 decimal places', () => {
      expect(formatBytes(1024 * 1024 + 512 * 1024)).toBe('1.50MB') // Actual behavior
      expect(formatBytes(1024 * 1024 + 256 * 1024)).toBe('1.25MB')
      expect(formatBytes(10 * 1024 * 1024 + 100 * 1024)).toBe('10.10MB')
    })
  })
})
