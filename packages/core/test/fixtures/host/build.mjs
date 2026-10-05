import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import os from 'node:os'
import path from 'pathe'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import tinyimg from 'tinyimg'

http.request = https.request = () => { throw new Error('Network is disabled in host compatibility tests') }
os.homedir = () => path.join(process.cwd(), 'home')
const kind = process.argv[2]
const require = createRequire(import.meta.url)
const options = { strategy: 'API_ONLY', convertPngToJpg: true, renameConvertedFiles: true }
let outputs
if (kind === 'vite') {
  const { build } = await import('vite')
  outputs = (await build({ root: process.cwd(), configFile: false, logLevel: 'silent', plugins: [tinyimg(options)], build: { write: false, assetsInlineLimit: 0, manifest: true } })).output
}
else if (kind === 'webpack') {
  const webpack = require('webpack')
  const compiler = webpack({ mode: 'production', context: process.cwd(), entry: './main.js', infrastructureLogging: { level: 'none' }, module: { rules: [{ test: /\.png$/, type: 'asset/resource' }] }, plugins: [new tinyimg(options)], optimization: { minimize: false }, output: { path: path.join(process.cwd(), 'dist'), assetModuleFilename: 'assets/[name][ext]', publicPath: '/app/' } })
  await new Promise((resolve, reject) => compiler.run((error, stats) => compiler.close(closeError => error || closeError || stats.hasErrors() ? reject(error || closeError || new Error(stats.toString({ all: false, errors: true }))) : resolve())))
}
else {
  const { createRsbuild, logger } = await import('@rsbuild/core')
  if (logger) logger.level = 'silent'
  const rsbuild = await createRsbuild({ cwd: process.cwd(), rsbuildConfig: { source: { entry: { index: './main.js' } }, output: { distPath: { root: 'dist' }, assetPrefix: '/app/', filename: { image: '[name][ext]' }, dataUriLimit: 0, minify: false }, plugins: [tinyimg(options)] } })
  await rsbuild.build()
}
if (!outputs) {
  outputs = []
  async function walk(dir) {
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      const filename = path.join(dir, item.name)
      if (item.isDirectory()) await walk(filename)
      else outputs.push({ type: 'asset', fileName: path.relative(path.join(process.cwd(), 'dist'), filename).replaceAll('\\', '/'), source: await fs.readFile(filename) })
    }
  }
  await walk(path.join(process.cwd(), 'dist'))
}
const jpeg = outputs.find(output => output.fileName.endsWith('.jpg'))
assert.ok(jpeg, 'converted JPEG asset is missing')
assert.equal((await sharp(jpeg.source).metadata()).format, 'jpeg')
assert.ok(outputs.some(output => output.fileName.includes('transparent') && output.fileName.endsWith('.png')), 'transparent PNG should keep its extension')
const js = outputs.find(output => output.fileName.endsWith('.js'))
assert.ok((js.code || js.source.toString()).includes(path.basename(jpeg.fileName)), 'JS reference must use the JPEG output')
if (kind === 'vite') {
  const html = outputs.find(output => output.fileName === 'index.html')
  assert.ok(html.source.toString().includes(path.basename(jpeg.fileName)), 'HTML reference must use the JPEG output')
  const manifest = JSON.parse(outputs.find(output => output.fileName.endsWith('manifest.json')).source.toString())
  assert.ok(Object.values(manifest).some(value => value.file === jpeg.fileName), 'manifest must reference the JPEG output')
}
console.log('compatible')
