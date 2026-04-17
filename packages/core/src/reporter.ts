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
  compressionCount?: number
}

export function createReporter(options: ReporterOptions) {
  const { t, reporter } = options

  return {
    logItem(name: string, result: CompressFileResult): void {
      const ratio = Math.round((1 - result.compressedSize / result.originalSize) * 100)
      const origStr = formatSize(result.originalSize)
      const compStr = formatSize(result.compressedSize)
      const extras: (string | undefined)[] = [`-${ratio}%`]
      if (result.cached) {
        extras.push(t('cli.output.usedCache'))
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

    logSummary(summary: ReporterSummary): void {
      const parts = [
        t('cli.output.compressionComplete'),
        `${t('cli.output.total')}: ${summary.total}`,
        `${t('cli.output.success')}: ${summary.success}`,
        `${t('cli.output.cached')}: ${summary.cached}`,
        `${t('summary.failed')}: ${summary.failed}`,
        `${t('cli.output.saved')}: ${formatSize(summary.saved)}`,
      ]
      if (typeof summary.compressionCount === 'number') {
        parts.push(`${t('cli.output.usedThisMonth')}: ${summary.compressionCount}`)
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
