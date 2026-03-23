#!/usr/bin/env tsx
/**
 * Basic Compression Example
 *
 * This example demonstrates how to compress a single image using @pz4l/tinyimg-core.
 *
 * Features demonstrated:
 * - Reading an image file into a Buffer
 * - Using compressImage with default options
 * - Saving compressed output to a file
 * - Calculating compression savings
 * - Error handling for common scenarios
 *
 * Run with: pnpm 01-basic
 * Or directly: npx tsx examples/01-basic-compression.ts
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  AllCompressionFailedError,
  AllKeysExhaustedError,
  compressImage,
  NoValidKeysError,
} from '@pz4l/tinyimg-core'

// Paths relative to this example file
const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_PATH = join(__dirname, '../../../packages/tinyimg-unplugin/test/fixtures/images')
const OUTPUT_PATH = join(__dirname, 'output')

async function main() {
  console.log('=== Basic Compression Example ===\n')

  // Read the sample image from test fixtures
  const inputPath = join(FIXTURES_PATH, 'sample.jpg')
  console.log(`Reading image: ${inputPath}`)

  const inputBuffer = await readFile(inputPath)
  const inputSize = inputBuffer.length
  console.log(`Original size: ${(inputSize / 1024).toFixed(2)} KB\n`)

  try {
    // Compress the image with default options
    // - mode: 'auto' (tries API first, falls back to web compressor)
    // - cache: true (uses project and global cache)
    // - maxRetries: 8 (retries on transient failures)
    console.log('Compressing image...')
    const compressed = await compressImage(inputBuffer)

    // Save compressed output
    const outputPath = join(OUTPUT_PATH, 'sample-compressed.jpg')
    await writeFile(outputPath, compressed)

    // Calculate and display savings
    const outputSize = compressed.length
    const savings = ((1 - outputSize / inputSize) * 100).toFixed(1)
    const savedBytes = inputSize - outputSize

    console.log('\n=== Compression Complete ===')
    console.log(`Output: ${outputPath}`)
    console.log(`Compressed size: ${(outputSize / 1024).toFixed(2)} KB`)
    console.log(`Saved: ${savedBytes} bytes (${savings}% reduction)`)
    console.log('\nTip: Run again to see cache hit behavior!')
  }
  catch (error) {
    // Handle specific error types with helpful messages
    if (error instanceof NoValidKeysError) {
      console.error('\n❌ Error: No API keys configured.')
      console.error('Please set TINYPNG_KEYS environment variable.')
      console.error('Example: TINYPNG_KEYS=key1,key2 pnpm 01-basic')
    }
    else if (error instanceof AllKeysExhaustedError) {
      console.error('\n❌ Error: All API keys have exhausted their quota.')
      console.error('The example will fall back to the web compressor.')
    }
    else if (error instanceof AllCompressionFailedError) {
      console.error('\n❌ Error: All compression methods failed.')
      console.error('This may indicate network issues or an invalid image.')
    }
    else {
      console.error('\n❌ Unexpected error:', error)
    }
    process.exit(1)
  }
}

main()
