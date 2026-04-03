import kleur from 'kleur'
import { formatBytes } from './format'

export type LogLevel = 'quiet' | 'normal' | 'verbose'

/**
 * 统一的终端日志类
 * 支持 quiet/normal/verbose 三级输出级别
 * 使用统一配色主题（THM-01）
 */
export class TerminalLogger {
  private level: LogLevel = 'normal'

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level
  }

  /**
   * 错误日志 - 总是输出（即使在 quiet 模式）
   * 配色：红色 + ✗ 前缀
   */
  error(message: string): void {
    console.error(kleur.red(`✗ ${message}`))
  }

  /**
   * 成功日志 - normal/verbose 模式输出
   * 配色：绿色 + ✓ 前缀
   */
  success(message: string): void {
    if (this.level !== 'quiet') {
      console.log(kleur.green(`✓ ${message}`))
    }
  }

  /**
   * 警告日志 - normal/verbose 模式输出
   * 配色：黄色 + ⚠ 前缀
   */
  warn(message: string): void {
    if (this.level !== 'quiet') {
      console.warn(kleur.yellow(`⚠ ${message}`))
    }
  }

  /**
   * 信息日志 - normal/verbose 模式输出
   * 配色：青色 + ℹ 前缀
   */
  info(message: string): void {
    if (this.level !== 'quiet') {
      console.log(kleur.cyan(`ℹ ${message}`))
    }
  }

  /**
   * 详细日志 - 仅 verbose 模式输出
   * 配色：灰色
   */
  verbose(message: string): void {
    if (this.level === 'verbose') {
      console.log(kleur.gray(message))
    }
  }

  /**
   * 调试日志 - 仅 verbose 模式输出
   * 配色：灰色 + [debug] 前缀
   */
  debug(message: string): void {
    if (this.level === 'verbose') {
      console.log(kleur.gray(`[debug] ${message}`))
    }
  }

  /**
   * 列表项输出 - normal/verbose 模式输出
   * 根据文件大小分级着色：
   * - <300KB = 绿色
   * - 300-600KB = 青色
   * - 600KB-1MB = 黄色
   * - 1-1.5MB = 洋红
   * - >1.5MB = 红色
   */
  listItem(name: string, size: number): void {
    if (this.level === 'quiet') {
      return
    }

    const sizeStr = formatBytes(size)
    let coloredName: string

    if (size < 300 * 1024) {
      coloredName = kleur.green(name)
    }
    else if (size < 600 * 1024) {
      coloredName = kleur.cyan(name)
    }
    else if (size < 1024 * 1024) {
      coloredName = kleur.yellow(name)
    }
    else if (size < 1.5 * 1024 * 1024) {
      coloredName = kleur.magenta(name)
    }
    else {
      coloredName = kleur.red(name)
    }

    console.log(`${coloredName} (${sizeStr})`)
  }

  /**
   * 格式化压缩结果（返回无颜色字符串）
   * 格式："{basename}: {originalSize} → {compressedSize} ({savedPercent}% saved)"
   */
  formatResult(inputPath: string, originalSize: number, compressedSize: number): string {
    const basename = inputPath.split(/[/\\]/).pop() || inputPath
    const savedBytes = originalSize - compressedSize
    const savedPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : '0.0'

    return `${basename}: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savedPercent}% saved)`
  }
}

/**
 * 全局单例 logger 实例
 */
export const logger = new TerminalLogger()
