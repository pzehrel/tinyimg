import type { CompressFileOptions } from '@pzehrel/tinyimg-core'
import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { compressFile, initKeyManager } from '@pzehrel/tinyimg-core'
import pLimit from 'p-limit'

export interface PluginOptions extends Omit<CompressFileOptions, 'filePath'> {
  parallel?: number
}

export default function tinyimgVite(options: PluginOptions = {}): Plugin {
  return {
    name: 'tinyimg',
    apply: 'build',
    buildStart() {
      initKeyManager({
        projectKeys: [process.env.VITE_TINYIMG_KEY].filter(Boolean) as string[],
        useUserKeys: process.env.USE_USER_TINYIMG_KEYS === 'true',
      })
    },
    async generateBundle(_, bundle) {
      const limit = pLimit(options.parallel || 3)
      const images = Object.entries(bundle).filter(([name]) => /\.(?:png|jpg|jpeg|webp|avif)$/.test(name))

      await Promise.all(
        images.map(([name, asset]) =>
          limit(async () => {
            if (asset.type !== 'asset')
              return
            const source = Buffer.isBuffer(asset.source) ? asset.source : Buffer.from(asset.source as string)
            const tmpPath = path.join(os.tmpdir(), `tinyimg-${Date.now()}-${path.basename(name)}`)
            await fs.writeFile(tmpPath, source)

            const result = await compressFile({
              filePath: tmpPath,
              strategy: options.strategy,
              maxFileSize: options.maxFileSize,
              convertPngToJpg: options.convertPngToJpg,
            })

            await fs.unlink(tmpPath).catch(() => {})

            if (!result.error) {
              asset.source = result.buffer
            }
          }),
        ),
      )
    },
  }
}
