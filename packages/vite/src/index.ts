import type { CompressFileOptions } from '@pz4l/tinyimg-core'
import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import { canConvertToJpg, compressFile, createReporter, initKeyManager, listProjectKeys, listUserKeys, resolveProjectKeysFromEnv } from '@pz4l/tinyimg-core'
import { createLocaleI18n } from '@pz4l/tinyimg-locale'
import pLimit from 'p-limit'
import path from 'pathe'

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

export default function tinyimgVite(options: PluginOptions = {}): any {
  const plugin: Plugin = {
    name: 'tinyimg',
    apply: 'build',
    buildStart() {
      initKeyManager({
        projectKeys: resolveProjectKeysFromEnv(process.env),
        useUserKeys: process.env.USE_USER_TINYIMG_KEYS === 'true',
      })
    },
    async generateBundle(_, bundle) {
      const limit = pLimit(options.parallel || 3)
      const images = Object.entries(bundle).filter(([name]) => /\.(?:png|jpg|jpeg|webp|avif)$/.test(name))

      if (images.length > 0) {
        console.log()
      }

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
        images.map(([name, asset]) =>
          limit(async () => {
            if (asset.type !== 'asset')
              return
            const source = Buffer.isBuffer(asset.source) ? asset.source : Buffer.from(asset.source as string)
            const tmpPath = path.join(os.tmpdir(), `tinyimg-${Date.now()}-${path.basename(name)}`)
            await fs.writeFile(tmpPath, source)

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

            const ok = reporter.track(result)
            if (!ok) {
              reporter.logError(name, result)
              return
            }

            asset.source = result.buffer
            reporter.logItem(name, result)
          }),
        ),
      )

      if (images.length > 0) {
        reporter.logSummary()

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
  }

  return plugin
}
