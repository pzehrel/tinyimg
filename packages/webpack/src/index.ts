import type { CompressFileOptions } from '@pzehrel/tinyimg-core'
import type { Compiler } from 'webpack'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { canConvertToJpg, compressFile, createReporter, initKeyManager, listProjectKeys, listUserKeys, resolveProjectKeysFromEnv } from '@pzehrel/tinyimg-core'
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

export default class TinyimgWebpackPlugin {
  constructor(private options: PluginOptions = {}) {}

  apply(compiler: Compiler) {
    const pluginName = 'TinyimgWebpackPlugin'

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      initKeyManager({
        projectKeys: resolveProjectKeysFromEnv(process.env),
        useUserKeys: process.env.USE_USER_TINYIMG_KEYS === 'true',
      })

      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async () => {
          const limit = pLimit(this.options.parallel || 3)
          const assets = compilation.getAssets()
          const images = assets.filter(a => /\.(?:png|jpg|jpeg|webp|avif)$/.test(a.name))

          if (images.length > 0) {
            console.log()
          }

          let success = 0
          let cached = 0
          let failed = 0
          let saved = 0
          let compressionCount: number | undefined
          const convertiblePngs: string[] = []

          const reporter = createReporter({
            t,
            reporter: {
              info: msg => console.log(`[tinyimg] ${msg}`),
              warn: msg => console.warn(`[tinyimg] ${msg}`),
              error: msg => console.error(`[tinyimg] ${msg}`),
            },
          })

          await Promise.all(
            images.map(asset =>
              limit(async () => {
                const source = compilation.getAsset(asset.name)?.source.source()
                if (!source)
                  return
                const buf = Buffer.isBuffer(source) ? source : Buffer.from(source as string)
                const tmpPath = path.join(os.tmpdir(), `tinyimg-${Date.now()}-${path.basename(asset.name)}`)
                await fs.writeFile(tmpPath, buf)

                const isPng = asset.name.toLowerCase().endsWith('.png')
                if (isPng && await canConvertToJpg(tmpPath)) {
                  convertiblePngs.push(asset.name)
                }

                const result = await compressFile({
                  filePath: tmpPath,
                  strategy: this.options.strategy,
                  maxFileSize: this.options.maxFileSize,
                  convertPngToJpg: this.options.convertPngToJpg,
                })

                await fs.unlink(tmpPath).catch(() => {})

                if (result.error) {
                  failed++
                  reporter.logError(asset.name, result)
                  return
                }

                compilation.updateAsset(asset.name, new compiler.webpack.sources.RawSource(result.buffer))

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

                reporter.logItem(asset.name, result)
              }),
            ),
          )

          if (images.length > 0) {
            reporter.logSummary({
              total: images.length,
              success,
              cached,
              failed,
              saved,
              compressionCount,
            })

            if (convertiblePngs.length > 0) {
              reporter.logConvertiblePngs(convertiblePngs.length)
            }

            const projectKeys = listProjectKeys()
            const userKeys = await listUserKeys()
            if (projectKeys.length === 0 && userKeys.length === 0) {
              reporter.logNoKeysHint()
            }
          }
        },
      )
    })
  }
}
