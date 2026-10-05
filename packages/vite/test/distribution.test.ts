import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { markProcessed } from '@pz4l/tinyimg-core'
import path from 'pathe'
import sharp from 'sharp'
import { expect, it } from 'vitest'

it('built plugins load and the CLI works outside the repository working directory', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-distribution-'))
  try {
    const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    for (const name of ['vite', 'webpack', 'rsbuild']) {
      const module = path.join(packages, name, 'dist/index.mjs')
      const code = `await import(${JSON.stringify(module)}); console.log('loaded')`
      expect(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: dir, encoding: 'utf8' }).trim()).toBe('loaded')
      const requireCode = `require(${JSON.stringify(path.join(packages, name, 'dist/index.cjs'))}); console.log('loaded')`
      expect(execFileSync(process.execPath, ['-e', requireCode], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()).toBe('loaded')
    }
    const cli = path.join(packages, 'cli', 'dist/index.mjs')
    const output = execFileSync(process.execPath, [cli, '--help'], { cwd: dir, encoding: 'utf8' })
    expect(output).toContain('tinyimg')
    expect(output).toContain('compress')
  }
  finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

it('cLI writes marked PNG/AVIF inputs into the requested output directory without changing sources', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-cli-output-'))
  try {
    const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    const cli = path.join(packages, 'cli', 'dist/index.mjs')
    const preload = path.join(dir, 'isolate.cjs')
    await fs.writeFile(preload, `require('node:os').homedir = () => ${JSON.stringify(path.join(dir, 'home'))}`)
    for (const format of ['png', 'avif'] as const) {
      const input = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).toFormat(format).toBuffer()
      const marked = await markProcessed(input, format)
      const name = `image.${format}`
      await fs.writeFile(path.join(dir, name), marked)
      execFileSync(process.execPath, ['--require', preload, cli, name, '-o', 'output', '-s', 'API_ONLY', '--no-cache'], { cwd: dir, encoding: 'utf8' })
      expect((await fs.readFile(path.join(dir, 'output', name))).equals(marked)).toBe(true)
      expect((await fs.readFile(path.join(dir, name))).equals(marked)).toBe(true)
    }
  }
  finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

it('cLI env.local overrides env while shell keys retain highest priority', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-cli-env-'))
  try {
    const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    const cli = path.join(packages, 'cli', 'dist/index.mjs')
    const preload = path.join(dir, 'isolate.cjs')
    await fs.writeFile(preload, `require('node:os').homedir = () => ${JSON.stringify(path.join(dir, 'home'))}`)
    await fs.writeFile(path.join(dir, '.env'), 'TINYIMG_KEY=9999shared8888')
    await fs.writeFile(path.join(dir, '.env.local'), 'TINYIMG_KEY=1111local2222')
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(?:.*_)?(?:TINYIMG_KEY|TINYIMG_KEYS|TINYPNG_KEY|TINYPNG_KEYS)$/.test(name)))
    const local = execFileSync(process.execPath, ['--require', preload, cli, 'keys'], { cwd: dir, env, encoding: 'utf8' })
    expect(local).toContain('1111****2222')
    expect(local).not.toContain('9999****8888')
    const shell = execFileSync(process.execPath, ['--require', preload, cli, 'keys'], { cwd: dir, env: { ...env, TINYIMG_KEY: '3333shell4444' }, encoding: 'utf8' })
    expect(shell).toContain('3333****4444')
    expect(shell).not.toContain('1111****2222')
  }
  finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

it('cLI defaults to preserving opaque PNGs, prints a hint, and converts only when requested', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-cli-conversion-'))
  try {
    const packages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    const cli = path.join(packages, 'cli', 'dist/index.mjs')
    const preload = path.join(dir, 'isolate.cjs')
    await fs.writeFile(preload, `require('node:os').homedir = () => ${JSON.stringify(path.join(dir, 'home'))}`)
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).png().toBuffer()
    const marked = await markProcessed(png, 'png')
    const imagePath = path.join(dir, 'image.png')
    await fs.writeFile(imagePath, marked)
    const defaults = execFileSync(process.execPath, ['--require', preload, cli, 'image.png'], { cwd: dir, encoding: 'utf8' })
    expect(defaults).toContain('--convert')
    expect((await fs.readFile(imagePath)).equals(marked)).toBe(true)
    const enabled = execFileSync(process.execPath, ['--require', preload, cli, 'image.png', '--convert', '--verbose'], { cwd: dir, encoding: 'utf8' })
    expect(enabled).not.toContain('--convert')
    expect(enabled).toContain('PNG → JPG')
    expect((await sharp(imagePath).metadata()).format).toBe('jpeg')
  }
  finally { await fs.rm(dir, { recursive: true, force: true }) }
})
