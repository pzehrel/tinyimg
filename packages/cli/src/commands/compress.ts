import type { Command } from 'commander'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { compressFile, initKeyManager, isProcessed, markProcessed, matchFiles } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'
import pLimit from 'p-limit'

export function registerCompress(program: Command) {
  program
    .argument('[paths...]', 'image paths or globs')
    .option('--replace', 'replace source files', true)
    .option('--no-replace', 'do not replace source files')
    .option('-o, --output <dir>', 'output directory')
    .option('--strategy <mode>', 'compression strategy', 'AUTO')
    .option('--no-cache', 'disable cache')
    .option('-k, --key <keys>', 'api keys separated by comma')
    .option('-p, --parallel <n>', 'parallel limit', '3')
    .option('--convert', 'enable PNG to JPG conversion')
    .option('--follow-symlinks', 'follow symbolic links')
    .action(async (inputs: string[], options) => {
      initKeyManager({
        projectKeys: options.key?.split(','),
        useUserKeys: true,
      })

      const files = await matchFiles({
        paths: inputs.length ? inputs : ['./'],
        ignores: ['node_modules/**'],
        followSymlinks: options.followSymlinks,
      })

      if (files.length === 0) {
        console.log(kleur.yellow('No files found'))
        return
      }

      const limit = pLimit(Number(options.parallel) || 3)
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
              strategy: options.strategy,
              maxFileSize: 5 * 1024 * 1024,
              convertPngToJpg: options.convert,
            })

            if (result.error) {
              console.log(kleur.red('✗'), file.path, kleur.red().bold('failed:'), result.error.message)
              failed++
              return
            }

            const ext = path.extname(file.path).slice(1).toLowerCase()
            const processedBuf = await markProcessed(result.buffer, ext as 'png' | 'jpg' | 'jpeg' | 'webp')

            const outputPath = options.output
              ? path.join(options.output, path.relative(process.cwd(), file.path))
              : file.path

            if (options.output) {
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
    })
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
