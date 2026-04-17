import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { matchFiles, readCache } from '@pzehrel/tinyimg-core'
import { createLocaleI18n } from '@pzehrel/tinyimg-locale'
import kleur from 'kleur'

const t = createLocaleI18n()

export interface ListDeps {
  matchFiles: typeof matchFiles
  readCache: typeof readCache
  access: typeof fs.access
  cwd: string
  log: (...args: any[]) => void
}

export async function runList(args: { paths: string | undefined, _: string[], json: boolean, convert: boolean }, deps: ListDeps) {
  const inputs = args._.length ? args._.map(String) : [args.paths as string]

  const files = await deps.matchFiles({
    paths: inputs,
    ignores: ['node_modules/**'],
    checkConvertible: true,
    includeMd5: true,
  })

  const filtered = (args.convert ? files.filter(f => f.convertible) : files).sort((a, b) => b.size - a.size)

  if (args.json) {
    deps.log(JSON.stringify(filtered, null, 2))
    return
  }

  const cacheDir = path.join(deps.cwd, 'node_modules', '.tinyimg')
  let cacheDirExists = false
  try {
    await deps.access(cacheDir)
    cacheDirExists = true
  }
  catch {
    cacheDirExists = false
  }

  const maxPathLen = Math.max(
    ...filtered.map(f => path.relative(deps.cwd, f.path).length),
    20,
  )

  let cachedCount = 0
  let convertibleCount = 0
  const totalSize = filtered.reduce((sum, f) => sum + f.size, 0)

  for (const f of filtered) {
    const rel = path.relative(deps.cwd, f.path).padEnd(maxPathLen)
    const cached = cacheDirExists ? await deps.readCache(f.md5!, path.extname(f.path).slice(1), cacheDir) : null
    const lineColor = getLineColor(f.size)
    const parts: string[] = [rel, formatSize(f.size).padStart(8)]
    const tags: string[] = []
    if (cached) {
      tags.push(t('cli.output.usedCache'))
      cachedCount++
    }
    if (f.convertible) {
      tags.push(t('cli.output.convertible'))
      convertibleCount++
    }
    if (tags.length > 0) {
      parts.push(`(${tags.join(', ')})`)
    }
    deps.log(lineColor(parts.join('  ')))
  }

  if (filtered.length > 0) {
    const summaryParts = [
      `${t('cli.output.total')}: ${filtered.length}`,
      `${t('cli.output.size')}: ${formatSize(totalSize)}`,
    ]
    if (cachedCount > 0) {
      summaryParts.push(`${t('cli.output.cached')}: ${cachedCount}`)
    }
    if (convertibleCount > 0) {
      summaryParts.push(`${t('cli.output.convertible')}: ${convertibleCount}`)
    }
    deps.log(`\n${summaryParts.join('  ')}`)
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function getLineColor(bytes: number) {
  if (bytes < 100 * 1024)
    return kleur.green
  if (bytes < 500 * 1024)
    return kleur.yellow
  if (bytes < 1024 * 1024)
    return kleur.magenta
  return kleur.red
}

const listCommand: CommandDef = {
  meta: {
    name: 'list',
    description: t('cli.command.list.description'),
  },
  args: {
    paths: {
      type: 'positional',
      description: t('cli.arg.paths.description'),
      required: false,
      default: './',
    },
    json: {
      type: 'boolean',
      description: t('cli.arg.json.description'),
      default: false,
    },
    convert: {
      type: 'boolean',
      description: t('cli.arg.convertList.description'),
      alias: 'c',
      default: false,
    },
  },
  async run({ args }) {
    await runList(
      { paths: args.paths as string, _: args._.map(String), json: args.json as boolean, convert: args.convert as boolean },
      {
        matchFiles,
        readCache,
        access: fs.access,
        cwd: process.cwd(),
        log: console.log,
      },
    )
  },
}

export default listCommand
