#!/usr/bin/env node
import process from 'node:process'
import cac from 'cac'
import kleur from 'kleur'
import { compressCommand } from './commands/compress'
import { convertCommand } from './commands/convert'
import { keyAdd, keyList, keyRemove } from './commands/key'
import { listCommand } from './commands/list'

const cli = cac('tinyimg')

// Main compression command
cli
  .command('[...inputs]', 'Compress images (PNG, JPG, JPEG, WebP, AVIF)')
  .option('-o, --output <dir>', 'Output directory (default: overwrite in place)')
  .option('-k, --key <key>', 'API key (overrides environment and config)')
  .option('-m, --mode <mode>', 'Key selection strategy (random|round-robin|priority)', {
    default: 'random',
  })
  .option('-p, --parallel <number>', 'Concurrency limit (default: 8)', {
    default: '8',
  })
  .option('-c, --cache', 'Enable caching (default: true)', { default: true })
  .option('--no-cache', 'Disable caching')
  .option('--convert', 'Convert opaque PNGs to JPG after compression')
  .action(async (inputs: string[], options: any) => {
    try {
      await compressCommand(inputs, options)
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  })

// Key management subcommands
cli
  .command('key add <key>', 'Add API key')
  .action(async (key: string) => {
    try {
      await keyAdd(key)
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  })

cli
  .command('key remove [key]', 'Remove API key (interactive if not specified)')
  .action(async (key?: string) => {
    try {
      await keyRemove(key)
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  })

cli
  .command('key', 'List all API keys with quota info')
  .action(async () => {
    try {
      await keyList()
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  })

// List compressible images
cli
  .command('list [...inputs]', 'List compressible images')
  .action(async (inputs: string[], options: any) => {
    try {
      await listCommand(inputs, options)
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  })

cli
  .command('ls [...inputs]', 'Alias for list command')
  .action(async (inputs: string[], options: any) => {
    try {
      await listCommand(inputs, options)
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  })

// Convert PNG to JPG
cli
  .command('convert [...inputs]', 'Convert opaque PNGs to JPG')
  .option('--delete-original', 'Delete original PNG after conversion')
  .option('--quality <number>', 'JPG quality (1-100, default: 85)', { default: '85' })
  .action(async (inputs: string[], options: any) => {
    try {
      await convertCommand(inputs, { deleteOriginal: options.deleteOriginal, quality: Number(options.quality) })
    }
    catch (error: any) {
      console.error(kleur.red(`Error: ${error.message}`))
      process.exit(1)
    }
  })

cli.help()
cli.parse()

export async function main() {
  // CLI logic is already executed via cli.parse() at module level
  // This export is for testing/programmatic use
}
