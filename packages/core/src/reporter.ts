import type { CompressFileResult } from './compress-file'
import { formatSize } from './utils/format'

export interface Reporter {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export interface ReporterOptions {
  t: (key: string, params?: Record<string, string | number>) => string
  reporter: Reporter
  target?: 'cli' | 'plugin'
  verbose?: boolean
}

export interface ReporterSummary {
  total: number
  success: number
  cached: number
  converted?: number
  failed: number
  saved: number
  alreadyProcessed?: number
  compressionCount?: number
  totalOriginalSize?: number
  totalCompressedSize?: number
}

class StatsCollector {
  total = 0
  success = 0
  failed = 0
  cached = 0
  converted = 0
  alreadyProcessed = 0
  saved = 0
  totalOriginalSize = 0
  totalCompressedSize = 0
  compressionCount?: number

  track(result: CompressFileResult): boolean {
    this.total++
    this.totalOriginalSize += result.originalSize
    this.totalCompressedSize += result.compressedSize
    if (result.error) {
      this.failed++
      return false
    }
    if (result.alreadyProcessed)
      this.alreadyProcessed++
    else if (result.cached)
      this.cached++
    else this.success++
    if (result.convertedPngToJpg)
      this.converted++
    this.saved += result.originalSize - result.compressedSize
    if (typeof result.compressionCount === 'number')
      this.compressionCount = Math.max(this.compressionCount || 0, result.compressionCount)
    return true
  }

  getSummary(): ReporterSummary {
    return {
      total: this.total,
      success: this.success,
      cached: this.cached,
      converted: this.converted,
      failed: this.failed,
      saved: this.saved,
      alreadyProcessed: this.alreadyProcessed,
      compressionCount: this.compressionCount,
      totalOriginalSize: this.totalOriginalSize,
      totalCompressedSize: this.totalCompressedSize,
    }
  }
}

function size(bytes: number): string {
  return formatSize(bytes).replace(/(KB|MB|B)$/, ' $1')
}
function change(before: number, after: number): string {
  if (before <= 0 || before === after)
    return ''
  const percent = (after - before) / before * 100
  if (Math.abs(percent) < 0.05)
    return ''
  return `${percent > 0 ? '+' : '−'}${Math.abs(percent).toFixed(1)}%`
}
function clean(text: string): string {
  return text.replace(/[\r\n\t]+/g, ' ')
}

export function createReporter(options: ReporterOptions) {
  const { t, reporter, target = 'cli', verbose = false } = options
  const stats = new StatsCollector()
  const items: Array<{ name: string, result: CompressFileResult }> = []

  return {
    track(result: CompressFileResult): boolean {
      return stats.track(result)
    },
    getSummary(): ReporterSummary {
      return stats.getSummary()
    },
    logStart(count: number): void {
      if (count > 0)
        reporter.info(t(count === 1 ? 'log.startOne' : 'log.start', { count }))
    },
    logItem(name: string, result: CompressFileResult): void {
      if (result.cacheWarning)
        reporter.warn(t('log.cacheWarning', { name: clean(name), message: clean(result.cacheWarning) }))
      if (verbose)
        items.push({ name: clean(name), result })
    },
    logError(name: string, result: CompressFileResult): void {
      reporter.error(`${clean(name)}: ${clean(result.error?.message || 'Unknown error')}`)
    },
    logSummary(summary?: ReporterSummary): void {
      const s = summary ?? stats.getSummary()
      if (!s.total)
        return
      const width = Math.min(60, Math.max(0, ...items.map(item => item.name.length)))
      for (const { name, result } of items.sort((a, b) => a.name.localeCompare(b.name))) {
        const tags: string[] = []
        if (result.alreadyProcessed)
          tags.push(t('cli.output.alreadyProcessed'))
        else if (result.cached)
          tags.push(t('cli.output.usedCache'))
        if (result.convertedPngToJpg)
          tags.push(t('log.converted'))
        const delta = change(result.originalSize, result.compressedSize)
        const sizes = result.alreadyProcessed && !result.convertedPngToJpg
          ? size(result.compressedSize)
          : `${size(result.originalSize)} → ${size(result.compressedSize)}${delta ? ` (${delta})` : ''}`
        reporter.info(`  ${name.padEnd(width)}  ${sizes}${tags.length ? ` · ${tags.join(' · ')}` : ''}`)
      }
      items.length = 0
      const parts = [t(s.total === 1 ? 'log.image' : 'log.images', { count: s.total })]
      for (const [key, count] of [['log.compressed', s.success], ['log.cached', s.cached], ['log.processed', s.alreadyProcessed], ['log.convertedCount', s.converted], ['log.failed', s.failed]] as const) {
        if (count)
          parts.push(t(key, { count }))
      }
      if (s.totalOriginalSize !== undefined && s.totalCompressedSize !== undefined) {
        const delta = change(s.totalOriginalSize, s.totalCompressedSize)
        parts.push(`${size(s.totalOriginalSize)} → ${size(s.totalCompressedSize)}${delta ? ` (${delta})` : ''}`)
      }
      reporter.info(parts.join(' · '))
    },
    logConvertiblePngs(count: number): void {
      if (count > 0)
        reporter.info(t(`log.conversionHint.${target}`, { count }))
    },
    logNoKeysHint(): void {
      reporter.warn(t('cli.output.noKeysHint'))
    },
  }
}
