#!/usr/bin/env node
import cac from 'cac'
import kleur from 'kleur'
import type { CompressServiceOptions } from 'tinyimg-core'

const cli = cac('tinyimg')

// Main compression command
cli
  .command('[...inputs]', 'Compress images')
  .option('-o, --output <dir>', 'Output directory')
  .option('-k, --key <key>', 'API key (overrides env vars)')
  .option('-m, --mode <mode>', 'Key selection strategy', {
    default: 'random',
  })
  .option('-p, --parallel <number>', 'Concurrency limit', {
    default: '8',
  })
  .option('-c, --cache', 'Enable caching', { default: true })
  .option('--no-cache', 'Disable caching')
  .option('-h, --help', 'Display help')
  .action(async (inputs: string[], options: any) => {
    // Handler will be implemented in Plan 05-03
    console.log('Compression handler - to be implemented')
    console.log('Inputs:', inputs)
    console.log('Options:', options)
  })

// Key management subcommands (stub - implemented in Plan 05-04)
cli
  .command('key add <key>', 'Add API key')
  .action(() => console.log('key add - to be implemented'))

cli
  .command('key remove [key]', 'Remove API key')
  .action(() => console.log('key remove - to be implemented'))

cli
  .command('key', 'List API keys')
  .action(() => console.log('key list - to be implemented'))

cli.help()
cli.parse()

export async function main() {
  // CLI logic is already executed via cli.parse() at module level
  // This export is for testing/programmatic use
}
