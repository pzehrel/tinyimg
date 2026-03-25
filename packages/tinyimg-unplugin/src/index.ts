import { createUnplugin } from 'unplugin'
import { compressImage } from 'tinyimg-core'
import { loadKeys } from 'tinyimg-core'
import { shouldProcessImage } from './filter.js'
import { normalizeOptions, type TinyimgUnpluginOptions } from './options.js'
import { createLogger } from './logger.js'

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

    transform(code, id) {
      // Filter non-image files
      if (!shouldProcessImage(id, normalized)) {
        return null
      }

      // TODO: Check production build (D-01)
      // TODO: Compress image
      // TODO: Handle errors based on strict mode

      return null
    },

    buildEnd() {
      logger.logSummary()
    }
  }
})
