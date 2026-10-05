import type { CompressFileOptions } from '@pz4l/tinyimg-core'
import type { Compiler } from 'webpack'
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

export default class TinyimgWebpackPlugin {
  constructor(private options: PluginOptions = {}) {}

  apply(compiler: Compiler) {
    const pluginName = 'TinyimgWebpackPlugin'
    const logger = compiler.getInfrastructureLogger('tinyimg')

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      const renames = new Map<string, string>()
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
          const parallel = this.options.parallel ?? 3
          if (!Number.isSafeInteger(parallel) || parallel < 1)
            throw new Error('parallel must be a positive integer')
          const limit = pLimit(parallel)
          const assets = compilation.getAssets()
          const images = assets.filter(a => /\.(?:png|jpg|jpeg|webp|avif)$/i.test(a.name))

          const convertiblePngs: string[] = []

          const reporter = createReporter({
            t,
            target: 'plugin',
            verbose: this.options.verbose,
            reporter: {
              info: msg => logger.info(msg),
              warn: msg => logger.warn(msg),
              error: msg => logger.error(msg),
            },
          })

          reporter.logStart(images.length)

          await Promise.all(
            images.map(asset =>
              limit(async () => {
                const source = compilation.getAsset(asset.name)?.source.source()
                if (!source)
                  return
                const buf = Buffer.isBuffer(source) ? source : Buffer.from(source as string)
                const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-'))
                const tmpPath = path.join(tmpDir, path.basename(asset.name))
                try {
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
                    noCache: this.options.noCache,
                  })

                  const ok = reporter.track(result)
                  if (!ok) {
                    reporter.logError(asset.name, result)
                    return
                  }

                  const renamed = convertedAssetName(asset.name, result.outputExt, this.options.renameConvertedFiles ?? false)
                  if (renamed !== asset.name)
                    renames.set(asset.name, renamed)
                  compilation.updateAsset(asset.name, new compiler.webpack.sources.RawSource(result.buffer))
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

            if (!this.options.convertPngToJpg)
              reporter.logConvertiblePngs(convertiblePngs.length)
          }
        },
      )
      if (this.options.renameConvertedFiles) {
        compilation.hooks.processAssets.tap(
          { name: `${pluginName}:rename`, stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE },
          () => {
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
              const source = new compiler.webpack.sources.ReplaceSource(asset.source)
              for (const edit of edits)
                source.replace(edit.start, edit.end - 1, edit.value)
              compilation.updateAsset(asset.name, source)
            }
          },
        )
      }
    })
  }
}
