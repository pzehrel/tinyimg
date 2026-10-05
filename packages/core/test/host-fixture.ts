import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import path from 'pathe'
import sharp from 'sharp'
import { markProcessed } from '../src/convert'

const exec = promisify(execFile)
const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Copy published files into a consumer fixture so the plugin resolves the selected
// host, not the workspace's latest host. HTTP is disabled in the child process.
export async function runHostFixture(kind: 'vite' | 'webpack' | 'rsbuild', host: string): Promise<string> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), `tinyimg-${kind}-compat-`)))
  try {
    const pluginRoot = path.join(packages, kind)
    const installed = path.join(dir, 'node_modules/tinyimg')
    await fs.mkdir(installed, { recursive: true })
    await fs.cp(path.join(pluginRoot, 'dist'), path.join(installed, 'dist'), { recursive: true })
    await fs.copyFile(path.join(pluginRoot, 'package.json'), path.join(installed, 'package.json'))
    const hostName = kind === 'rsbuild' ? '@rsbuild/core' : kind
    const hostRoot = await fs.realpath(path.join(pluginRoot, 'node_modules', host))
    for (const [name, target] of [[hostName, hostRoot], ...await Promise.all(['sharp', 'p-limit', 'pathe'].map(async name => [name, await fs.realpath(path.join(pluginRoot, 'node_modules', name))]))]) {
      const link = path.join(dir, 'node_modules', name)
      await fs.mkdir(path.dirname(link), { recursive: true })
      await fs.symlink(target, link, 'dir')
    }
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toBuffer()
    await fs.writeFile(path.join(dir, 'opaque.png'), await markProcessed(png, 'png'))
    const transparent = await sharp({ create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 0.5 } } }).png().toBuffer()
    await fs.writeFile(path.join(dir, 'transparent.png'), await markProcessed(transparent, 'png'))
    await fs.writeFile(path.join(dir, 'main.js'), 'import image from "./opaque.png"; import transparent from "./transparent.png"; console.log(image, transparent)')
    await fs.writeFile(path.join(dir, 'style.css'), '.hero{background:url("./opaque.png")}')
    await fs.writeFile(path.join(dir, 'index.html'), '<script type="module" src="./main.js"></script><img src="./opaque.png">')
    const fixture = path.join(packages, 'core/test/fixtures/host/build.mjs')
    await fs.copyFile(fixture, path.join(dir, 'build.mjs'))
    const { stdout } = await exec(process.execPath, [path.join(dir, 'build.mjs'), kind], { cwd: dir, timeout: 30000, maxBuffer: 1024 * 1024 })
    return stdout.trim().split('\n').at(-1)!
  }
  finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}
