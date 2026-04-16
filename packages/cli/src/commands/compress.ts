import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { compressFile, initKeyManager, isProcessed, markProcessed, matchFiles } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'
import pLimit from 'p-limit'

export function registerCompress(): CommandDef {
  return {
    args: {
      paths: {
        type: 'positional',
        description: 'image paths or globs',
        required: false,
        default: './',
      },
      replace: {
        type: 'boolean',
        description: 'replace source files',
        default: true,
      },
      output: {
        type: 'string',
        description: 'output directory',
        alias: 'o',
      },
      strategy: {
        type: 'string',
        description: 'compression strategy',
        default: 'AUTO',
      },
      cache: {
        type: 'boolean',
        description: 'enable cache',
        default: true,
      },
      key: {
        type: 'string',
        description: 'api keys separated by comma',
        alias: 'k',
      },
      parallel: {
        type: 'string',
        description: 'parallel limit',
        alias: 'p',
        default: '3',
      },
      convert: {
        type: 'boolean',
        description: 'enable PNG to JPG conversion',
        default: false,
      },
      followSymlinks: {
        type: 'boolean',
        description: 'follow symbolic links',
        default: false,
      },
    },
    async run({ args }) {
      const subCommands = ['convert', 'keys', 'list', 'ls']
      if (args._.length && subCommands.includes(args._[0] as string)) {
        return
      }

      const inputs = args._.length ? args._.map(String) : [args.paths as string]

      initKeyManager({
        projectKeys: (args.key as string | undefined)?.split(','),
        useUserKeys: true,
      })

      const files = await matchFiles({
        paths: inputs,
        ignores: ['node_modules/**'],
        followSymlinks: args.followSymlinks as boolean,
      })

      if (files.length === 0) {
        console.log(kleur.yellow('No files found'))
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
            if (await isProcessed(buf)) {
              console.log(kleur.cyan('○'), file.path, 'already processed')
              cached++
              return
            }

            const result = await compressFile({
              filePath: file.path,
              strategy: args.strategy as 'AUTO' | 'API_ONLY' | 'RANDOM' | 'API_FIRST',
              maxFileSize: 5 * 1024 * 1024,
              convertPngToJpg: args.convert as boolean,
            })

            if (result.error) {
              console.log(kleur.red('✗'), file.path, kleur.red().bold('failed:'), result.error.message)
              failed++
              return
            }

            const ext = path.extname(file.path).slice(1).toLowerCase()
            const processedBuf = await markProcessed(result.buffer, ext as 'png' | 'jpg' | 'jpeg' | 'webp')

            const outputDir = args.output as string | undefined
            const outputPath = outputDir
              ? path.join(outputDir, path.relative(process.cwd(), file.path))
              : file.path

            if (outputDir) {
              await fs.mkdir(path.dirname(outputPath), { recursive: true })
            }

            await fs.writeFile(outputPath, processedBuf)

            if (result.cached) {
              console.log(kleur.cyan('○'), file.path, formatSize(result.originalSize), '→', formatSize(result.compressedSize))
              cached++
            }
            else {
              console.log(kleur.green('✓'), file.path, formatSize(result.originalSize), '→', formatSize(result.compressedSize), `(${result.compressor})`)
              success++
              saved += result.originalSize - result.compressedSize
            }
          }),
        ),
      )

      console.log(`[tinyimg] Compression complete  Total: ${files.length}  Success: ${success}  Cached: ${cached}  Failed: ${failed}  Saved: ${formatSize(saved)}`)
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
