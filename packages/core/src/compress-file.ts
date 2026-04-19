import type { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import path from 'pathe'
import { readCache, writeCache } from './cache'
import { apiCompress } from './compressors/api'
import { localCompress } from './compressors/local'
import { webCompress } from './compressors/web'
import { convertPngToJpg } from './convert'
import { getKey, getUserKey } from './key-manager'

export interface CompressFileOptions {
  filePath: string
  strategy?: 'API_ONLY' | 'RANDOM' | 'API_FIRST' | 'AUTO'
  maxFileSize?: number
  convertPngToJpg?: boolean
}

export interface CompressFileResult {
  buffer: Buffer
  originalSize: number
  compressedSize: number
  ratio: number
  compressor: string
  cached: boolean
  convertedPngToJpg?: boolean
  compressionCount?: number
  outputExt: 'png' | 'jpg' | 'jpeg' | 'webp'
  error?: Error
}

function getCacheDir(cwd: string): string {
  return path.join(cwd, 'node_modules', '.tinyimg')
}

async function resolveCacheDir(cwd: string): Promise<string> {
  const nodeModulesPath = path.join(cwd, 'node_modules')
  try {
    await fs.access(nodeModulesPath)
    return getCacheDir(cwd)
  }
  catch {
    return path.join(os.homedir(), '.tinyimg')
  }
}

export async function compressFile(options: CompressFileOptions): Promise<CompressFileResult> {
  const {
    filePath,
    strategy = 'AUTO',
    maxFileSize = 5 * 1024 * 1024,
    convertPngToJpg: doConvert = false,
  } = options

  const originalBuffer = await fs.readFile(filePath)
  const originalSize = originalBuffer.length
  let ext = path.extname(filePath).slice(1).toLowerCase()
  const originalExt = ext
  const md5 = crypto.createHash('md5').update(originalBuffer).digest('hex')
  const cacheSuffix = doConvert ? '-c' : ''
  const projectCacheDir = getCacheDir(process.cwd())
  const homeCacheDir = path.join(os.homedir(), '.tinyimg')

  const cached = await readCache(`${md5}${cacheSuffix}`, ext, projectCacheDir) || await readCache(`${md5}${cacheSuffix}`, ext, homeCacheDir)
  if (cached) {
    return {
      buffer: cached,
      originalSize,
      compressedSize: cached.length,
      ratio: cached.length / originalSize,
      compressor: 'Cache',
      cached: true,
      outputExt: ext as 'png' | 'jpg' | 'jpeg' | 'webp',
    }
  }

  const writeCacheDir = await resolveCacheDir(process.cwd())

  let lastCompressor = ''
  let convertedPngToJpg = false
  let compressionCount: number | undefined

  try {
    let current: Buffer = originalBuffer

    if (doConvert && ext === 'png') {
      const canConvert = await import('./convert').then(m => m.canConvertToJpg(filePath))
      if (canConvert) {
        current = await convertPngToJpg(filePath)
        convertedPngToJpg = true
        ext = 'jpg'
      }
    }

    current = await localCompress(current, maxFileSize, ext as 'png' | 'jpg' | 'jpeg' | 'webp' | 'avif')

    let resultBuffer: Buffer
    let compressorName: string

    const projectKey = getKey()
    const userKey = projectKey ? null : await getUserKey()
    const apiKey = projectKey || userKey

    const effectiveStrategy = strategy === 'AUTO' ? (apiKey ? 'API_FIRST' : 'RANDOM') : strategy

    if (effectiveStrategy === 'API_ONLY') {
      if (!apiKey)
        throw new Error('No API key available for API_ONLY strategy')
      lastCompressor = 'ApiCompressor'
      const res = await apiCompress(current, apiKey)
      resultBuffer = res.buffer
      compressorName = res.compressor
      compressionCount = res.compressionCount
    }
    else if (effectiveStrategy === 'RANDOM') {
      const useApi = Math.random() < 0.5 && apiKey
      if (useApi) {
        lastCompressor = 'ApiCompressor'
        const res = await apiCompress(current, apiKey)
        resultBuffer = res.buffer
        compressorName = res.compressor
        compressionCount = res.compressionCount
      }
      else {
        lastCompressor = 'WebCompressor'
        const res = await webCompress(current)
        resultBuffer = res.buffer
        compressorName = res.compressor
      }
    }
    else if (effectiveStrategy === 'API_FIRST') {
      if (apiKey) {
        try {
          lastCompressor = 'ApiCompressor'
          const res = await apiCompress(current, apiKey)
          resultBuffer = res.buffer
          compressorName = res.compressor
          compressionCount = res.compressionCount
        }
        catch (err: any) {
          const status = err.message.match(/status (\d+)/)?.[1]
          if (status === '429' || status === '401') {
            lastCompressor = 'WebCompressor'
            const res = await webCompress(current)
            resultBuffer = res.buffer
            compressorName = res.compressor
          }
          else {
            throw err
          }
        }
      }
      else {
        lastCompressor = 'WebCompressor'
        const res = await webCompress(current)
        resultBuffer = res.buffer
        compressorName = res.compressor
      }
    }
    else {
      lastCompressor = 'WebCompressor'
      const res = await webCompress(current)
      resultBuffer = res.buffer
      compressorName = res.compressor
    }

    await writeCache(`${md5}${cacheSuffix}`, ext, resultBuffer, writeCacheDir)

    return {
      buffer: resultBuffer,
      originalSize,
      compressedSize: resultBuffer.length,
      ratio: resultBuffer.length / originalSize,
      compressor: compressorName,
      cached: false,
      convertedPngToJpg,
      compressionCount,
      outputExt: ext as 'png' | 'jpg' | 'jpeg' | 'webp',
    }
  }
  catch (err: any) {
    return {
      buffer: originalBuffer,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      compressor: lastCompressor,
      cached: false,
      convertedPngToJpg: false,
      compressionCount,
      outputExt: originalExt as 'png' | 'jpg' | 'jpeg' | 'webp',
      error: err instanceof Error ? err : new Error(String(err)),
    }
  }
}
