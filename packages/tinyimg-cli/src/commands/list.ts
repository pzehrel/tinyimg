import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import kleur from 'kleur'
import { detectAlphas } from '@pz4l/tinyimg-core'
import { expandInputs } from '../utils/files'
import { formatBytes } from '../utils/format'

export async function listCommand(inputs: string[], options?: any): Promise<void> {
  // Default to current directory if no inputs
  if (inputs.length === 0) {
    inputs = ['.']
  }

  // Expand inputs to file paths
  const files = await expandInputs(inputs)

  if (files.length === 0) {
    console.error(kleur.red('Error: No valid image files found'))
    console.log('Supported formats: PNG, JPG, JPEG')
    console.log('Usage: tinyimg list [inputs...]')
    process.exit(1)
  }

  // Filter files based on --convertible flag
  let filteredFiles = files

  if (options?.convertible) {
    // Filter to only PNG files first
    const pngFiles = files.filter(f => path.extname(f).toLowerCase() === '.png')

    if (pngFiles.length === 0) {
      console.log(kleur.yellow('No PNG files found.'))
      console.log(kleur.gray('The --convertible flag only applies to PNG files.'))
      process.exit(0)
    }

    // Detect alpha for PNG files
    const alphaResults = await detectAlphas(pngFiles, { concurrency: 8 })

    // Keep only PNGs WITHOUT alpha (convertible to JPG)
    filteredFiles = pngFiles.filter(file => {
      const hasAlpha = alphaResults.get(file) ?? false
      return !hasAlpha
    })

    if (filteredFiles.length === 0) {
      console.log(kleur.yellow('No convertible PNG files found (all have alpha channel).'))
      process.exit(0)
    }
  }

  // Get file stats (sizes)
  const fileStats = await Promise.all(
    filteredFiles.map(async (file) => {
      const stat = await fs.stat(file)
      return { path: file, name: path.relative(process.cwd(), file), size: stat.size }
    }),
  )

  // Sort by path alphabetically
  const sorted = fileStats.sort((a, b) => a.path.localeCompare(b.path))

  // Display files
  console.log(kleur.cyan('\nCompressible images:\n'))
  for (const file of sorted) {
    console.log(`  ${kleur.yellow(file.name)} - ${kleur.gray(formatBytes(file.size))}`)
  }

  // Display summary (per D-01: sizes only, no savings estimates)
  const totalSize = sorted.reduce((sum, f) => sum + f.size, 0)
  console.log(kleur.cyan(`\nTotal: ${sorted.length} files, ${formatBytes(totalSize)}\n`))
}
