import type { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
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
  error?: Error
}

function getCacheDir(cwd: string): string {
  return path.join(cwd, 'node_modules', '.tinyimg')
}

async function resolveCacheDir(cwd: string): Promise<string> {
  const nodeModulesPath = getCacheDir(cwd)
  try {
    await fs.access(nodeModulesPath)
    return nodeModulesPath
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
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const md5 = crypto.createHash('md5').update(originalBuffer).digest('hex')
  const cacheSuffix = doConvert ? '-c' : ''
  const cacheDir = await resolveCacheDir(process.cwd())

  const cached = await readCache(`${md5}${cacheSuffix}`, ext, cacheDir)
  if (cached) {
    return {
      buffer: cached,
      originalSize,
      compressedSize: cached.length,
      ratio: cached.length / originalSize,
      compressor: 'Cache',
      cached: true,
    }
  }

  let lastCompressor = ''

  try {
    let current: Buffer = originalBuffer

    if (doConvert && ext === 'png') {
      const hasAlpha = await import('./convert').then(m => m.canConvertToJpg(filePath))
      if (hasAlpha) {
        current = await convertPngToJpg(filePath)
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
    }
    else if (effectiveStrategy === 'RANDOM') {
      const useApi = Math.random() < 0.5 && apiKey
      if (useApi) {
        lastCompressor = 'ApiCompressor'
        const res = await apiCompress(current, apiKey)
        resultBuffer = res.buffer
        compressorName = res.compressor
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

    await writeCache(`${md5}${cacheSuffix}`, ext, resultBuffer, cacheDir)

    return {
      buffer: resultBuffer,
      originalSize,
      compressedSize: resultBuffer.length,
      ratio: resultBuffer.length / originalSize,
      compressor: compressorName,
      cached: false,
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
      error: err instanceof Error ? err : new Error(String(err)),
    }
  }
}
