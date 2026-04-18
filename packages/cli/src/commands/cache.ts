import type { CommandDef } from 'citty'
import process from 'node:process'
import { clearCache, getCacheDir, getUserCacheDir, listCacheEntries } from '@pz4l/tinyimg-core'
import { createLocaleI18n } from '@pz4l/tinyimg-locale'
import kleur from 'kleur'

const t = createLocaleI18n()

export interface CacheDeps {
  getCacheDir: typeof getCacheDir
  getUserCacheDir: typeof getUserCacheDir
  listCacheEntries: typeof listCacheEntries
  clearCache: typeof clearCache
  confirm: (message: string) => Promise<boolean>
  cwd: string
  log: (...args: any[]) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export async function runCacheList(args: { global: boolean }, deps: CacheDeps) {
  const cacheDir = args.global ? deps.getUserCacheDir() : deps.getCacheDir(deps.cwd)
  const entries = await deps.listCacheEntries(cacheDir)

  if (entries.length === 0) {
    deps.log(kleur.yellow(t('cli.output.cacheNotFound')))
    return
  }

  for (const entry of entries) {
    deps.log(`${entry.md5.slice(0, 12).padEnd(12)}  ${entry.ext.padEnd(4)}  ${formatSize(entry.size).padStart(8)}`)
  }

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0)
  deps.log(`\n${t('cli.output.total')}: ${entries.length}  ${t('cli.output.size')}: ${formatSize(totalSize)}`)
}

export async function runCacheInfo(deps: CacheDeps) {
  const projectDir = deps.getCacheDir(deps.cwd)
  const userDir = deps.getUserCacheDir()

  const projectEntries = await deps.listCacheEntries(projectDir)
  const userEntries = await deps.listCacheEntries(userDir)

  const projectSize = projectEntries.reduce((sum, e) => sum + e.size, 0)
  const userSize = userEntries.reduce((sum, e) => sum + e.size, 0)

  deps.log(`${kleur.cyan(t('cli.output.projectCache'))} (${projectDir}):`)
  if (projectEntries.length > 0) {
    deps.log(`  ${t('cli.output.files')}: ${projectEntries.length}`)
    deps.log(`  ${t('cli.output.size')}: ${formatSize(projectSize)}`)
  }
  else {
    deps.log(`  ${t('cli.output.cacheNotFound')}`)
  }

  deps.log()
  deps.log(`${kleur.cyan(t('cli.output.userCache'))} (${userDir}):`)
  if (userEntries.length > 0) {
    deps.log(`  ${t('cli.output.files')}: ${userEntries.length}`)
    deps.log(`  ${t('cli.output.size')}: ${formatSize(userSize)}`)
  }
  else {
    deps.log(`  ${t('cli.output.cacheNotFound')}`)
  }

  if (projectEntries.length > 0 || userEntries.length > 0) {
    deps.log()
    deps.log(`${kleur.cyan(t('cli.output.combined'))}:`)
    deps.log(`  ${t('cli.output.files')}: ${projectEntries.length + userEntries.length}`)
    deps.log(`  ${t('cli.output.size')}: ${formatSize(projectSize + userSize)}`)
  }
}

export async function runCacheClear(args: { global: boolean, yes: boolean }, deps: CacheDeps) {
  const cacheDir = args.global ? deps.getUserCacheDir() : deps.getCacheDir(deps.cwd)
  const entries = await deps.listCacheEntries(cacheDir)

  if (entries.length === 0) {
    deps.log(kleur.yellow(t('cli.output.cacheNotFound')))
    return
  }

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0)
  const scope = args.global ? t('cli.output.userCache') : t('cli.output.projectCache')

  if (!args.yes) {
    const message = t('cli.output.cacheClearConfirm', {
      scope,
      dir: cacheDir,
      count: entries.length,
      size: formatSize(totalSize),
    })
    const confirmed = await deps.confirm(message)
    if (!confirmed) {
      deps.log(t('cli.output.cacheClearCancelled'))
      return
    }
  }

  const result = await deps.clearCache(cacheDir)
  deps.log(kleur.green(t('cli.output.cacheCleared')), `(${result.deleted} ${t('cli.output.files')})`)
}

async function defaultConfirm(message: string): Promise<boolean> {
  const { createInterface } = await import('node:readline')
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(`${message} `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

const listCommand: CommandDef = {
  meta: {
    name: 'list',
    description: t('cli.command.cache.list.description'),
  },
  args: {
    global: {
      type: 'boolean',
      description: t('cli.arg.global.description'),
      alias: 'g',
      default: false,
    },
  },
  async run({ args }) {
    await runCacheList(
      { global: args.global as boolean },
      {
        getCacheDir,
        getUserCacheDir,
        listCacheEntries,
        clearCache,
        confirm: defaultConfirm,
        cwd: process.cwd(),
        log: console.log,
      },
    )
  },
}

const infoCommand: CommandDef = {
  meta: {
    name: 'info',
    description: t('cli.command.cache.info.description'),
  },
  async run() {
    await runCacheInfo({
      getCacheDir,
      getUserCacheDir,
      listCacheEntries,
      clearCache,
      confirm: defaultConfirm,
      cwd: process.cwd(),
      log: console.log,
    })
  },
}

const clearCommand: CommandDef = {
  meta: {
    name: 'clear',
    description: t('cli.command.cache.clear.description'),
  },
  args: {
    global: {
      type: 'boolean',
      description: t('cli.arg.global.description'),
      alias: 'g',
      default: false,
    },
    yes: {
      type: 'boolean',
      description: t('cli.arg.yes.description'),
      alias: 'y',
      default: false,
    },
  },
  async run({ args }) {
    await runCacheClear(
      { global: args.global as boolean, yes: args.yes as boolean },
      {
        getCacheDir,
        getUserCacheDir,
        listCacheEntries,
        clearCache,
        confirm: defaultConfirm,
        cwd: process.cwd(),
        log: console.log,
      },
    )
  },
}

const cacheCommand: CommandDef = {
  meta: {
    name: 'cache',
    description: t('cli.command.cache.description'),
  },
  subCommands: {
    list: listCommand,
    info: infoCommand,
    clear: clearCommand,
  },
}

export default cacheCommand
