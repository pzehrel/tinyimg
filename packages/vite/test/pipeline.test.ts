import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import { canConvertToJpg, compressFile, initKeyManager } from '@pz4l/tinyimg-core'
import path from 'pathe'
import sharp from 'sharp'
import { build } from 'vite'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import tinyimg from '../src/index'

vi.mock('@pz4l/tinyimg-core', async importOriginal => ({
  ...await importOriginal<typeof import('@pz4l/tinyimg-core')>(),
  compressFile: vi.fn(),
  canConvertToJpg: vi.fn(async () => false),
  initKeyManager: vi.fn(),
  resolveProjectKeysFromEnv: (env: Record<string, string>) => env.TINYPNG_KEY ? [env.TINYPNG_KEY] : [],
  listProjectKeys: () => ['fake'],
  listUserKeys: async () => [],
}))
let dir: string
beforeEach(async () => {
  dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-vite-test-')))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.mocked(compressFile).mockImplementation(async ({ filePath }) => {
    const buffer = await fs.readFile(filePath)
    return { buffer, originalSize: buffer.length, compressedSize: buffer.length, ratio: 1, compressor: 'Mock', cached: false, outputExt: 'png' }
  })
})
afterEach(async () => {
  vi.restoreAllMocks()
  vi.mocked(compressFile).mockReset()
  vi.mocked(initKeyManager).mockReset()
  vi.mocked(canConvertToJpg).mockResolvedValue(false)
  vi.unstubAllEnvs()
  await fs.rm(dir, { recursive: true, force: true })
})
it('forwards cache disabling and removes temporary files', async () => {
  await tinyimg({ noCache: true }).generateBundle({}, { 'image.png': { type: 'asset', source: Buffer.from('A') } })
  const options = vi.mocked(compressFile).mock.calls[0][0]
  expect(options.noCache).toBe(true)
  await expect(fs.access(path.dirname(options.filePath))).rejects.toThrow()
})
it('isolates same-basename assets even in the same millisecond', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000)
  vi.mocked(compressFile).mockImplementation(async ({ filePath }) => {
    await new Promise(resolve => setTimeout(resolve, 10))
    const buffer = await fs.readFile(filePath)
    return { buffer, originalSize: buffer.length, compressedSize: buffer.length, ratio: 1, compressor: 'Mock', cached: false, outputExt: 'png' }
  })
  const bundle = { 'a/icon.png': { type: 'asset', source: Buffer.from('AAAA') }, 'b/icon.png': { type: 'asset', source: Buffer.from('BBBB') } }
  await tinyimg({ parallel: 2 }).generateBundle({}, bundle)
  expect(bundle['a/icon.png'].source.toString()).toBe('AAAA')
  expect(bundle['b/icon.png'].source.toString()).toBe('BBBB')
})
it('loads build-only env.local secrets with Vite root and envDir', async () => {
  vi.stubEnv('TINYPNG_KEY', undefined)
  const envDir = path.join(dir, 'config')
  await fs.mkdir(envDir)
  await fs.writeFile(path.join(envDir, '.env'), 'TINYPNG_KEY=fake-shared')
  await fs.writeFile(path.join(envDir, '.env.local'), 'TINYPNG_KEY=fake-local\nUSE_USER_TINYIMG_KEYS=true')
  await fs.writeFile(path.join(dir, 'main.js'), 'console.log("test")')
  await build({ root: dir, envDir, configFile: false, logLevel: 'silent', plugins: [tinyimg()], build: { write: false, rollupOptions: { input: path.join(dir, 'main.js') } } })
  expect(vi.mocked(initKeyManager).mock.calls.at(-1)?.[0]).toEqual({ projectKeys: ['fake-local'], useUserKeys: true })
})
it('retains the original asset after a compression failure and cleans temporary storage', async () => {
  vi.mocked(compressFile).mockImplementation(async () => ({ buffer: Buffer.from('A'), originalSize: 1, compressedSize: 1, ratio: 1, compressor: '', cached: false, outputExt: 'png', error: new Error('No key') }))
  const bundle = { 'image.png': { type: 'asset', source: Buffer.from('A') } }
  await tinyimg({ strategy: 'API_ONLY' }).generateBundle({}, bundle)
  expect(bundle['image.png'].source.toString()).toBe('A')
  await expect(fs.access(path.dirname(vi.mocked(compressFile).mock.calls[0][0].filePath))).rejects.toThrow()
})
it('cleans temporary storage if processing throws unexpectedly', async () => {
  vi.mocked(compressFile).mockRejectedValue(new Error('unexpected'))
  await expect(tinyimg().generateBundle({}, { 'image.png': { type: 'asset', source: Buffer.from('A') } })).rejects.toThrow('unexpected')
  await expect(fs.access(path.dirname(vi.mocked(compressFile).mock.calls[0][0].filePath))).rejects.toThrow()
})

