import type { CompressFileResult } from './compress-file'
import kleur from 'kleur'
import { formatExtras, formatSize } from './utils/format'

export interface Reporter {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export interface ReporterOptions {
  t: (key: string, params?: Record<string, string | number>) => string
  reporter: Reporter
}

export interface ReporterSummary {
  total: number
  success: number
  cached: number
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
  alreadyProcessed = 0
  saved = 0
  totalOriginalSize = 0
  totalCompressedSize = 0
  compressionCount?: number

  track(result: CompressFileResult): 'success' | 'failed' {
    this.total++
    this.totalOriginalSize += result.originalSize
    this.totalCompressedSize += result.compressedSize

    if (result.error) {
      this.failed++
      return 'failed'
    }

    if (result.alreadyProcessed) {
      this.alreadyProcessed++
    }
    else if (result.cached) {
      this.cached++
    }
    else {
      this.success++
      this.saved += result.originalSize - result.compressedSize
    }

    if (typeof result.compressionCount === 'number') {
      this.compressionCount = result.compressionCount
    }

    return 'success'
  }

  getSummary(): ReporterSummary {
    return {
      total: this.total,
      success: this.success,
      cached: this.cached,
      failed: this.failed,
      saved: this.saved,
      alreadyProcessed: this.alreadyProcessed,
      compressionCount: this.compressionCount,
      totalOriginalSize: this.totalOriginalSize,
      totalCompressedSize: this.totalCompressedSize,
    }
  }
}

export function createReporter(options: ReporterOptions) {
  const { t, reporter } = options
  const stats = new StatsCollector()

  return {
    track(result: CompressFileResult): boolean {
      return stats.track(result) === 'success'
    },

    getSummary(): ReporterSummary {
      return stats.getSummary()
    },

    logItem(name: string, result: CompressFileResult): void {
      const ratio = Math.round((1 - result.compressedSize / result.originalSize) * 100)
      const origStr = formatSize(result.originalSize)
      const compStr = formatSize(result.compressedSize)
      const extras: (string | undefined)[] = []
      if (result.alreadyProcessed) {
        extras.push(t('cli.output.alreadyProcessed'))
      }
      else {
        extras.push(`-${ratio}%`)
        if (result.cached) {
          extras.push(t('cli.output.usedCache'))
        }
      }
      if (result.convertedPngToJpg) {
        extras.push(t('plugin.output.converted'))
      }
      reporter.info(`${kleur.green(t('status.success'))} ${name.padEnd(40)} ${origStr}\u2192${compStr}${formatExtras(extras)}`)
    },

    logError(name: string, result: CompressFileResult): void {
      const errorMsg = String(result.error?.message || 'Unknown error').replace(/\n/g, ' ')
      const compressorName = (result.error as any)?.compressor || result.compressor
      reporter.error(`${kleur.red(t('status.failed'))} ${name.padEnd(40)} ${kleur.red().bold(t('cli.output.failed'))} ${errorMsg} ${kleur.gray(`(${compressorName})`)}`)
    },

    logSummary(summary?: ReporterSummary): void {
      const s = summary ?? stats.getSummary()
      const parts = [
        t('cli.output.compressionComplete'),
        `${t('cli.output.total')}: ${s.total}`,
        `${t('cli.output.success')}: ${s.success}`,
        `${t('cli.output.cached')}: ${s.cached}`,
        `${t('summary.failed')}: ${s.failed}`,
        `${t('cli.output.saved')}: ${formatSize(s.saved)}`,
      ]
      if (typeof s.alreadyProcessed === 'number' && s.alreadyProcessed > 0) {
        parts.push(`${t('summary.processed')}: ${s.alreadyProcessed}`)
      }
      if (typeof s.compressionCount === 'number') {
        parts.push(`${t('cli.output.usedThisMonth')}: ${s.compressionCount}`)
      }
      if (typeof s.totalOriginalSize === 'number') {
        parts.push(`${t('cli.output.originalSize')}: ${formatSize(s.totalOriginalSize)}`)
      }
      if (typeof s.totalCompressedSize === 'number') {
        parts.push(`${t('cli.output.compressedSize')}: ${formatSize(s.totalCompressedSize)}`)
      }
      reporter.info(parts.join('  '))
    },

    logConvertiblePngs(count: number): void {
      reporter.warn(kleur.yellow(t('cli.output.convertiblePngsHint', { count })))
      reporter.warn(kleur.yellow(t('cli.output.convertiblePngsCommand')))
    },

    logNoKeysHint(): void {
      reporter.warn(kleur.yellow(t('cli.output.noKeysHint')))
    },
  }
}
