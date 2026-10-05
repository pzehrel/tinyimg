#!/usr/bin/env node
import process from 'node:process'
import { createLocaleI18n } from '@pz4l/tinyimg-locale'
import { defineCommand, runMain } from 'citty'
import dotenv from 'dotenv'
import path from 'pathe'
import { version } from '../package.json'
import { routeCliArgs } from './cli-args'
import { registerCompress } from './commands/compress'

const cwd = process.cwd()
// dotenv preserves shell values; load local overrides before the shared env file.
dotenv.config({ path: path.resolve(cwd, '.env.local') })
dotenv.config({ path: path.resolve(cwd, '.env') })

const t = createLocaleI18n()

const main = defineCommand({
  meta: {
    name: 'tinyimg',
    description: t('cli.meta.description'),
    version,
  },
  subCommands: {
    compress: defineCommand(registerCompress(t)),
    cache: () => import('./commands/cache').then(m => m.default),
    convert: () => import('./commands/convert').then(m => m.default),
    keys: () => import('./commands/keys').then(m => m.default),
    list: () => import('./commands/list').then(m => m.default),
    ls: () => import('./commands/list').then(m => m.default),
  },
})

runMain(main, { rawArgs: routeCliArgs(process.argv.slice(2)) })