for (const rename of [false, true]) {
  it(`Vite conversion with rename=${rename} keeps JS/CSS/HTML/manifest references valid`, async () => {
    const png = await sharp({ create: { width: 12, height: 12, channels: 3, background: 'red' } }).png().toBuffer()
    const jpeg = await sharp(png).jpeg().toBuffer()
    await fs.writeFile(path.join(dir, 'opaque.png'), png)
    await fs.writeFile(path.join(dir, 'main.js'), 'import img from "./opaque.png"; import "./style.css"; console.log(img)')
    await fs.writeFile(path.join(dir, 'style.css'), '.banner { background: url("./opaque.png?version=1#hero") }')
    await fs.writeFile(path.join(dir, 'index.html'), '<script type="module" src="./main.js"></script><img src="./opaque.png"><img srcset="./opaque.png 1x, ./opaque.png 2x">')
    vi.mocked(compressFile).mockResolvedValue({ buffer: jpeg, originalSize: png.length, compressedSize: jpeg.length, ratio: 1, compressor: 'Cache', cached: true, outputExt: 'jpg', convertedPngToJpg: true })
    const result = await build({ root: dir, base: '/app/', configFile: false, logLevel: 'silent', plugins: [tinyimg({ convertPngToJpg: true, renameConvertedFiles: rename })], build: { write: false, manifest: true, sourcemap: true, assetsInlineLimit: 0 } }) as any
    const output = result.output as any[]
    const image = output.find(asset => /\.(?:png|jpg)$/.test(asset.fileName))
    expect(image.fileName.endsWith(rename ? '.jpg' : '.png')).toBe(true)
    expect((await sharp(image.source).metadata()).format).toBe('jpeg')
    const basename = path.basename(image.fileName)
    for (const ext of ['.js', '.css', '.html']) {
      const asset = output.find(asset => asset.fileName.endsWith(ext))
      const text = asset.code || asset.source.toString()
      expect(text).toContain(basename)
      if (rename)
        expect(text).not.toContain(basename.replace(/\.jpg$/, '.png'))
    }
    const manifest = JSON.parse(output.find(asset => asset.fileName === '.vite/manifest.json').source.toString())
    expect(manifest['opaque.png'].file).toBe(image.fileName)
    expect(manifest['opaque.png'].src).toBe('opaque.png')
    expect(manifest['index.html'].assets).toContain(image.fileName)
  })
}
it('refuses renaming when the target filename already exists', async () => {
  vi.mocked(compressFile).mockResolvedValue({ buffer: Buffer.from('jpeg'), originalSize: 4, compressedSize: 4, ratio: 1, compressor: 'Mock', cached: false, outputExt: 'jpg', convertedPngToJpg: true })
  const bundle = { 'image.png': { type: 'asset', fileName: 'image.png', source: Buffer.from('A') }, 'image.jpg': { type: 'asset', fileName: 'image.jpg', source: Buffer.from('B') } }
  await expect(tinyimg({ renameConvertedFiles: true }).generateBundle({}, bundle)).rejects.toThrow('target asset already exists')
  expect(Object.keys(bundle)).toEqual(['image.png', 'image.jpg'])
})

for (const enabled of [false, true]) {
  it(`uses Vite's logger and conversion hint follows convertPngToJpg=${enabled}`, async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    vi.mocked(canConvertToJpg).mockResolvedValue(true)
    const plugin = tinyimg({ convertPngToJpg: enabled })
    plugin.configResolved({ mode: 'production', envDir: dir, base: '/', logger })
    await plugin.generateBundle({}, { 'image.png': { type: 'asset', source: Buffer.from('opaque') } })
    expect(logger.info.mock.calls.length).toBe(enabled ? 2 : 3)
    const text = logger.info.mock.calls.flat().join(' ')
    expect(text).toContain('[tinyimg]')
    if (enabled)
      expect(text).not.toContain('convertPngToJpg: true')
    else expect(text).toContain('convertPngToJpg: true')
    expect(logger.warn).not.toHaveBeenCalled()
    expect(console.log).not.toHaveBeenCalled()
  })
}
it('does not suggest conversion for transparent or non-PNG assets', async () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const plugin = tinyimg()
  plugin.configResolved({ mode: 'production', envDir: dir, base: '/', logger })
  await plugin.generateBundle({}, { 'transparent.png': { type: 'asset', source: Buffer.from('transparent') }, 'photo.jpg': { type: 'asset', source: Buffer.from('jpeg') } })
  expect(logger.info.mock.calls.flat().join(' ')).not.toContain('convertPngToJpg: true')
})

it('preserves manifest source aliases when identical PNGs share one renamed asset', async () => {
  const png = await sharp({ create: { width: 12, height: 12, channels: 3, background: 'red' } }).png().toBuffer()
  const jpeg = await sharp(png).jpeg().toBuffer()
  await fs.writeFile(path.join(dir, 'a.png'), png)
  await fs.writeFile(path.join(dir, 'b.png'), png)
  await fs.writeFile(path.join(dir, 'main.js'), 'import a from "./a.png"; import b from "./b.png"; console.log(a,b)')
  vi.mocked(compressFile).mockResolvedValue({ buffer: jpeg, originalSize: png.length, compressedSize: jpeg.length, ratio: 1, compressor: 'Cache', cached: true, outputExt: 'jpg', convertedPngToJpg: true })
  const result = await build({ root: dir, configFile: false, logLevel: 'silent', plugins: [tinyimg({ convertPngToJpg: true, renameConvertedFiles: true })], build: { write: false, assetsInlineLimit: 0, manifest: true, rollupOptions: { input: path.join(dir, 'main.js') } } }) as any
  const manifest = JSON.parse(result.output.find((asset: any) => asset.fileName.endsWith('manifest.json')).source.toString())
  expect(manifest['a.png'].file).toMatch(/\.jpg$/)
  expect(manifest['b.png'].file).toBe(manifest['a.png'].file)
  expect(manifest['a.png'].src).toBe('a.png')
})
