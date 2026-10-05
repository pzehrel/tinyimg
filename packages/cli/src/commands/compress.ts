import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import process from 'node:process'
import { canConvertToJpg, compressFile, createReporter, initKeyManager, matchFiles, resolveProjectKeysFromEnv } from '@pz4l/tinyimg-core'
import kleur from 'kleur'
import pLimit from 'p-limit'
import path from 'pathe'

export function registerCompress(t: (key: string, params?: Record<string, string | number>) => string): CommandDef {
  return {
    args: {
      paths: {
        type: 'positional',
        description: t('cli.arg.paths.description'),
        required: false,
      },
      output: {
        type: 'string',
        description: t('cli.arg.output.description'),
        alias: 'o',
      },
      strategy: {
        type: 'enum',
        options: ['AUTO', 'API_ONLY', 'API_FIRST', 'RANDOM'],
        description: t('cli.arg.strategy.description'),
        alias: 's',
        default: 'AUTO',
      },
      cache: {
        type: 'boolean',
        description: t('cli.arg.noCache.description'),
        default: true,
      },
      key: {
        type: 'string',
        description: t('cli.arg.key.description'),
        alias: 'k',
      },
      parallel: {
        type: 'string',
        description: t('cli.arg.parallel.description'),
        alias: 'p',
        default: '3',
      },
      convert: {
        type: 'boolean',
        description: t('cli.arg.convert.description'),
        alias: 'c',
        default: false,
      },
      verbose: {
        type: 'boolean',
        description: t('cli.arg.verbose.description'),
        default: false,
      },
    },
    async run({ args, cmd }) {
      const inputs = args._.length ? args._.map(String) : (args.paths ? [args.paths as string] : [])
      if (inputs.length === 0) {
        const { renderUsage } = await import('citty')
        console.log(await renderUsage(cmd))
        return
      }

      const envKeys = resolveProjectKeysFromEnv(process.env)
      const argKeys = (args.key as string | undefined)?.split(',').map(k => k.trim()).filter(Boolean) || []
      initKeyManager({
        projectKeys: argKeys.length ? argKeys : envKeys,
        useUserKeys: true,
      })

      const files = await matchFiles({
        paths: inputs,
        ignores: ['node_modules/**'],
      })

      if (files.length === 0) {
        console.log(kleur.yellow(t('cli.output.noFiles')))
        return
      }

      const parallel = Number(args.parallel)
      if (!Number.isSafeInteger(parallel) || parallel < 1)
        throw new Error('parallel must be a positive integer')
      const limit = pLimit(parallel)
      const convertiblePngs: string[] = []

      const reporter = createReporter({
        t,
        target: 'cli',
        verbose: args.verbose as boolean,
        reporter: {
          info: msg => console.log(`${kleur.cyan('[tinyimg]')} ${msg}`),
          warn: msg => console.warn(`${kleur.yellow('[tinyimg]')} ${msg}`),
          error: msg => console.error(`${kleur.red('[tinyimg]')} ${msg}`),
        },
      })

      reporter.logStart(files.length)

      await Promise.all(
        files.map(file =>
          limit(async () => {
            const relPath = path.relative(process.cwd(), file.path)
            const isPng = file.path.toLowerCase().endsWith('.png')
            const convertible = isPng ? await canConvertToJpg(file.path) : false
            if (convertible) {
              convertiblePngs.push(file.path)
            }

            const result = await compressFile({
              filePath: file.path,
              strategy: args.strategy as 'AUTO' | 'API_ONLY' | 'RANDOM' | 'API_FIRST',
              maxFileSize: 5 * 1024 * 1024,
              convertPngToJpg: args.convert as boolean,
              noCache: args.cache === false,
            })

            const ok = reporter.track(result)
            if (!ok) {
              reporter.logError(relPath, result)
              return
            }

            const outputDir = args.output as string | undefined
            if (outputDir) {
              const relative = path.relative(process.cwd(), file.path)
              if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative))
                throw new Error('Input must be inside the working directory when using --output')
              const outputPath = path.join(outputDir, relative)
              await fs.mkdir(path.dirname(outputPath), { recursive: true })
              await fs.writeFile(outputPath, result.buffer)
            }
            else if (!result.alreadyProcessed || result.convertedPngToJpg) {
              await fs.writeFile(file.path, result.buffer)
            }

            reporter.logItem(relPath, result)
          }),
        ),
      )

      reporter.logSummary()
      if (!args.convert)
        reporter.logConvertiblePngs(convertiblePngs.length)
      process.exit(reporter.getSummary().failed > 0 ? 1 : 0)
    },
  }
}
