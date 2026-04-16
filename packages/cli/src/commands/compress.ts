import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { canConvertToJpg, compressFile, initKeyManager, isProcessed, markProcessed, matchFiles, resolveProjectKeysFromEnv } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'
import pLimit from 'p-limit'

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
        type: 'string',
        description: t('cli.arg.strategy.description'),
        alias: 's',
        default: 'AUTO',
      },
      noCache: {
        type: 'boolean',
        description: t('cli.arg.noCache.description'),
        default: false,
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
    },
    async run({ args, cmd }) {
      const subCommands = ['convert', 'keys', 'list', 'ls']
      if (args._.length && subCommands.includes(args._[0] as string)) {
        return
      }

      const inputs = args._.length ? args._.map(String) : (args.paths ? [args.paths as string] : [])
      if (inputs.length === 0) {
        const { renderUsage } = await import('citty')
        console.log(await renderUsage(cmd))
        return
      }

      const envKeys = resolveProjectKeysFromEnv(process.env)
      const argKeys = (args.key as string | undefined)?.split(',').map(k => k.trim()).filter(Boolean) || []
      initKeyManager({
        projectKeys: [...envKeys, ...argKeys],
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

      const limit = pLimit(Number(args.parallel) || 3)
      let success = 0
      let failed = 0
      let cached = 0
      let saved = 0

      await Promise.all(
        files.map(file =>
          limit(async () => {
            const buf = await fs.readFile(file.path)
            const relPath = path.relative(process.cwd(), file.path)

            if (await isProcessed(buf)) {
              const sizeStr = formatSize(file.size).padEnd(8)
              console.log(kleur.green(t('status.success')), relPath.padEnd(40), `${sizeStr} → ${sizeStr.padEnd(8)}`, kleur.gray(`(${t('cli.output.usedCache')})`))
              cached++
              return
            }

            const result = await compressFile({
              filePath: file.path,
              strategy: args.strategy as 'AUTO' | 'API_ONLY' | 'RANDOM' | 'API_FIRST',
              maxFileSize: 5 * 1024 * 1024,
            })

            if (result.error) {
              console.log(kleur.red(t('status.failed')), relPath.padEnd(40), kleur.red().bold(t('cli.output.failed')), result.error.message, kleur.gray(`(${result.compressor})`))
              failed++
              return
            }

            const ext = path.extname(file.path).slice(1).toLowerCase()
            const processedBuf = await markProcessed(result.buffer, ext as 'png' | 'jpg' | 'jpeg' | 'webp')

            const outputDir = args.output as string | undefined
            let outputPath = file.path
            if (outputDir) {
              outputPath = path.join(outputDir, path.relative(process.cwd(), outputPath))
              await fs.mkdir(path.dirname(outputPath), { recursive: true })
            }

            await fs.writeFile(outputPath, processedBuf)

            if (result.cached) {
              console.log(kleur.green(t('status.success')), relPath.padEnd(40), `${formatSize(result.originalSize).padEnd(8)} → ${formatSize(result.compressedSize).padEnd(8)}`, kleur.gray(`(${t('cli.output.usedCache')})`))
              cached++
            }
            else {
              console.log(kleur.green(t('status.success')), relPath.padEnd(40), `${formatSize(result.originalSize).padEnd(8)} → ${formatSize(result.compressedSize).padEnd(8)}`)
              success++
              saved += result.originalSize - result.compressedSize
            }
          }),
        ),
      )

      const convertiblePngs: string[] = []
      for (const file of files) {
        if (file.path.toLowerCase().endsWith('.png') && await canConvertToJpg(file.path)) {
          convertiblePngs.push(file.path)
        }
      }
      if (convertiblePngs.length > 0) {
        console.log(kleur.yellow(t('cli.output.convertiblePngsHint', { count: convertiblePngs.length })))
        for (const p of convertiblePngs) {
          console.log(kleur.yellow(`  ${path.relative(process.cwd(), p)}`))
        }
        console.log(kleur.yellow(t('cli.output.convertiblePngsCommand')))
      }

      console.log(`[tinyimg] ${t('cli.output.compressionComplete')}  ${t('cli.output.total')}: ${files.length}  ${t('cli.output.success')}: ${success}  ${t('cli.output.cached')}: ${cached}  ${t('summary.failed')}: ${failed}  ${t('cli.output.saved')}: ${formatSize(saved)}`)
      process.exit(failed > 0 ? 1 : 0)
    },
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
