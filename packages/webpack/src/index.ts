import type { CompressFileOptions } from '@pzehrel/tinyimg-core'
import type { Compiler } from 'webpack'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { compressFile, initKeyManager, resolveProjectKeysFromEnv } from '@pzehrel/tinyimg-core'
import pLimit from 'p-limit'

export interface PluginOptions extends Omit<CompressFileOptions, 'filePath'> {
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

          await Promise.all(
            images.map(asset =>
              limit(async () => {
                const source = compilation.getAsset(asset.name)?.source.source()
                if (!source)
                  return
                const buf = Buffer.isBuffer(source) ? source : Buffer.from(source as string)
                const tmpPath = path.join(os.tmpdir(), `tinyimg-${Date.now()}-${path.basename(asset.name)}`)
                await fs.writeFile(tmpPath, buf)

                const result = await compressFile({
                  filePath: tmpPath,
                  strategy: this.options.strategy,
                  maxFileSize: this.options.maxFileSize,
                  convertPngToJpg: this.options.convertPngToJpg,
                })

                await fs.unlink(tmpPath).catch(() => {})

                if (!result.error) {
                  compilation.updateAsset(asset.name, new compiler.webpack.sources.RawSource(result.buffer))
                }
              }),
            ),
          )
        },
      )
    })
  }
}
