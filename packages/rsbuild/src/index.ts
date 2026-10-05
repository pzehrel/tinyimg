import type { CompressFileOptions } from '@pz4l/tinyimg-core'
import type { RsbuildPlugin } from '@rsbuild/core'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import { assertAssetRenames, assetReferenceEdits, canConvertToJpg, compressFile, convertedAssetName, createReporter, initKeyManager, resolveProjectKeysFromEnv } from '@pz4l/tinyimg-core'
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
   * Rename emitted .png assets with JPEG content to .jpg and update references.
   * Does not enable PNG-to-JPG conversion by itself.
   * @default false
   */
  renameConvertedFiles?: boolean

  /**
   * Maximum number of images to compress in parallel.
   * @default 3
   */
  parallel?: number

  /** Show sorted per-image details in addition to the summary. @default false */
  verbose?: boolean
}

export default function tinyimgRsbuild(options: PluginOptions = {}): RsbuildPlugin {
  return {
    name: 'tinyimg-rsbuild',
    setup(api) {
      const pendingRenames = new WeakMap<object, Map<string, string>>()
      api.onBeforeBuild(() => {
        initKeyManager({
          projectKeys: resolveProjectKeysFromEnv(process.env),
          useUserKeys: process.env.USE_USER_TINYIMG_KEYS === 'true',
        })
      })

      api.processAssets({ stage: 'additions' }, async ({ assets, sources, compilation }) => {
        const renames = new Map<string, string>()
        pendingRenames.set(compilation, renames)
        const parallel = options.parallel ?? 3
        if (!Number.isSafeInteger(parallel) || parallel < 1)
          throw new Error('parallel must be a positive integer')
        const limit = pLimit(parallel)
        const images = Object.keys(assets).filter(name => /\.(?:png|jpg|jpeg|webp|avif)$/i.test(name))
        const logger = api.logger

        const convertiblePngs: string[] = []

        const reporter = createReporter({
          t,
          target: 'plugin',
          verbose: options.verbose,
          reporter: {
            info: msg => logger.info(`[tinyimg] ${msg}`),
            warn: msg => logger.warn(`[tinyimg] ${msg}`),
            error: msg => logger.error(`[tinyimg] ${msg}`),
          },
        })

        reporter.logStart(images.length)

        await Promise.all(
          images.map(name =>
            limit(async () => {
              const asset = assets[name]
              if (!asset) {
                return
              }

              const buf = Buffer.from(asset.source())
              const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-'))
              const tmpPath = path.join(tmpDir, path.basename(name))
              try {
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
                  noCache: options.noCache,
                })

                const ok = reporter.track(result)
                if (!ok) {
                  reporter.logError(name, result)
                  return
                }

                const renamed = convertedAssetName(name, result.outputExt, options.renameConvertedFiles ?? false)
                if (renamed !== name)
                  renames.set(name, renamed)
                compilation.updateAsset(name, new sources.RawSource(result.buffer))
                reporter.logItem(renamed, result)
              }
              finally {
                await fs.rm(tmpDir, { recursive: true, force: true })
              }
            }),
          ),
        )

        if (images.length > 0) {
          reporter.logSummary()

          if (!options.convertPngToJpg)
            reporter.logConvertiblePngs(convertiblePngs.length)
        }
      })
      if (options.renameConvertedFiles) {
        api.processAssets({ stage: 'summarize' }, ({ compilation, sources }) => {
          const renames = pendingRenames.get(compilation)
          if (!renames)
            return
          assertAssetRenames(compilation.getAssets().map(asset => asset.name), renames)
          for (const [from, to] of renames)
            compilation.renameAsset(from, to)
          const publicPath = typeof compilation.outputOptions.publicPath === 'string' ? compilation.outputOptions.publicPath : ''
          for (const asset of compilation.getAssets()) {
            if (!/\.(?:[cm]?js|css|html?|json)$/i.test(asset.name))
              continue
            const edits = assetReferenceEdits(asset.source.source().toString(), asset.name, renames, publicPath)
            if (!edits.length)
              continue
            const source = new sources.ReplaceSource(asset.source)
            for (const edit of edits)
              source.replace(edit.start, edit.end - 1, edit.value)
            compilation.updateAsset(asset.name, source)
          }
          pendingRenames.delete(compilation)
        })
      }
    },
  }
}
