import type { CompressResult, CompressServiceOptions, KeyStrategy } from '@pz4l/tinyimg-core'
import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import process from 'node:process'
import { AllCompressionFailedError, AllKeysExhaustedError, compressImages, KeyPool, NoValidKeysError, queryQuota, readConfig } from '@pz4l/tinyimg-core'
import path from 'pathe'
import { expandInputs, resolveOutputPath } from '../utils/files'
import { formatBytes, formatProgress } from '../utils/format'
import { logger } from '../utils/logger'
import { convertCommand } from './convert'

interface CompressOptions {
  output?: string
  key?: string
  mode?: KeyStrategy
  parallel?: string
  cache?: boolean
  convert?: boolean
  deleteOriginal?: boolean
}

/**
 * 打印压缩汇总信息
 */
async function printSummary(results: CompressResult[]): Promise<void> {
  const totalFiles = results.length
  const cachedCount = results.filter(r => r.meta.cached).length
  const compressedCount = totalFiles - cachedCount

  const totalOriginal = results.reduce((sum, r) => sum + r.meta.originalSize, 0)
  const totalCompressed = results.reduce((sum, r) => sum + r.meta.compressedSize, 0)
  const totalSaved = totalOriginal - totalCompressed
  const avgSaved = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(1) : '0.0'

  logger.success('Compression complete')
  logger.info(`  Files: ${totalFiles} processed, ${compressedCount} compressed, ${cachedCount} cached`)
  logger.info(`  Savings: ${avgSaved}% avg, ${formatBytes(totalSaved)} total`)

  // 查询所有 key 的剩余用量
  const config = readConfig()
  if (config.keys.length > 0) {
    try {
      const quotas = await Promise.allSettled(
        config.keys.map(k => queryQuota(k.key)),
      )
      const totalQuota = quotas
        .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value, 0)
      logger.info(`  Quota: ${totalQuota}/${config.keys.length * 500} remaining`)
    }
    catch {
      // 忽略配额查询错误
    }
  }
}

/**
 * Main compression command handler
 */
export async function compressCommand(inputs: string[], options: CompressOptions): Promise<void> {
  // Validate inputs
  if (inputs.length === 0) {
    logger.error('No input files specified')
    logger.info('Usage: tinyimg [options] <input...>')
    process.exit(1)
  }

  // Expand inputs to file paths
  const files = await expandInputs(inputs)

  if (files.length === 0) {
    logger.error('No valid image files found')
    logger.info('Supported formats: PNG, JPG, JPEG, WebP, AVIF')
    process.exit(1)
  }

  // Display configuration
  logger.info('Configuration')
  logger.info(`  Mode: ${options.mode || 'random'}`)
  logger.info(`  Parallel: ${options.parallel || '8'}`)
  logger.info(`  Cache: ${options.cache !== false ? 'enabled' : 'disabled'}`)
  logger.info(`  Files: ${files.length}`)

  // Read all files into buffers
  const buffers: Buffer[] = []
  for (const file of files) {
    try {
      const buffer = await fs.readFile(file)
      buffers.push(buffer)
    }
    catch (error: any) {
      logger.error(`Error reading ${file}: ${error.message}`)
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
      if (error instanceof NoValidKeysError) {
        logger.warn('No API keys configured. Using free web interface (slower, no quota).')
        compressOptions.mode = 'web'
        // Don't set keyPool — web mode doesn't need it
      }
      else {
        logger.error(error.message)
        process.exit(1)
      }
    }
  }

  // Compress all images
  try {
    const results = await compressImages(buffers, compressOptions)

    // Write results and display progress
    for (let i = 0; i < files.length; i++) {
      const inputFile = files[i]
      const originalBuffer = buffers[i]
      const result = results[i]
      const compressedBuffer = result.buffer
      const outputPath = await resolveOutputPath(inputFile, options.output)

      // Display progress
      logger.info(formatProgress(i + 1, files.length))

      // Write compressed file
      await fs.writeFile(outputPath, compressedBuffer)

      // Display result
      const resultMessage = `${path.relative(process.cwd(), inputFile)}: ${formatBytes(originalBuffer.length)} → ${formatBytes(compressedBuffer.length)} (${((originalBuffer.length - compressedBuffer.length) / originalBuffer.length * 100).toFixed(1)}% saved)`
      logger.success(resultMessage)

      // Verbose mode: show compressor info
      if (result.meta.compressorName) {
        logger.verbose(`  Using ${result.meta.compressorName}${result.meta.cached ? ' (cached)' : ''}`)
      }
    }

    // Print summary
    await printSummary(results)

    // Handle --convert flag: convert compressed PNGs to JPG
    if (options.convert) {
      const pngFiles = files.filter(f => path.extname(f).toLowerCase() === '.png')
      if (pngFiles.length > 0) {
        logger.info('Converting compressed PNGs to JPG...')
        await convertCommand(pngFiles, { deleteOriginal: options.deleteOriginal, quality: 85 })
      }
    }
  }
  catch (error: any) {
    if (error instanceof AllKeysExhaustedError) {
      logger.error('All API keys have exhausted quota')
      logger.info('Please add more keys or wait for quota to reset')
    }
    else if (error instanceof AllCompressionFailedError) {
      logger.error('All compression methods failed')
      logger.info('Please check your network connection and API status')
    }
    else {
      logger.error(error.message)
    }
    process.exit(1)
  }
}
