import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import kleur from 'kleur'
import { expandInputs } from '../utils/files'
import { formatBytes } from '../utils/format'

export async function listCommand(inputs: string[], _options?: any): Promise<void> {
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

  // Get file stats (sizes)
  const fileStats = await Promise.all(
    files.map(async (file) => {
      const stat = await fs.stat(file)
      return { path: file, name: path.basename(file), size: stat.size }
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
