import fs from 'node:fs/promises'
import fastGlob from 'fast-glob'
import path from 'pathe'

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif'] as const

/**
 * Expand input paths (files, directories, globs) to absolute file paths
 * Filters for supported image formats only
 */
export async function expandInputs(inputs: string[]): Promise<string[]> {
  const results: string[] = []

  for (const input of inputs) {
    try {
      const stat = await fs.stat(input)

      if (stat.isFile()) {
        // Single file
        if (isImageFile(input)) {
          results.push(path.resolve(input))
        }
      }
      else if (stat.isDirectory()) {
        // Directory - recursively find all image files
        const pattern = path.join(input, '**', '*')
        const files = await fastGlob.glob(pattern, {
          absolute: true,
          onlyFiles: true,
        })
        results.push(...files.filter(isImageFile))
      }
    }
    catch {
      // Not a file or directory - try as glob pattern
      try {
        const files = await fastGlob.glob(input, {
          absolute: true,
          onlyFiles: true,
        })
        results.push(...files.filter(isImageFile))
      }
      catch {
        // Invalid pattern, skip
        continue
      }
    }
  }

  // Deduplicate
  return Array.from(new Set(results))
}

/**
 * Resolve output path for compressed image
 * If outputDir provided, join with basename of input
 * Otherwise, return input path (overwrite in place)
 */
export async function resolveOutputPath(inputPath: string, outputDir?: string): Promise<string> {
  if (outputDir) {
    const outputPath = path.join(outputDir, path.basename(inputPath))
    const absOutputPath = path.resolve(outputPath)

    // Create output directory if it doesn't exist
    await fs.mkdir(path.dirname(absOutputPath), { recursive: true })

    return absOutputPath
  }

  // No output directory - overwrite in place
  return path.resolve(inputPath)
}

/**
 * Check if file is a supported image format
 */
export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext as any)
}
