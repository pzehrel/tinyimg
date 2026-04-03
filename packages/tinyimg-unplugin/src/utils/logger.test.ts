import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger, TerminalLogger } from './logger'

// 在测试环境中禁用 kleur 颜色
vi.mock('kleur', () => ({
  default: {
    red: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    cyan: (s: string) => s,
    gray: (s: string) => s,
  },
}))

describe('terminalLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logger.setLevel('normal')
    logger.resetStats()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor and setLevel', () => {
    it('default level is normal', () => {
      const testLogger = new TerminalLogger()
      expect(testLogger.getLevel()).toBe('normal')
    })

    it('can set level via constructor', () => {
      const quietLogger = new TerminalLogger('quiet')
      expect(quietLogger.getLevel()).toBe('quiet')

      const verboseLogger = new TerminalLogger('verbose')
      expect(verboseLogger.getLevel()).toBe('verbose')
    })

    it('setLevel changes the level', () => {
      logger.setLevel('quiet')
      expect(logger.getLevel()).toBe('quiet')

      logger.setLevel('verbose')
      expect(logger.getLevel()).toBe('verbose')
    })
  })

  describe('quiet mode', () => {
    beforeEach(() => {
      logger.setLevel('quiet')
    })

    it('successCompress does not output', () => {
      logger.successCompress('test.png', 1000, 500)
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('cacheHit does not output', () => {
      logger.cacheHit('test.png', 1000)
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('info does not output', () => {
      logger.info('test message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('verbose does not output', () => {
      logger.verbose('test message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('summary does not output', () => {
      logger.successCompress('test.png', 1000, 500)
      consoleLogSpy.mockClear()
      logger.summary()
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('errorCompress still outputs in quiet mode', () => {
      logger.errorCompress('test.png', 'error message', true)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)

      logger.errorCompress('test.png', 'warning message', false)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('normal mode', () => {
    beforeEach(() => {
      logger.setLevel('normal')
    })

    it('successCompress outputs', () => {
      logger.successCompress('test.png', 1000, 500)
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test.png'))
    })

    it('cacheHit outputs', () => {
      logger.cacheHit('test.png', 1000)
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('cached'))
    })

    it('info outputs', () => {
      logger.info('test message')
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test message'))
    })

    it('verbose does not output', () => {
      logger.verbose('test message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('summary outputs after processing', () => {
      logger.successCompress('test.png', 1000, 500)
      consoleLogSpy.mockClear()
      logger.summary()
      expect(consoleLogSpy).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Compression complete'))
    })

    it('summary does not output when no files processed', () => {
      logger.summary()
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })
  })

  describe('verbose mode', () => {
    beforeEach(() => {
      logger.setLevel('verbose')
    })

    it('verbose outputs', () => {
      logger.verbose('test message')
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith('test message')
    })

    it('all other methods also output', () => {
      logger.successCompress('test.png', 1000, 500)
      logger.cacheHit('test2.png', 1000)
      logger.info('info message')
      logger.verbose('verbose message')
      expect(consoleLogSpy).toHaveBeenCalledTimes(4)
    })
  })

  describe('prefixes', () => {
    it('successCompress outputs with ✓ prefix', () => {
      logger.successCompress('test.png', 1000, 500)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓'))
    })

    it('cacheHit outputs with ✓ prefix', () => {
      logger.cacheHit('test.png', 1000)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓'))
    })

    it('errorCompress(strict=true) outputs with ✗ prefix via console.error', () => {
      logger.errorCompress('test.png', 'error', true)
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('✗'))
    })

    it('errorCompress(strict=false) outputs with ⚠ prefix via console.warn', () => {
      logger.errorCompress('test.png', 'warning', false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('⚠'))
    })

    it('info outputs with ℹ prefix', () => {
      logger.info('message')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'))
    })
  })

  describe('statistics', () => {
    it('tracks processed count', () => {
      logger.successCompress('test1.png', 1000, 500)
      logger.cacheHit('test2.png', 1000)
      logger.errorCompress('test3.png', 'error', false)

      const stats = logger.getStats()
      expect(stats.processed).toBe(3)
    })

    it('tracks compressed count', () => {
      logger.successCompress('test1.png', 1000, 500)
      logger.successCompress('test2.png', 2000, 1000)

      const stats = logger.getStats()
      expect(stats.compressed).toBe(2)
    })

    it('tracks cached count', () => {
      logger.cacheHit('test1.png', 1000)
      logger.cacheHit('test2.png', 2000)

      const stats = logger.getStats()
      expect(stats.cached).toBe(2)
    })

    it('tracks errors count', () => {
      logger.errorCompress('test1.png', 'error1', true)
      logger.errorCompress('test2.png', 'error2', false)

      const stats = logger.getStats()
      expect(stats.errors).toBe(2)
    })

    it('tracks original and compressed sizes', () => {
      logger.successCompress('test1.png', 1000, 500)
      logger.successCompress('test2.png', 2000, 1500)
      logger.cacheHit('test3.png', 3000)

      const stats = logger.getStats()
      expect(stats.originalSize).toBe(6000) // 1000 + 2000 + 3000
      expect(stats.compressedSize).toBe(5000) // 500 + 1500 + 3000
    })

    it('resetStats clears all statistics', () => {
      logger.successCompress('test.png', 1000, 500)
      logger.resetStats()

      const stats = logger.getStats()
      expect(stats.processed).toBe(0)
      expect(stats.compressed).toBe(0)
      expect(stats.cached).toBe(0)
      expect(stats.errors).toBe(0)
      expect(stats.originalSize).toBe(0)
      expect(stats.compressedSize).toBe(0)
    })
  })

  describe('summary output', () => {
    it('includes correct file counts', () => {
      logger.successCompress('test1.png', 1000, 500)
      logger.cacheHit('test2.png', 1000)

      consoleLogSpy.mockClear()
      logger.summary()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Files: 2 processed, 1 compressed, 1 cached'))
    })

    it('includes savings information', () => {
      logger.successCompress('test.png', 1000, 500)

      consoleLogSpy.mockClear()
      logger.summary()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Savings:'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('total'))
    })

    it('includes errors line when errors exist', () => {
      logger.successCompress('test1.png', 1000, 500)
      logger.errorCompress('test2.png', 'error', false)

      consoleLogSpy.mockClear()
      logger.summary()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Errors: 1'))
    })

    it('does not include errors line when no errors', () => {
      logger.successCompress('test.png', 1000, 500)

      consoleLogSpy.mockClear()
      logger.summary()

      const calls = consoleLogSpy.mock.calls.map(call => call[0])
      expect(calls.some(call => call.includes('Errors:'))).toBe(false)
    })

    it('calculates correct savings percentage', () => {
      // 压缩 1000 -> 500，节省 50%
      logger.successCompress('test.png', 1000, 500)

      consoleLogSpy.mockClear()
      logger.summary()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('50.0%'))
    })
  })

  describe('output format', () => {
    it('successCompress includes arrow and percentage', () => {
      logger.successCompress('test.png', 1000, 500)

      const output = consoleLogSpy.mock.calls[0][0] as string
      expect(output).toContain('→')
      expect(output).toContain('-50.0%')
    })

    it('successCompress handles zero original size', () => {
      logger.successCompress('test.png', 0, 0)

      const output = consoleLogSpy.mock.calls[0][0] as string
      expect(output).toContain('-0.0%')
    })

    it('cacheHit includes cached keyword', () => {
      logger.cacheHit('test.png', 1000)

      const output = consoleLogSpy.mock.calls[0][0] as string
      expect(output).toContain('cached')
    })

    it('summary includes Compression complete', () => {
      logger.successCompress('test.png', 1000, 500)

      consoleLogSpy.mockClear()
      logger.summary()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Compression complete'))
    })
  })

  describe('independent instances', () => {
    it('can create independent logger instances', () => {
      const logger1 = new TerminalLogger('quiet')
      const logger2 = new TerminalLogger('verbose')

      expect(logger1.getLevel()).toBe('quiet')
      expect(logger2.getLevel()).toBe('verbose')
    })

    it('instances have independent statistics', () => {
      const logger1 = new TerminalLogger()
      const logger2 = new TerminalLogger()

      logger1.successCompress('test.png', 1000, 500)

      expect(logger1.getStats().processed).toBe(1)
      expect(logger2.getStats().processed).toBe(0)
    })
  })
})
