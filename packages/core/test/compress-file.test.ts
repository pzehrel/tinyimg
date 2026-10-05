import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import path from 'pathe'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compressFile } from '../src/compress-file'
import { isProcessed, markProcessed } from '../src/convert'
import { HttpClient } from '../src/http-client'
import { initKeyManager } from '../src/key-manager'

describe('compression pipeline', () => {
  let dir: string
  let remoteCalls: string[]
  let latestInput: Buffer
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-pipeline-'))
    await fs.mkdir(path.join(dir, 'node_modules'))
    vi.spyOn(process, 'cwd').mockReturnValue(dir)
    vi.spyOn(os, 'homedir').mockReturnValue(path.join(dir, 'home'))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    initKeyManager({ projectKeys: ['fake-key'] })
    remoteCalls = []
    vi.spyOn(HttpClient.prototype, 'request').mockImplementation(async (options) => {
      remoteCalls.push(options.url)
      latestInput = options.body!
      return { status: 201, headers: { location: 'https://example.invalid/output' }, data: Buffer.alloc(0) }
    })
    vi.spyOn(HttpClient.prototype, 'download').mockImplementation(async () => latestInput)
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await fs.rm(dir, { recursive: true, force: true })
  })
  async function image(format: 'png' | 'jpeg' | 'avif' = 'png', marked = false, alpha = false) {
    let buffer = await sharp({ create: { width: 12, height: 12, channels: alpha ? 4 : 3, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).toFormat(format).toBuffer()
    if (marked)
      buffer = await markProcessed(buffer, format)
    const filePath = path.join(dir, `input.${format}`)
    await fs.writeFile(filePath, buffer)
    return { filePath, buffer }
  }
  it('caches the final converted output with correct format and size', async () => {
    const { filePath } = await image()
    const first = await compressFile({ filePath, strategy: 'API_ONLY', convertPngToJpg: true })
    const second = await compressFile({ filePath, strategy: 'API_ONLY', convertPngToJpg: true })
    expect(first.error).toBeUndefined()
    expect(second.cached).toBe(true)
    expect(second.convertedPngToJpg).toBe(true)
    expect(second.outputExt).toBe('jpg')
    expect(second.compressedSize).toBe(second.buffer.length)
    expect(second.buffer.equals(first.buffer)).toBe(true)
    expect(await isProcessed(second.buffer)).toBe(true)
    expect(remoteCalls).toHaveLength(1)
  })
  it('cache disabled bypasses both cache reading and writing', async () => {
    const { filePath } = await image()
    await compressFile({ filePath, strategy: 'API_ONLY', noCache: true })
    await compressFile({ filePath, strategy: 'API_ONLY', noCache: true })
    expect(remoteCalls).toHaveLength(2)
    expect(await fs.readdir(path.join(dir, 'node_modules'))).toEqual([])
  })
  it('converts a processed PNG locally when explicitly requested, without remote requests', async () => {
    const { filePath, buffer } = await image('png', true)
    const result = await compressFile({ filePath, convertPngToJpg: true, noCache: true })
    expect(result.alreadyProcessed).toBe(true)
    expect(result.buffer.equals(buffer)).toBe(false)
    expect(result.outputExt).toBe('jpg')
    expect(result.convertedPngToJpg).toBe(true)
    expect(await isProcessed(result.buffer)).toBe(true)
    expect(remoteCalls).toHaveLength(0)
  })
  it('does not use saved user credentials unless enabled', async () => {
    const { filePath } = await image()
    const home = path.join(dir, 'home', '.tinyimg')
    await fs.mkdir(home, { recursive: true })
    await fs.writeFile(path.join(home, 'keys.json'), '["fake-saved-key"]')
    initKeyManager({ useUserKeys: false })
    const result = await compressFile({ filePath, strategy: 'API_ONLY' })
    expect(result.error?.message).toContain('No API key')
    expect(remoteCalls).toHaveLength(0)
    initKeyManager({ useUserKeys: true })
    expect((await compressFile({ filePath, strategy: 'API_ONLY' })).error).toBeUndefined()
    expect(remoteCalls).toHaveLength(1)
  })
  it('tries another API key on account errors and skips the rejected key thereafter', async () => {
    const { filePath } = await image()
    initKeyManager({ projectKeys: ['fake-exhausted', 'fake-valid'] })
    const attemptedKeys: string[] = []
    vi.mocked(HttpClient.prototype.request).mockImplementation(async (options) => {
      const key = Buffer.from(options.headers!.Authorization.slice(6), 'base64').toString().slice(4)
      attemptedKeys.push(key)
      latestInput = options.body!
      return { status: key === 'fake-exhausted' ? 429 : 201, headers: { location: 'https://example.invalid/output' }, data: Buffer.alloc(0) }
    })
    const result = await compressFile({ filePath, strategy: 'API_ONLY', noCache: true })
    expect(result.error).toBeUndefined()
    expect(attemptedKeys).toEqual(['fake-exhausted', 'fake-valid'])
    await compressFile({ filePath, strategy: 'API_ONLY', noCache: true })
    expect(attemptedKeys).toEqual(['fake-exhausted', 'fake-valid', 'fake-valid'])
  })
  it('aPI_FIRST falls back to Web only after all API keys fail authentication/quota', async () => {
    const { filePath } = await image()
    initKeyManager({ projectKeys: ['fake-a', 'fake-b'] })
    vi.mocked(HttpClient.prototype.request).mockImplementation(async (options) => {
      remoteCalls.push(options.url)
      latestInput = options.body!
      if (options.url.includes('api.tinify'))
        return { status: 401, headers: {}, data: Buffer.alloc(0) }
      return { status: 200, headers: {}, data: Buffer.from(JSON.stringify({ output: { url: 'https://example.invalid/output' } })) }
    })
    const result = await compressFile({ filePath, strategy: 'API_FIRST' })
    expect(result.error).toBeUndefined()
    expect(result.compressor).toBe('WebCompressor')
    expect(remoteCalls).toEqual(['https://api.tinify.com/shrink', 'https://api.tinify.com/shrink', 'https://tinypng.com/backend/opt/shrink'])
  })
  it('aPI_ONLY never falls back to Web', async () => {
    const { filePath } = await image()
    vi.mocked(HttpClient.prototype.request).mockImplementation(async (options) => {
      remoteCalls.push(options.url)
      return { status: 429, headers: {}, data: Buffer.alloc(0) }
    })
    expect((await compressFile({ filePath, strategy: 'API_ONLY' })).error).toBeDefined()
    expect(remoteCalls).toEqual(['https://api.tinify.com/shrink'])
  })
  it('aUTO without keys selects Web', async () => {
    const { filePath } = await image()
    initKeyManager({})
    vi.mocked(HttpClient.prototype.request).mockImplementation(async (options) => {
      remoteCalls.push(options.url)
      latestInput = options.body!
      return { status: 200, headers: {}, data: Buffer.from(JSON.stringify({ output: { url: 'https://example.invalid/output' } })) }
    })
    expect((await compressFile({ filePath })).error).toBeUndefined()
    expect(remoteCalls).toEqual(['https://tinypng.com/backend/opt/shrink'])
  })
  it('does not convert a transparent PNG', async () => {
    const { filePath } = await image('png', false, true)
    const result = await compressFile({ filePath, convertPngToJpg: true })
    expect(result.convertedPngToJpg).toBe(false)
    expect(result.outputExt).toBe('png')
    expect((await sharp(result.buffer).metadata()).hasAlpha).toBe(true)
  })
  it('preserves a successful result when cache cannot be written', async () => {
    const { filePath } = await image()
    await fs.writeFile(path.join(dir, 'node_modules', '.tinyimg'), 'blocked')
    const result = await compressFile({ filePath, strategy: 'API_ONLY' })
    expect(result.error).toBeUndefined()
    expect(result.cacheWarning).toBeDefined()
    expect(await isProcessed(result.buffer)).toBe(true)
  })
  it('processing options participate in the cache identity', async () => {
    const { filePath } = await image()
    await compressFile({ filePath, strategy: 'API_ONLY' })
    const changed = await compressFile({ filePath, strategy: 'API_ONLY', maxFileSize: 100 })
    expect(changed.cached).toBe(false)
    expect(remoteCalls).toHaveLength(2)
  })
  it('supports AVIF through compression, marking and cache retrieval', async () => {
    const { filePath } = await image('avif')
    const result = await compressFile({ filePath, strategy: 'API_ONLY' })
    expect(result.error).toBeUndefined()
    expect(result.outputExt).toBe('avif')
    expect(await isProcessed(result.buffer)).toBe(true)
    expect((await compressFile({ filePath, strategy: 'API_ONLY' })).cached).toBe(true)
  })
  it('recognizes JPEG bytes under a preserved .png filename', async () => {
    const { filePath, buffer } = await image('jpeg')
    const renamed = path.join(dir, 'renamed.png')
    await fs.rename(filePath, renamed)
    const result = await compressFile({ filePath: renamed, convertPngToJpg: true })
    expect(result.error).toBeUndefined()
    expect(result.outputExt).toBe('jpg')
    expect(result.convertedPngToJpg).toBe(false)
    expect((await sharp(result.buffer).raw().toBuffer()).equals(await sharp(buffer).raw().toBuffer())).toBe(true)
  })
  it('rejects an invalid strategy before making a remote request', async () => {
    const { filePath } = await image()
    expect((await compressFile({ filePath, strategy: 'typo' as any })).error?.message).toContain('Invalid compression strategy')
    expect(remoteCalls).toHaveLength(0)
  })
})

it('default compression never converts a processed opaque PNG', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-default-convert-'))
  try {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).png().toBuffer()
    const marked = await markProcessed(png, 'png')
    const filePath = path.join(dir, 'image.png')
    await fs.writeFile(filePath, marked)
    const result = await compressFile({ filePath })
    expect(result.buffer.equals(marked)).toBe(true)
    expect(result.outputExt).toBe('png')
    expect(result.convertedPngToJpg).not.toBe(true)
  }
  finally { await fs.rm(dir, { recursive: true, force: true }) }
})
