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
    magenta: (s: string) => s,
  },
}))

describe('terminalLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logger.setLevel('normal')
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('log levels', () => {
    it('quiet mode: error outputs, success/warn/info/verbose do not output', () => {
      logger.setLevel('quiet')

      logger.error('test error')
      logger.success('test success')
      logger.warn('test warn')
      logger.info('test info')
      logger.verbose('test verbose')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('normal mode: success/warn/info output, verbose does not output', () => {
      logger.setLevel('normal')

      logger.success('test success')
      logger.warn('test warn')
      logger.info('test info')
      logger.verbose('test verbose')

      expect(consoleLogSpy).toHaveBeenCalledTimes(3)
      expect(consoleLogSpy).toHaveBeenNthCalledWith(1, expect.stringContaining('test success'))
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, expect.stringContaining('test warn'))
      expect(consoleLogSpy).toHaveBeenNthCalledWith(3, expect.stringContaining('test info'))
    })

    it('verbose mode: all methods output', () => {
      logger.setLevel('verbose')

      logger.success('test success')
      logger.warn('test warn')
      logger.info('test info')
      logger.verbose('test verbose')
      logger.debug('test debug')

      expect(consoleLogSpy).toHaveBeenCalledTimes(5)
    })

    it('getLevel returns current level', () => {
      logger.setLevel('quiet')
      expect(logger.getLevel()).toBe('quiet')

      logger.setLevel('normal')
      expect(logger.getLevel()).toBe('normal')

      logger.setLevel('verbose')
      expect(logger.getLevel()).toBe('verbose')
    })
  })

  describe('prefixes', () => {
    it('success() outputs with ✓ prefix', () => {
      logger.success('message')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓'))
    })

    it('error() outputs with ✗ prefix', () => {
      logger.error('message')
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('✗'))
    })

    it('warn() outputs with ⚠ prefix', () => {
      logger.warn('message')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠'))
    })

    it('info() outputs with ℹ prefix', () => {
      logger.info('message')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'))
    })

    it('debug() outputs with [debug] prefix', () => {
      logger.setLevel('verbose')
      logger.debug('message')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[debug]'))
    })
  })

  describe('listItem', () => {
    it('does not output in quiet mode', () => {
      logger.setLevel('quiet')
      logger.listItem('file.png', 1024)
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('outputs in normal mode', () => {
      logger.setLevel('normal')
      logger.listItem('file.png', 1024)
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    })

    it('includes filename and size in output', () => {
      logger.setLevel('normal')
      logger.listItem('file.png', 1024)
      const output = consoleLogSpy.mock.calls[0][0] as string
      expect(output).toContain('file.png')
      expect(output).toContain('1KB')
    })
  })

  describe('formatResult', () => {
    it('returns plain string without ANSI color codes', () => {
      const result = logger.formatResult('/path/to/image.png', 1024, 512)
      // 检查不包含 ANSI 转义序列 (ESC 字符)
      // eslint-disable-next-line no-control-regex
      expect(result).not.toMatch(/\x1B\[[0-9;]*m/)
    })

    it('includes basename in output', () => {
      const result = logger.formatResult('/path/to/image.png', 1024, 512)
      expect(result).toContain('image.png')
    })

    it('includes original and compressed sizes', () => {
      const result = logger.formatResult('/path/to/image.png', 2048, 1024)
      expect(result).toContain('2KB')
      expect(result).toContain('1KB')
      expect(result).toContain('→')
    })

    it('includes saved percentage', () => {
      const result = logger.formatResult('/path/to/image.png', 1024, 512)
      expect(result).toContain('50.0%')
      expect(result).toContain('saved')
    })

    it('handles zero original size gracefully', () => {
      const result = logger.formatResult('/path/to/image.png', 0, 0)
      expect(result).toContain('0.0%')
    })

    it('handles Windows-style paths', () => {
      const result = logger.formatResult('\\path\\to\\image.png', 1024, 512)
      expect(result).toContain('image.png')
    })
  })

  describe('terminalLogger class', () => {
    it('can create independent instances', () => {
      const logger1 = new TerminalLogger()
      const logger2 = new TerminalLogger()

      logger1.setLevel('quiet')
      logger2.setLevel('verbose')

      expect(logger1.getLevel()).toBe('quiet')
      expect(logger2.getLevel()).toBe('verbose')
    })
  })
})
