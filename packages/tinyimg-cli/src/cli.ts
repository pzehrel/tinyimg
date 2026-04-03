#!/usr/bin/env node
import process from 'node:process'
import cac from 'cac'
import { compressCommand } from './commands/compress'
import { convertCommand } from './commands/convert'
import { keyAdd, keyList, keyRemove } from './commands/key'
import { listCommand } from './commands/list'
import { logger } from './utils/logger'

const cli = cac('tinyimg')

// 全局选项：必须在所有 cli.command() 之前定义
cli.option('--verbose', 'Enable verbose output')
cli.option('--quiet', 'Suppress non-error output')

/**
 * 设置 Logger 级别并检查选项互斥
 */
function setupLogger(options: { verbose?: boolean, quiet?: boolean }): void {
  if (options.verbose && options.quiet) {
    console.error('Error: --verbose and --quiet are mutually exclusive')
    process.exit(1)
  }
  if (options.verbose) {
    logger.setLevel('verbose')
  }
  else if (options.quiet) {
    logger.setLevel('quiet')
  }
}

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
      setupLogger(options)
      await compressCommand(inputs, options)
    }
    catch (error: any) {
      logger.error(error.message)
      process.exit(1)
    }
  })

// Key management - unified command with subcommand handling
cli
  .command('key [...subcommands]', 'Key management: add, remove, list')
  .action(async (_subcommands: string[], _options: any) => {
    try {
      // Get the raw arguments to determine subcommand
      const rawArgs = cli.rawArgs.slice(2) // Skip node and script path
      const subcommand = rawArgs[1] // rawArgs[0] is 'key', rawArgs[1] is 'add'/'remove'/'list'

      if (subcommand === 'add') {
        const key = rawArgs[2]
        if (!key) {
          logger.error('API key is required')
          logger.verbose('Usage: tinyimg key add <key>')
          process.exit(1)
        }
        await keyAdd(key)
      }
      else if (subcommand === 'remove') {
        const key = rawArgs[2]
        await keyRemove(key)
      }
      else if (subcommand === 'list' || !subcommand) {
        await keyList()
      }
      else {
        logger.error(`Unknown key subcommand "${subcommand}"`)
        logger.verbose('Usage: tinyimg key <add|remove|list>')
        process.exit(1)
      }
    }
    catch (error: any) {
      logger.error(error.message)
      process.exit(1)
    }
  })

// List compressible images
cli
  .command('list [...inputs]', 'List compressible images')
  .option('-t, --convertible', 'Show only PNG files convertible to JPG (no alpha channel)')
  .action(async (inputs: string[], options: any) => {
    try {
      setupLogger(options)
      await listCommand(inputs, options)
    }
    catch (error: any) {
      logger.error(error.message)
      process.exit(1)
    }
  })

cli
  .command('ls [...inputs]', 'Alias for list command')
  .option('-t, --convertible', 'Show only PNG files convertible to JPG (no alpha channel)')
  .action(async (inputs: string[], options: any) => {
    try {
      setupLogger(options)
      await listCommand(inputs, options)
    }
    catch (error: any) {
      logger.error(error.message)
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
      setupLogger(options)
      await convertCommand(inputs, { deleteOriginal: options.deleteOriginal, quality: Number(options.quality) })
    }
    catch (error: any) {
      logger.error(error.message)
      process.exit(1)
    }
  })

cli.help()
cli.parse()

export async function main() {
  // CLI logic is already executed via cli.parse() at module level
  // This export is for testing/programmatic use
}
