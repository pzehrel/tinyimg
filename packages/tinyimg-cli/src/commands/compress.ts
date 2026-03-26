import type { Buffer } from 'node:buffer'
import type { CompressServiceOptions, KeyStrategy } from 'tinyimg-core'
import fs from 'node:fs/promises'
import process from 'node:process'
import kleur from 'kleur'
import { AllCompressionFailedError, AllKeysExhaustedError, compressImages, KeyPool, NoValidKeysError } from 'tinyimg-core'
import { expandInputs, resolveOutputPath } from '../utils/files'
import { formatProgress, formatResult } from '../utils/format'

interface CompressOptions {
  output?: string
  key?: string
  mode?: KeyStrategy
  parallel?: string
  cache?: boolean
}

/**
 * Main compression command handler
 */
export async function compressCommand(inputs: string[], options: CompressOptions): Promise<void> {
  // Validate inputs
  if (inputs.length === 0) {
    console.error(kleur.red('Error: No input files specified'))
    console.log('Usage: tinyimg [options] <input...>')
    process.exit(1)
  }

  // Expand inputs to file paths
  const files = await expandInputs(inputs)

  if (files.length === 0) {
    console.error(kleur.red('Error: No valid image files found'))
    console.log('Supported formats: PNG, JPG, JPEG')
    process.exit(1)
  }

  // Display configuration
  console.log(kleur.cyan('\nConfiguration:'))
  console.log(`  Mode: ${options.mode || 'random'}`)
  console.log(`  Parallel: ${options.parallel || '8'}`)
  console.log(`  Cache: ${options.cache !== false ? 'enabled' : 'disabled'}`)
  console.log(`  Files: ${files.length}\n`)

  // Read all files into buffers
  const buffers: Buffer[] = []
  for (const file of files) {
    try {
      const buffer = await fs.readFile(file)
      buffers.push(buffer)
    }
    catch (error: any) {
      console.error(kleur.red(`Error reading ${file}: ${error.message}`))
      process.exit(1)
    }
  }

  // Build compression options
  const compressOptions: CompressServiceOptions = {
    cache: options.cache !== false,
    concurrency: options.parallel ? Number.parseInt(options.parallel, 10) : 8,
  }

  // Add mode if specified
  if (options.mode) {
    compressOptions.mode = options.mode as any
  }

  // Create KeyPool if mode specified
  if (options.mode) {
    try {
      const pool = new KeyPool(options.mode)
      compressOptions.keyPool = pool
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  }

  // Compress all images
  try {
    const results = await compressImages(buffers, compressOptions)

    // Write results and display progress
    for (let i = 0; i < files.length; i++) {
      const inputFile = files[i]
      const originalBuffer = buffers[i]
      const compressedBuffer = results[i]
      const outputPath = await resolveOutputPath(inputFile, options.output)

      // Display progress
      console.log(formatProgress(i + 1, files.length))

      // Write compressed file
      await fs.writeFile(outputPath, compressedBuffer)

      // Display result
      console.log(formatResult(inputFile, outputPath, originalBuffer.length, compressedBuffer.length))
    }

    console.log(kleur.green('\n✓ Compression complete'))
  }
  catch (error: any) {
    if (error instanceof AllKeysExhaustedError) {
      console.error(kleur.red('Error: All API keys have exhausted quota'))
      console.log('Please add more keys or wait for quota to reset')
    }
    else if (error instanceof NoValidKeysError) {
      console.error(kleur.red('Error: No valid API keys configured'))
      console.log('Please add API keys using: tinyimg key add <key>')
    }
    else if (error instanceof AllCompressionFailedError) {
      console.error(kleur.red('Error: All compression methods failed'))
      console.log('Please check your network connection and API status')
    }
    else {
      console.error(kleur.red(`Error: ${error.message}`))
    }
    process.exit(1)
  }
}
