import micromatch from 'micromatch'
import path from 'node:path'

export interface FilterOptions {
  include?: string | string[]
  exclude?: string | string[]
}

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg'])

export function shouldProcessImage(id: string, options: FilterOptions = {}): boolean {
  // 1. Check extension first (fast path)
  const ext = path.extname(id).toLowerCase()
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return false
  }

  // 2. Check include pattern if provided
  if (options.include) {
    const includePatterns = Array.isArray(options.include) ? options.include : [options.include]
    const isInclude = micromatch.isMatch(id, includePatterns)
    if (!isInclude) return false
  }

  // 3. Check exclude pattern if provided
  if (options.exclude) {
    const excludePatterns = Array.isArray(options.exclude) ? options.exclude : [options.exclude]
    const isExclude = micromatch.isMatch(id, excludePatterns)
    if (isExclude) return false
  }

  return true
}
