import { formatBytes } from '@pz4l/tinyimg-core'
import kleur from 'kleur'

export type LogLevel = 'quiet' | 'normal' | 'verbose'

/**
 * 统一的终端日志类（unplugin 专用）
 * 支持 quiet/normal/verbose 三级输出级别
 * 内置统计功能，与 CLI TerminalLogger 对齐
 * 使用统一配色主题（THM-01）
 */
export class TerminalLogger {
  private level: LogLevel = 'normal'
  private stats = {
    processed: 0,
    compressed: 0,
    cached: 0,
    errors: 0,
    originalSize: 0,
    compressedSize: 0,
  }

  /**
   * 构造函数
   * @param level - 日志级别，默认为 'normal'
   */
  constructor(level: LogLevel = 'normal') {
    this.level = level
  }

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
   * 记录压缩成功
   * 格式：✓ {path}  {originalSize} → {compressedSize}  -{percent}%
   */
  successCompress(path: string, originalSize: number, compressedSize: number): void {
    if (this.level === 'quiet') {
      return
    }

    // 更新统计
    this.stats.processed++
    this.stats.compressed++
    this.stats.originalSize += originalSize
    this.stats.compressedSize += compressedSize

    // 计算节省百分比
    const savedPercent = originalSize === 0 ? 0 : ((1 - compressedSize / originalSize) * 100)

    // 输出格式：✓ path  original → compressed  -percent%
    console.log(
      `${kleur.green('✓')} ${path}  ${formatBytes(originalSize)} → ${formatBytes(compressedSize)}  -${savedPercent.toFixed(1)}%`,
    )
  }

  /**
   * 记录缓存命中
   * 格式：✓ {path}  {size}  cached
   */
  cacheHit(path: string, size: number): void {
    if (this.level === 'quiet') {
      return
    }

    // 更新统计
    this.stats.processed++
    this.stats.cached++
    this.stats.originalSize += size
    this.stats.compressedSize += size

    // 输出格式：✓ path  size  cached
    console.log(`${kleur.green('✓')} ${path}  ${formatBytes(size)}  cached`)
  }

  /**
   * 记录压缩错误
   * strict=true: 使用 console.error 输出 ✗ 前缀（红色）
   * strict=false: 使用 console.warn 输出 ⚠ 前缀（黄色）
   */
  errorCompress(path: string, message: string, strict: boolean): void {
    // 更新统计（错误总是记录）
    this.stats.processed++
    this.stats.errors++

    if (strict) {
      // Strict mode: 红色错误前缀
      console.error(`${kleur.red('✗')} ${path}  ${message}`)
    }
    else {
      // Non-strict mode: 黄色警告前缀
      console.warn(`${kleur.yellow('⚠')} ${path}  ${message}`)
    }
  }

  /**
   * 信息日志 - normal/verbose 模式输出
   * 配色：青色 + ℹ 前缀
   */
  info(message: string): void {
    if (this.level === 'quiet') {
      return
    }
    console.log(`${kleur.cyan('ℹ')} ${message}`)
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
   * 输出汇总信息
   * 格式与 CLI compress 汇总一致：
   * ✓ Compression complete
   *   Files: N processed, M compressed, K cached
   *   [Errors: E]（如果有错误）
   *   Savings: X.X% avg, Y.Z total
   */
  summary(): void {
    if (this.level === 'quiet' || this.stats.processed === 0) {
      return
    }

    const savedBytes = this.stats.originalSize - this.stats.compressedSize
    const savedPercent = this.stats.originalSize === 0
      ? 0
      : (savedBytes / this.stats.originalSize * 100)

    // 输出汇总
    console.log(`${kleur.green('✓')} Compression complete`)
    console.log(`  Files: ${this.stats.processed} processed, ${this.stats.compressed} compressed, ${this.stats.cached} cached`)

    // 如果有错误，显示错误数量
    if (this.stats.errors > 0) {
      console.log(`  Errors: ${this.stats.errors}`)
    }

    console.log(`  Savings: ${savedPercent.toFixed(1)}% avg, ${formatBytes(savedBytes)} total`)
  }

  /**
   * 获取当前统计信息
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      processed: 0,
      compressed: 0,
      cached: 0,
      errors: 0,
      originalSize: 0,
      compressedSize: 0,
    }
  }
}

/**
 * 全局单例 logger 实例
 */
export const logger = new TerminalLogger()
