import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { matchFiles, readCache } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'

const listCommand: CommandDef = {
  meta: {
    name: 'list',
    description: 'List image files',
  },
  args: {
    paths: {
      type: 'positional',
      description: 'image paths',
      required: false,
      default: './',
    },
    json: {
      type: 'boolean',
      description: 'output as JSON',
      default: false,
    },
    convert: {
      type: 'boolean',
      description: 'show only convertible PNGs',
      default: false,
    },
  },
  async run({ args }) {
    const inputs = args._.length ? args._.map(String) : [args.paths as string]

    const files = await matchFiles({
      paths: inputs,
      ignores: ['node_modules/**'],
      checkConvertible: true,
      includeMd5: true,
    })

    const filtered = args.convert ? files.filter(f => f.convertible) : files

    if (args.json) {
      console.log(JSON.stringify(filtered, null, 2))
      return
    }

    const cacheDir = path.join(process.cwd(), 'node_modules', '.tinyimg')
    let cacheDirExists = false
    try {
      await fs.access(cacheDir)
      cacheDirExists = true
    }
    catch {
      cacheDirExists = false
    }

    console.log('File'.padEnd(30), 'Size'.padEnd(10), 'Cache'.padEnd(8), 'Convertible')
    for (const f of filtered) {
      const rel = path.relative(process.cwd(), f.path)
      const cached = cacheDirExists ? await readCache(f.md5!, path.extname(f.path).slice(1), cacheDir) : null
      const cacheMark = cached ? kleur.green('✓') : kleur.gray('✗')
      const convMark = f.convertible ? kleur.green('Yes') : kleur.gray('No')
      console.log(rel.padEnd(30), colorSize(f.size).padEnd(10), cacheMark.padEnd(8), convMark)
    }
  },
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function colorSize(bytes: number): string {
  if (bytes < 100 * 1024)
    return kleur.green(formatSize(bytes))
  if (bytes < 500 * 1024)
    return kleur.yellow(formatSize(bytes))
  if (bytes < 1024 * 1024)
    return kleur.magenta(formatSize(bytes))
  return kleur.red(formatSize(bytes))
}

export default listCommand
