import type { CompressFileOptions } from '@pzehrel/tinyimg-core'
import type { RsbuildPlugin } from '@rsbuild/core'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { canConvertToJpg, compressFile, initKeyManager, listProjectKeys, listUserKeys, resolveProjectKeysFromEnv } from '@pzehrel/tinyimg-core'
import { createLocaleI18n } from '@pzehrel/tinyimg-locale'
import pLimit from 'p-limit'

const t = createLocaleI18n()

export interface PluginOptions extends Omit<CompressFileOptions, 'filePath'> {
  /**
   * Compression strategy.
   * - `API_ONLY`: always use the TinyPNG API.
   * - `RANDOM`: randomly choose between API and web compressor.
   * - `API_FIRST`: prefer API, fallback to web compressor on 401/429.
   * - `AUTO`: same as `API_FIRST` when an API key is available, otherwise `RANDOM`.
   * @default 'AUTO'
   */
  strategy?: 'API_ONLY' | 'RANDOM' | 'API_FIRST' | 'AUTO'

  /**
   * Maximum allowed file size in bytes. Images larger than this will be
   * pre-compressed locally before being sent to the remote compressor.
   * @default 5 * 1024 * 1024
   */
  maxFileSize?: number

  /**
   * Whether to convert PNG images without an alpha channel to JPG.
   * @default false
   */
  convertPngToJpg?: boolean

  /**
   * Maximum number of images to compress in parallel.
   * @default 3
   */
  parallel?: number
}

export default function tinyimgRsbuild(options: PluginOptions = {}): RsbuildPlugin {
  return {
    name: 'tinyimg-rsbuild',
    setup(api) {
      api.onBeforeBuild(() => {
        initKeyManager({
          projectKeys: resolveProjectKeysFromEnv(process.env),
          useUserKeys: process.env.USE_USER_TINYIMG_KEYS === 'true',
        })
      })

      api.processAssets({ stage: 'additions' }, async ({ assets, sources, compilation }) => {
        const limit = pLimit(options.parallel || 3)
        const images = Object.keys(assets).filter(name => /\.(?:png|jpg|jpeg|webp|avif)$/.test(name))
        const logger = api.logger

        let success = 0
        let cached = 0
        let failed = 0
        let saved = 0
        let compressionCount: number | undefined
        const convertiblePngs: string[] = []

        await Promise.all(
          images.map(name =>
            limit(async () => {
              const asset = assets[name]
              if (!asset) {
                return
              }

              const buf = Buffer.from(asset.source())
              const tmpPath = path.join(os.tmpdir(), `tinyimg-${Date.now()}-${path.basename(name)}`)
              await fs.writeFile(tmpPath, buf)

              const isPng = name.toLowerCase().endsWith('.png')
              if (isPng && await canConvertToJpg(tmpPath)) {
                convertiblePngs.push(name)
              }

              const result = await compressFile({
                filePath: tmpPath,
                strategy: options.strategy,
                maxFileSize: options.maxFileSize,
                convertPngToJpg: options.convertPngToJpg,
              })

              await fs.unlink(tmpPath).catch(() => {})

              if (result.error) {
                failed++
                const errorMsg = String(result.error.message || 'Unknown error').replace(/\n/g, ' ')
                const compressorName = (result.error as any).compressor || result.compressor
                logger.error(`${t('status.failed')} ${name.padEnd(40)} ${t('cli.output.failed')} ${errorMsg} (${compressorName})`)
                return
              }

              compilation.updateAsset(name, new sources.RawSource(result.buffer))

              if (result.cached) {
                cached++
              }
              else {
                success++
                saved += result.originalSize - result.compressedSize
              }

              if (typeof result.compressionCount === 'number') {
                compressionCount = result.compressionCount
              }

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
              logger.info(`${t('status.success')} ${name.padEnd(40)} ${origStr}\u2192${compStr}${formatExtras(extras)}`)
            }),
          ),
        )

        if (images.length > 0) {
          const summaryParts = [
            t('cli.output.compressionComplete'),
            `${t('cli.output.total')}: ${images.length}`,
            `${t('cli.output.success')}: ${success}`,
            `${t('cli.output.cached')}: ${cached}`,
            `${t('summary.failed')}: ${failed}`,
            `${t('cli.output.saved')}: ${formatSize(saved)}`,
          ]
          if (typeof compressionCount === 'number') {
            summaryParts.push(`${t('cli.output.usedThisMonth')}: ${compressionCount}`)
          }
          logger.info(summaryParts.join('  '))
        }

        if (convertiblePngs.length > 0) {
          logger.warn(t('cli.output.convertiblePngsHint', { count: convertiblePngs.length }))
          logger.warn(t('cli.output.convertiblePngsCommand'))
        }

        const projectKeys = listProjectKeys()
        const userKeys = await listUserKeys()
        if (projectKeys.length === 0 && userKeys.length === 0) {
          logger.warn(t('cli.output.noKeysHint'))
        }
      })
    },
  }
}

function formatExtras(tags: (string | undefined)[]): string {
  const filtered = tags.filter((t): t is string => typeof t === 'string')
  return filtered.length ? ` (${filtered.join(', ')})` : ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
