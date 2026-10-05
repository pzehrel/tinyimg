import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { canConvertToJpg, compressFile } from '@pz4l/tinyimg-core'
import path from 'pathe'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import tinyimgRsbuild from '../../rsbuild/src/index'
import TinyimgWebpackPlugin from '../src/index'

vi.mock('@pz4l/tinyimg-core', async importOriginal => ({
  ...await importOriginal<typeof import('@pz4l/tinyimg-core')>(),
  compressFile: vi.fn(),
  canConvertToJpg: vi.fn(async () => false),
  initKeyManager: vi.fn(),
  resolveProjectKeysFromEnv: () => [],
  listProjectKeys: () => ['fake'],
  listUserKeys: async () => [],
}))
class RawSource {
  constructor(private buffer: Buffer) {}
  source() { return this.buffer }
}
beforeEach(() => {
  vi.mocked(canConvertToJpg).mockResolvedValue(false)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000)
  vi.mocked(compressFile).mockImplementation(async ({ filePath }) => {
    await new Promise(resolve => setTimeout(resolve, 5))
    const buffer = await fs.readFile(filePath)
    return { buffer, originalSize: buffer.length, compressedSize: buffer.length, ratio: 1, compressor: 'Mock', cached: false, outputExt: 'png' }
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(compressFile).mockReset()
})
for (const adapter of ['webpack', 'rsbuild']) {
  it(`${adapter} forwards noCache, isolates filenames and processes uppercase extensions`, async () => {
    vi.mocked(canConvertToJpg).mockResolvedValue(true)
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const assets: Record<string, RawSource> = {
      'a/icon.png': new RawSource(Buffer.from('AAAA')),
      'b/icon.png': new RawSource(Buffer.from('BBBB')),
      'upper.PNG': new RawSource(Buffer.from('CCCC')),
    }
    let run: () => Promise<void> = async () => {}
    const compilation = {
      hooks: { processAssets: { tapPromise: (_options: unknown, callback: () => Promise<void>) => { run = callback } } },
      getAssets: () => Object.entries(assets).map(([name, source]) => ({ name, source })),
      getAsset: (name: string) => ({ source: assets[name] }),
      updateAsset: (name: string, source: RawSource) => { assets[name] = source },
    }
    if (adapter === 'webpack') {
      const compiler = {
        getInfrastructureLogger: () => logger,
        hooks: { compilation: { tap: (_name: string, callback: (compilation: unknown) => void) => callback(compilation) } },
        webpack: { Compilation: { PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: 1 }, sources: { RawSource } },
      }
      new TinyimgWebpackPlugin({ noCache: true }).apply(compiler as any)
    }
    else {
      tinyimgRsbuild({ noCache: true }).setup!({
        onBeforeBuild: (callback: () => void) => callback(),
        processAssets: (_options: unknown, callback: (context: unknown) => Promise<void>) => { run = () => callback({ assets, sources: { RawSource }, compilation }) },
        logger,
      } as any)
    }
    await run()
    expect(assets['a/icon.png'].source().toString()).toBe('AAAA')
    expect(assets['b/icon.png'].source().toString()).toBe('BBBB')
    expect(assets['upper.PNG'].source().toString()).toBe('CCCC')
    expect(vi.mocked(compressFile).mock.calls).toHaveLength(3)
    expect(logger.info).toHaveBeenCalledTimes(3)
    expect(logger.info.mock.calls.flat().join(' ')).toContain('convertPngToJpg: true')
    expect(logger.warn).not.toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
    for (const [options] of vi.mocked(compressFile).mock.calls) {
      expect(options.noCache).toBe(true)
      await expect(fs.access(path.dirname(options.filePath))).rejects.toThrow()
    }
  })
}

for (const adapter of ['webpack', 'rsbuild']) {
  it(`${adapter} renames JPEG output and rewrites references after assets are generated`, async () => {
    vi.mocked(compressFile).mockImplementation(async ({ filePath }) => {
      const buffer = await fs.readFile(filePath)
      const jpeg = path.basename(filePath) === 'image.png'
      return { buffer, originalSize: buffer.length, compressedSize: buffer.length, ratio: 1, compressor: 'Cache', cached: true, outputExt: jpeg ? 'jpg' : 'png', convertedPngToJpg: jpeg }
    })
    const assets: Record<string, RawSource> = {
      'assets/image.png': new RawSource(Buffer.from('JPEG')),
      'assets/transparent.png': new RawSource(Buffer.from('PNG')),
      'assets/main.js': new RawSource(Buffer.from('const image = "assets/image.png";')),
      'assets/main.css': new RawSource(Buffer.from('a{background:url(./image.png?v=1#hero)}')),
      'index.html': new RawSource(Buffer.from('<img src="/app/assets/image.png">')),
      'manifest.json': new RawSource(Buffer.from('{"file":"assets/image.png"}')),
    }
    const hooks: Array<() => Promise<void> | void> = []
    const compilation = {
      outputOptions: { publicPath: '/app/' },
      hooks: { processAssets: {
        tapPromise: (_options: unknown, callback: () => Promise<void>) => { hooks.push(callback) },
        tap: (_options: unknown, callback: () => void) => { hooks.push(callback) },
      } },
      getAssets: () => Object.entries(assets).map(([name, source]) => ({ name, source })),
      getAsset: (name: string) => ({ source: assets[name] }),
      updateAsset: (name: string, source: RawSource) => { assets[name] = source },
      renameAsset: (from: string, to: string) => {
        assets[to] = assets[from]
        delete assets[from]
      },
    }
    class ReplaceSource extends RawSource {
      constructor(source: RawSource) { super(Buffer.from(source.source())) }
      replace(start: number, end: number, value: string) {
        const text = this.source().toString()
        Object.assign(this, { buffer: Buffer.from(text.slice(0, start) + value + text.slice(end + 1)) })
      }
    }
    const sources = { RawSource, ReplaceSource }
    if (adapter === 'webpack') {
      new TinyimgWebpackPlugin({ renameConvertedFiles: true }).apply({
        getInfrastructureLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
        hooks: { compilation: { tap: (_name: string, callback: (context: unknown) => void) => callback(compilation) } },
        webpack: { Compilation: { PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: 1, PROCESS_ASSETS_STAGE_SUMMARIZE: 2 }, sources },
      } as any)
    }
    else {
      tinyimgRsbuild({ renameConvertedFiles: true }).setup!({
        onBeforeBuild: (callback: () => void) => callback(),
        processAssets: (_options: unknown, callback: (context: unknown) => Promise<void> | void) => { hooks.push(() => callback({ assets, sources, compilation })) },
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      } as any)
    }
    for (const hook of hooks)
      await hook()
    expect(assets['assets/image.png']).toBeUndefined()
    expect(assets['assets/image.jpg'].source().toString()).toBe('JPEG')
    expect(assets['assets/transparent.png'].source().toString()).toBe('PNG')
    for (const name of ['assets/main.js', 'assets/main.css', 'index.html', 'manifest.json']) {
      expect(assets[name].source().toString()).toContain('image.jpg')
      expect(assets[name].source().toString()).not.toContain('image.png')
    }
  })
}
