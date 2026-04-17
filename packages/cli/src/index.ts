#!/usr/bin/env node
import path from 'node:path'
import process from 'node:process'
import { createLocaleI18n } from '@pz4l/tinyimg-locale'
import { defineCommand, runMain } from 'citty'
import dotenv from 'dotenv'
import { version } from '../package.json'
import { registerCompress } from './commands/compress'

const cwd = process.cwd()
dotenv.config({ path: path.resolve(cwd, '.env') })
dotenv.config({ path: path.resolve(cwd, '.env.local') })

const t = createLocaleI18n()

const main = defineCommand({
  meta: {
    name: 'tinyimg',
    description: t('cli.meta.description'),
    version,
  },
  ...registerCompress(t),
  subCommands: {
    convert: () => import('./commands/convert').then(m => m.default),
    keys: () => import('./commands/keys').then(m => m.default),
    list: () => import('./commands/list').then(m => m.default),
    ls: () => import('./commands/list').then(m => m.default),
  },
})

const rawArgs = process.argv.slice(2)
const subCommands = ['convert', 'keys', 'list', 'ls']
const firstNonFlagIndex = rawArgs.findIndex(arg => !arg.startsWith('-'))
let cliRawArgs = rawArgs
if (
  firstNonFlagIndex !== -1
  && !subCommands.includes(rawArgs[firstNonFlagIndex])
) {
  cliRawArgs = [
    ...rawArgs.slice(0, firstNonFlagIndex),
    '--',
    ...rawArgs.slice(firstNonFlagIndex),
  ]
}

runMain(main, { rawArgs: cliRawArgs })
