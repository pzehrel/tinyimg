#!/usr/bin/env tsx
/**
 * Batch Compression Example
 *
 * This example demonstrates how to compress multiple images concurrently
 * using @pz4l/tinyimg-core with progress reporting.
 *
 * Features demonstrated:
 * - Reading multiple image files
 * - Using compressImages with concurrency control
 * - Progress reporting during batch processing
 * - Saving multiple output files
 * - Calculating aggregate compression statistics
 *
 * Run with: pnpm 02-batch
 * Or directly: npx tsx examples/02-batch-compression.ts
 */

import type { Buffer } from 'node:buffer'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  AllCompressionFailedError,
  AllKeysExhaustedError,
  compressImages,
  NoValidKeysError,
} from '@pz4l/tinyimg-core'

// Paths relative to this example file
const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_PATH = join(__dirname, '../../../packages/tinyimg-unplugin/test/fixtures/images')
const OUTPUT_PATH = join(__dirname, 'output')

// Image files to process (create multiple copies for demonstration)
const IMAGE_FILES = [
  'sample.jpg',
  'sample.png',
]

async function main() {
  console.log('=== Batch Compression Example ===\n')

  // Read all input images
  console.log(`Reading ${IMAGE_FILES.length} images from fixtures...`)
  const imageBuffers: Buffer[] = []
  const fileNames: string[] = []

  for (const file of IMAGE_FILES) {
    const path = join(FIXTURES_PATH, file)
    try {
      const buffer = await readFile(path)
      imageBuffers.push(buffer)
      fileNames.push(file)
      console.log(`  ✓ ${file} (${(buffer.length / 1024).toFixed(2)} KB)`)
    }
    catch (error) {
      console.warn(`  ⚠ Skipping ${file}: ${(error as Error).message}`)
    }
  }

  if (imageBuffers.length === 0) {
    console.error('\n❌ No images found to process.')
    process.exit(1)
  }

  const totalInputSize = imageBuffers.reduce((sum, buf) => sum + buf.length, 0)
  console.log(`\nTotal input size: ${(totalInputSize / 1024).toFixed(2)} KB\n`)

  try {
    // Compress images with concurrency control
    // - concurrency: 2 (limit to 2 parallel compressions for demonstration)
    // - mode: 'auto' (API first, fallback to web)
    // - cache: true (use cache for faster subsequent runs)
    const concurrency = 2
    console.log(`Compressing with concurrency limit: ${concurrency}`)
    console.log('Progress:')

    const startTime = Date.now()

    // Create a wrapper function for progress reporting
    const compressWithProgress = async (
      buffers: Buffer[],
      _options: { concurrency?: number } = {},
    ): Promise<Buffer[]> => {
      const results: Buffer[] = []
      let completed = 0

      // For demonstration, we'll use the built-in compressImages
      // and simulate progress by reporting completion
      const compressed = await compressImages(buffers, {
        concurrency,
        mode: 'auto',
        cache: true,
      })

      // In a real application with progress callbacks,
      // you could use a custom implementation or event emitter
      for (let i = 0; i < compressed.length; i++) {
        completed++
        const progress = ((completed / buffers.length) * 100).toFixed(0)
        const savings = ((1 - compressed[i]!.length / buffers[i]!.length) * 100).toFixed(1)
        console.log(`  [${progress}%] ${fileNames[i]} - ${savings}% saved`)
        results.push(compressed[i]!)
      }

      return results
    }

    const compressed = await compressWithProgress(imageBuffers)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    // Save all compressed outputs
    console.log('\nSaving compressed images...')
    for (let i = 0; i < compressed.length; i++) {
      const originalName = fileNames[i]!
      const ext = originalName.split('.').pop()
      const outputPath = join(OUTPUT_PATH, `batch-compressed-${i}.${ext}`)
      await writeFile(outputPath, compressed[i]!)
      console.log(`  ✓ Saved: ${outputPath}`)
    }

    // Calculate aggregate statistics
    const totalOutputSize = compressed.reduce((sum, buf) => sum + buf.length, 0)
    const totalSaved = totalInputSize - totalOutputSize
    const totalSavings = ((1 - totalOutputSize / totalInputSize) * 100).toFixed(1)

    console.log('\n=== Batch Compression Complete ===')
    console.log(`Processed: ${compressed.length} images`)
    console.log(`Total input: ${(totalInputSize / 1024).toFixed(2)} KB`)
    console.log(`Total output: ${(totalOutputSize / 1024).toFixed(2)} KB`)
    console.log(`Total saved: ${(totalSaved / 1024).toFixed(2)} KB (${totalSavings}% reduction)`)
    console.log(`Time elapsed: ${elapsed}s`)
    console.log(`\nTip: Adjust concurrency for your use case!`)
    console.log(`  - Low concurrency (1-2): Rate-limited APIs`)
    console.log(`  - High concurrency (8-16): Fast local processing`)
  }
  catch (error) {
    if (error instanceof NoValidKeysError) {
      console.error('\n❌ Error: No API keys configured.')
      console.error('Please set TINYPNG_KEYS environment variable.')
    }
    else if (error instanceof AllKeysExhaustedError) {
      console.error('\n❌ Error: All API keys exhausted.')
      console.error('Falling back to web compressor...')
    }
    else if (error instanceof AllCompressionFailedError) {
      console.error('\n❌ Error: All compression methods failed.')
    }
    else {
      console.error('\n❌ Unexpected error:', error)
    }
    process.exit(1)
  }
}

main()
