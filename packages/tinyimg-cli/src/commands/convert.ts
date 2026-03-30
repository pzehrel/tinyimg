import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { detectAlpha } from '@pz4l/tinyimg-core'
import kleur from 'kleur'
import sharp from 'sharp'
import { expandInputs } from '../utils/files'
import { formatProgress } from '../utils/format'

const PNG_EXTENSION_REGEX = /\.png$/i

interface ConvertOptions {
  quality?: number
  deleteOriginal?: boolean
}

export async function convertCommand(inputs: string[], options: ConvertOptions = {}): Promise<void> {
  // Validate inputs
  if (inputs.length === 0) {
    console.error(kleur.red('Error: No input files specified'))
    console.log('Usage: tinyimg convert [options] <input...>')
    process.exit(1)
  }

  // Expand inputs to file paths
  const files = await expandInputs(inputs)

  if (files.length === 0) {
    console.error(kleur.red('Error: No valid image files found'))
    process.exit(1)
  }

  // Filter to PNG files only (conversion only applies to PNG→JPG)
  const pngFiles = files.filter(f => path.extname(f).toLowerCase() === '.png')

  if (pngFiles.length === 0) {
    console.log(kleur.yellow('No PNG files found for conversion'))
    process.exit(0)
  }

  const quality = options.quality ?? 85

  console.log(kleur.cyan(`\nConverting ${pngFiles.length} PNG file(s)...\n`))

  let converted = 0
  let skipped = 0

  for (let i = 0; i < pngFiles.length; i++) {
    const inputFile = pngFiles[i]
    console.log(formatProgress(i + 1, pngFiles.length))

    try {
      // Check for transparency using detectAlpha from Phase 18
      const hasTransparency = await detectAlpha(inputFile)

      if (hasTransparency) {
        console.log(kleur.yellow(`  ⚠ Skipping ${path.basename(inputFile)} (has transparency)`))
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

      console.log(`  ${kleur.gray(path.basename(inputFile))} → ${kleur.green(path.basename(outputPath))}`)

      // Delete original if flag set
      if (options.deleteOriginal) {
        await fs.unlink(inputFile)
      }

      converted++
    }
    catch (error: any) {
      console.error(kleur.red(`  Error converting ${path.basename(inputFile)}: ${error.message}`))
    }
  }

  console.log(kleur.green('\n✓ Conversion complete'))
  console.log(`  Converted: ${converted}`)
  if (skipped > 0) {
    console.log(kleur.yellow(`  Skipped (transparent): ${skipped}`))
  }
}
