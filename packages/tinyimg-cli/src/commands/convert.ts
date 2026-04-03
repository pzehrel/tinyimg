import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { detectAlpha } from '@pz4l/tinyimg-core'
import sharp from 'sharp'
import { expandInputs } from '../utils/files'
import { formatProgress } from '../utils/format'
import { logger } from '../utils/logger'

const PNG_EXTENSION_REGEX = /\.png$/i

interface ConvertOptions {
  quality?: number
  deleteOriginal?: boolean
}

export async function convertCommand(inputs: string[], options: ConvertOptions = {}): Promise<void> {
  // Validate inputs
  if (inputs.length === 0) {
    logger.error('No input files specified')
    process.exit(1)
  }

  // Expand inputs to file paths
  const files = await expandInputs(inputs)

  if (files.length === 0) {
    logger.error('No valid image files found')
    process.exit(1)
  }

  // Filter to PNG files only (conversion only applies to PNG→JPG)
  const pngFiles = files.filter(f => path.extname(f).toLowerCase() === '.png')

  if (pngFiles.length === 0) {
    logger.warn('No PNG files found for conversion')
    process.exit(0)
  }

  const quality = options.quality ?? 85

  logger.info(`Converting ${pngFiles.length} PNG file(s)...`)

  let converted = 0
  let skipped = 0

  for (let i = 0; i < pngFiles.length; i++) {
    const inputFile = pngFiles[i]
    logger.info(formatProgress(i + 1, pngFiles.length))

    try {
      // Check for transparency using detectAlpha from Phase 18
      const hasTransparency = await detectAlpha(inputFile)

      if (hasTransparency) {
        logger.warn(`Skipping ${path.basename(inputFile)} (has transparency)`)
        skipped++
        continue
      }

      // Convert PNG to JPG using sharp
      const outputBuffer: Buffer = await sharp(inputFile)
        .jpeg({ quality, progressive: true })
        .toBuffer()

      // Determine output path: same directory, .jpg extension
      const outputPath = inputFile.replace(PNG_EXTENSION_REGEX, '.jpg')
      await fs.writeFile(outputPath, outputBuffer)

      logger.info(`  ${path.basename(inputFile)} → ${path.basename(outputPath)}`)

      // Delete original if flag set
      if (options.deleteOriginal) {
        await fs.unlink(inputFile)
      }

      converted++
    }
    catch (error: any) {
      logger.error(`Error converting ${path.basename(inputFile)}: ${error.message}`)
    }
  }

  logger.success('Conversion complete')
  logger.info(`  Converted: ${converted}`)
  if (skipped > 0) {
    logger.warn(`  Skipped (transparent): ${skipped}`)
  }
}
