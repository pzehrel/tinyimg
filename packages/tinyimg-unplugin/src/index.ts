import { createUnplugin } from 'unplugin'
import { compressImage } from 'tinyimg-core'
import { loadKeys } from 'tinyimg-core'
import { shouldProcessImage } from './filter.js'
import { normalizeOptions, type TinyimgUnpluginOptions } from './options.js'
import { createLogger } from './logger.js'
import path from 'node:path'

export default createUnplugin((options: TinyimgUnpluginOptions = {}) => {
  // Normalize options
  const normalized = normalizeOptions(options)

  // Validate TINYPNG_KEYS (D-15, D-16)
  const keys = loadKeys()
  if (keys.length === 0) {
    throw new Error('TINYPNG_KEYS environment variable is required')
  }

  // Create logger
  const logger = createLogger({
    verbose: normalized.verbose,
    strict: normalized.strict
  })

  return {
    name: 'tinyimg-unplugin',
    enforce: 'post', // Run after other transformations (D-02)

    async transform(code, id) {
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

      // Log compression start
      logger.logCompressing(relativePath)

      try {
        // Compress image
        const compressed = await compressImage(buffer, {
          projectCacheOnly: true, // Only project cache (D-17)
          cache: normalized.cache,
          parallel: normalized.parallel,
          mode: normalized.mode
        })

        // Log success
        logger.logCompressed(relativePath, buffer.length, compressed.length)

        return { code: compressed, map: null }
      }
      catch (error: any) {
        // Log error
        logger.logError(relativePath, error.message)

        // Check strict mode
        if (logger.shouldThrowOnError()) {
          throw error
        }

        // Non-strict: return null to use original file
        return null
      }
    },

    buildEnd() {
      logger.logSummary()
    }
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
  return id.replace(root, '').replace(/^\//, '')
}
