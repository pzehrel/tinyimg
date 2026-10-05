import type { CompressFileOptions } from '@pz4l/tinyimg-core'
import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import { assertAssetRenames, canConvertToJpg, compressFile, convertedAssetName, createReporter, initKeyManager, resolveProjectKeysFromEnv, rewriteAssetReferences } from '@pz4l/tinyimg-core'
import { createLocaleI18n } from '@pz4l/tinyimg-locale'
import pLimit from 'p-limit'
import path from 'pathe'
import { createLogger, loadEnv } from 'vite'

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

export default function tinyimgVite(options: PluginOptions = {}): any {
  let publicPath = ''
  let logger = createLogger()
  const plugin: Plugin = {
    name: 'tinyimg',
    apply: 'build',
    enforce: 'post',
    augmentChunkHash() {
      return options.renameConvertedFiles ? 'tinyimg:renameConvertedFiles' : undefined
    },
    configResolved(config) {
      publicPath = config.base
      logger = config.logger
      const env = loadEnv(config.mode, config.envDir, '')
      initKeyManager({
        projectKeys: resolveProjectKeysFromEnv({ ...env, ...process.env }),
        useUserKeys: (process.env.USE_USER_TINYIMG_KEYS ?? env.USE_USER_TINYIMG_KEYS) === 'true',
      })
    },
    async generateBundle(_, bundle) {
      const parallel = options.parallel ?? 3
      if (!Number.isSafeInteger(parallel) || parallel < 1)
        throw new Error('parallel must be a positive integer')
      const limit = pLimit(parallel)
      const renames = new Map<string, string>()
      const images = Object.entries(bundle).filter(([name]) => /\.(?:png|jpg|jpeg|webp|avif)$/i.test(name))

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
        images.map(([name, asset]) =>
          limit(async () => {
            if (asset.type !== 'asset')
              return
            const source = Buffer.isBuffer(asset.source) ? asset.source : Buffer.from(asset.source as string)
            const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-'))
            const tmpPath = path.join(tmpDir, path.basename(name))
            try {
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
              asset.source = result.buffer
              reporter.logItem(renamed, result)
            }
            finally {
              await fs.rm(tmpDir, { recursive: true, force: true })
            }
          }),
        ),
      )

      assertAssetRenames(Object.keys(bundle), renames)
      for (const [from, to] of renames) {
        const asset = bundle[from]
        if (asset.type !== 'asset')
          continue
        if ('rolldownVersion' in this.meta) {
          // Rolldown tracks asset property changes natively. Preserve all source
          // aliases rather than emitting duplicate explicitly named assets.
          asset.fileName = to
          continue
        }
        const originals = asset.originalFileNames?.length ? asset.originalFileNames : [undefined]
        for (const originalFileName of originals) {
          this.emitFile({
            type: 'asset',
            fileName: to,
            name: asset.names?.[0] || path.basename(from),
            originalFileName,
            source: asset.source,
          })
        }
        delete bundle[from]
      }
      if (renames.size) {
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk') {
            output.code = rewriteAssetReferences(output.code, output.fileName, renames, publicPath)
            const chunk = output as typeof output & { referencedFiles?: string[] }
            if (chunk.referencedFiles)
              chunk.referencedFiles = chunk.referencedFiles.map(name => renames.get(name) || name)
            if (output.viteMetadata) {
              output.viteMetadata.importedAssets = new Set([...output.viteMetadata.importedAssets].map(name => renames.get(name) || name))
            }
          }
          else if (/\.(?:css|html?|json)$/i.test(output.fileName)) {
            const text = typeof output.source === 'string' ? output.source : Buffer.from(output.source).toString()
            output.source = rewriteAssetReferences(text, output.fileName, renames, publicPath)
          }
        }
      }

      if (images.length > 0) {
        reporter.logSummary()

        if (!options.convertPngToJpg)
          reporter.logConvertiblePngs(convertiblePngs.length)
      }
    },
  }

  return plugin
}
