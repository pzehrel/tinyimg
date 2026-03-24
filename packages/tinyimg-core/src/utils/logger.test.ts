import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logInfo, logWarning } from './logger'

describe('logger Utility', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  describe('logWarning', () => {
    it('should output warning message', () => {
      logWarning('Test warning')
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠ Test warning')
    })

    it('should handle multiline messages', () => {
      logWarning('Line 1\nLine 2')
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠ Line 1\nLine 2')
    })
  })

  describe('logInfo', () => {
    it('should output info message', () => {
      logInfo('Test info')
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ Test info')
    })

    it('should handle multiline messages', () => {
      logInfo('Line 1\nLine 2')
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ Line 1\nLine 2')
    })
  })
})
