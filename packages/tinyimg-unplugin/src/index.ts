import type { TinyimgUnpluginOptions } from './options'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { compressImage, loadKeys } from '@pz4l/tinyimg-core'
import { createUnplugin } from 'unplugin'
import { shouldProcessImage } from './filter'
import { normalizeOptions } from './options'
import { TerminalLogger } from './utils/logger'

// Regex for matching image file extensions
const IMAGE_REGEX = /\.(png|jpg|jpeg|gif|webp|svg)$/i

export default createUnplugin((options: TinyimgUnpluginOptions = {}): any => {
  // Normalize options
  const normalized = normalizeOptions(options)

  // Validate TINYPNG_KEYS (D-15, D-16)
  const keys = loadKeys()
  if (keys.length === 0) {
    throw new Error('TINYPNG_KEYS environment variable is required')
  }

  // Create logger
  const logger = new TerminalLogger(normalized.level)

  return {
    name: 'tinyimg-unplugin',
    enforce: 'post', // Run after other transformations (D-02)

    async transform(code: any, id: any) {
      // Filter non-image files
      const shouldProcess = shouldProcessImage(id, normalized)
      if (!shouldProcess) {
        return null
      }

      // Check production build (D-01)
      const isProd = isProductionBuild(this)
      if (!isProd) {
        return null
      }

      // Convert to Buffer
      const buffer = Buffer.from(code)

      // Get relative path for logging
      const relativePath = getRelativePath(id)

      try {
        // Compress image
        const { buffer: compressed, meta } = await compressImage(buffer, {
          projectCacheOnly: true, // Only project cache (D-17)
          cache: normalized.cache,
          mode: normalized.mode as any,
        })

        // Log based on cache status
        if (meta.cached) {
          logger.cacheHit(relativePath, meta.originalSize)
        }
        else {
          logger.successCompress(relativePath, meta.originalSize, meta.compressedSize)
          // Verbose mode: log compressor name
          if (normalized.level === 'verbose' && meta.compressorName) {
            logger.verbose(`  compressor: ${meta.compressorName}`)
          }
        }

        return { code: compressed, map: null }
      }
      catch (error: any) {
        // Log error
        logger.errorCompress(relativePath, error.message, normalized.strict)

        // Check strict mode
        if (normalized.strict) {
          throw error
        }

        // Non-strict: return null to use original file
        return null
      }
    },

    buildEnd() {
      logger.summary()
    },
  }
})

// Helper functions
function isProductionBuild(context: any): boolean {
  // Vite: check config.isBuild (D-01)
  if (context?.config?.isBuild !== undefined) {
    return context.config.isBuild
  }

  // Webpack: check mode (D-01)
  if (context?.mode !== undefined) {
    return context.mode === 'production'
  }

  // Fallback: check NODE_ENV
  return process.env.NODE_ENV === 'production'
}

function getRelativePath(id: string): string {
  // Convert absolute path to relative for logging
  const root = process.cwd()
  return id.replace(root, '').replace(IMAGE_REGEX, '')
}
