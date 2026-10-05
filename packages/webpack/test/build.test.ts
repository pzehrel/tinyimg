import fs from 'node:fs/promises'
import os from 'node:os'
import { markProcessed } from '@pz4l/tinyimg-core'
import path from 'pathe'
import sharp from 'sharp'
import { expect, it, vi } from 'vitest'
import webpack from 'webpack'
import TinyimgWebpackPlugin from '../src/index'

it('webpack emits renamed images with working runtime URLs and source maps', async () => {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-webpack-build-')))
  vi.spyOn(os, 'homedir').mockReturnValue(path.join(dir, 'home'))
  try {
    const jpeg = await sharp({ create: { width: 12, height: 12, channels: 3, background: 'red' } }).jpeg().toBuffer()
    await fs.writeFile(path.join(dir, 'image.png'), await markProcessed(jpeg, 'jpg'))
    const png = await sharp({ create: { width: 12, height: 12, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 0.5 } } }).png().toBuffer()
    await fs.writeFile(path.join(dir, 'transparent.png'), await markProcessed(png, 'png'))
    const opaque = await sharp({ create: { width: 12, height: 12, channels: 3, background: 'red' } }).png().toBuffer()
    await fs.writeFile(path.join(dir, 'opaque.png'), await markProcessed(opaque, 'png'))
    await fs.writeFile(path.join(dir, 'main.js'), 'import image from "./image.png"; import transparent from "./transparent.png"; import opaque from "./opaque.png"; console.log(image, transparent, opaque)')
    const compiler = webpack({
      mode: 'production',
      context: dir,
      entry: './main.js',
      devtool: 'source-map',
      output: { path: path.join(dir, 'dist'), filename: 'main-[contenthash].js', assetModuleFilename: 'assets/[name]-[contenthash][ext]', publicPath: '/app/' },
      module: { rules: [{ test: /\.png$/, type: 'asset/resource' }] },
      optimization: { minimize: false },
      plugins: [new TinyimgWebpackPlugin({ strategy: 'API_ONLY', renameConvertedFiles: true })],
    })!
    const logs: Array<{ origin: string, type: string, text: string }> = []
    compiler.hooks.infrastructureLog.tap('capture-test-logs', (origin, type, args) => {
      logs.push({ origin, type, text: args?.join(' ') || '' })
      return true
    })
    await new Promise<void>((resolve, reject) => compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error || closeError || stats?.hasErrors())
          reject(error || closeError || new Error(stats?.toString({ all: false, errors: true })))
        else resolve()
      })
    }))
    expect(logs.filter(log => log.origin === 'tinyimg' && log.type === 'info')).toHaveLength(3)
    expect(logs.map(log => log.text).join(' ')).toContain('convertPngToJpg: true')
    expect(logs.some(log => log.type === 'warn')).toBe(false)
    const images = await fs.readdir(path.join(dir, 'dist/assets'))
    const renamed = images.find(name => name.startsWith('image-'))!
    expect(renamed).toMatch(/\.jpg$/)
    expect(images.find(name => name.startsWith('transparent-'))).toMatch(/\.png$/)
    const files = await fs.readdir(path.join(dir, 'dist'))
    const code = await fs.readFile(path.join(dir, 'dist', files.find(name => name.endsWith('.js'))!), 'utf8')
    expect(code).toContain(`assets/${renamed}`)
    expect(code).not.toContain(renamed.replace(/\.jpg$/, '.png'))
    const map = JSON.parse(await fs.readFile(path.join(dir, 'dist', files.find(name => name.endsWith('.map'))!), 'utf8'))
    expect(map.mappings.length).toBeGreaterThan(0)
    expect(map.sourcesContent.join(' ')).toContain('./image.png')
  }
  finally {
    vi.restoreAllMocks()
    await fs.rm(dir, { recursive: true, force: true })
  }
})
