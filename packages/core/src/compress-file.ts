import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import process from 'node:process'
import path from 'pathe'
import sharp from 'sharp'
import { getCacheDir, getUserCacheDir, readCache, writeCache } from './cache'
import { apiCompress } from './compressors/api'
import { localCompress } from './compressors/local'
import { webCompress } from './compressors/web'
import { canConvertToJpg, convertPngToJpg, isProcessed, markProcessed } from './convert'
import { AccountError } from './errors'
import { getCompressionKeys, invalidateKey } from './key-manager'

export type ImageExtension = 'png' | 'jpg' | 'jpeg' | 'webp' | 'avif'
export type CompressionStrategy = 'API_ONLY' | 'RANDOM' | 'API_FIRST' | 'AUTO'

export interface CompressFileOptions {
  filePath: string
  strategy?: CompressionStrategy
  maxFileSize?: number
  convertPngToJpg?: boolean
  noCache?: boolean
}

export interface CompressFileResult {
  buffer: Buffer
  originalSize: number
  compressedSize: number
  ratio: number
  compressor: string
  cached: boolean
  alreadyProcessed?: boolean
  convertedPngToJpg?: boolean
  compressionCount?: number
  outputExt: ImageExtension
  cacheWarning?: string
  error?: Error
}

async function imageExtension(buffer: Buffer): Promise<ImageExtension> {
  const meta = await sharp(buffer).metadata()
  if (meta.format === 'heif' && meta.compression === 'av1')
    return 'avif'
  if (meta.format === 'jpeg')
    return 'jpg'
  if (meta.format === 'png' || meta.format === 'webp')
    return meta.format
  throw new Error(`Unsupported image format: ${meta.format}`)
}

export async function compressFile(options: CompressFileOptions): Promise<CompressFileResult> {
  const { filePath, strategy = 'AUTO', maxFileSize = 5 * 1024 * 1024, convertPngToJpg: doConvert = false, noCache = false } = options
  let originalBuffer: Buffer = Buffer.alloc(0)
  let originalSize = 0
  let originalExt: ImageExtension = 'png'
  let lastCompressor = ''

  const result = (buffer: Buffer, outputExt: ImageExtension, extras: Partial<CompressFileResult> = {}): CompressFileResult => ({
    buffer,
    originalSize,
    compressedSize: buffer.length,
    ratio: originalSize ? buffer.length / originalSize : 1,
    compressor: lastCompressor,
    cached: false,
    outputExt,
    ...extras,
  })

  try {
    if (!['API_ONLY', 'RANDOM', 'API_FIRST', 'AUTO'].includes(strategy))
      throw new Error(`Invalid compression strategy: ${strategy}`)
    if (!Number.isFinite(maxFileSize) || maxFileSize <= 0)
      throw new Error('maxFileSize must be a positive finite number')
    originalBuffer = await fs.readFile(filePath)
    originalSize = originalBuffer.length
    originalExt = await imageExtension(originalBuffer)

    // Processed sources skip remote compression; an explicitly requested format conversion stays local.
    if (await isProcessed(originalBuffer)) {
      if (doConvert && originalExt === 'png' && await canConvertToJpg(filePath)) {
        const buffer = await markProcessed(await convertPngToJpg(filePath), 'jpg')
        return result(buffer, 'jpg', { compressor: 'AlreadyProcessed', alreadyProcessed: true, convertedPngToJpg: true })
      }
      return result(originalBuffer, originalExt, { compressor: 'AlreadyProcessed', alreadyProcessed: true })
    }

    const md5 = crypto.createHash('md5').update(originalBuffer).digest('hex')
    const configHash = crypto.createHash('md5').update(JSON.stringify({ version: 2, strategy, maxFileSize, doConvert })).digest('hex')
    const cacheKey = `${md5}-${configHash}`
    const projectCacheDir = getCacheDir(process.cwd())
    const homeCacheDir = getUserCacheDir()
    if (!noCache) {
      const cached = await readCache(cacheKey, originalExt, projectCacheDir) || await readCache(cacheKey, originalExt, homeCacheDir)
      if (cached) {
        try {
          const outputExt = await imageExtension(cached)
          return result(cached, outputExt, { compressor: 'Cache', cached: true, convertedPngToJpg: originalExt === 'png' && outputExt === 'jpg' })
        }
        catch {
          // An incomplete/corrupt cache is a miss, never an image output.
        }
      }
    }

    let current: Buffer = originalBuffer
    let outputExt = originalExt
    const convertedPngToJpg = doConvert && originalExt === 'png' && await canConvertToJpg(filePath)
    if (convertedPngToJpg) {
      current = await convertPngToJpg(filePath)
      outputExt = 'jpg'
    }
    current = await localCompress(current, maxFileSize, outputExt)
    const keys = await getCompressionKeys()
    const effectiveStrategy = strategy === 'AUTO' ? (keys.length ? 'API_FIRST' : 'RANDOM') : strategy
    const useApi = effectiveStrategy === 'API_ONLY' || effectiveStrategy === 'API_FIRST' || (Math.random() < 0.5 && keys.length > 0)
    let compressionCount: number | undefined
    let compressed: Buffer | undefined
    if (useApi) {
      let accountError: AccountError | undefined
      for (const key of keys) {
        try {
          lastCompressor = 'ApiCompressor'
          const response = await apiCompress(current, key)
          compressed = response.buffer
          compressionCount = response.compressionCount
          break
        }
        catch (error) {
          if (!(error instanceof AccountError) || ![401, 429].includes(error.status))
            throw error
          invalidateKey(key)
          accountError = error
        }
      }
      if (!compressed && effectiveStrategy !== 'API_FIRST')
        throw accountError || new Error('No API key available for API_ONLY strategy')
    }
    if (!compressed) {
      lastCompressor = 'WebCompressor'
      compressed = (await webCompress(current)).buffer
    }

    // Mark before caching/reporting so every consumer receives the final bytes.
    const buffer = await markProcessed(compressed, outputExt)
    let cacheWarning: string | undefined
    if (!noCache) {
      let cacheDir = homeCacheDir
      try {
        await fs.access(path.dirname(projectCacheDir))
        cacheDir = projectCacheDir
      }
      catch {}
      try {
        await writeCache(cacheKey, originalExt, buffer, cacheDir)
      }
      catch (error) {
        cacheWarning = error instanceof Error ? error.message : String(error)
      }
    }
    return result(buffer, outputExt, { convertedPngToJpg, compressionCount, cacheWarning })
  }
  catch (error) {
    return result(originalBuffer, originalExt, { error: error instanceof Error ? error : new Error(String(error)) })
  }
}
