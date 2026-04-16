#!/usr/bin/env node
import { createLocaleI18n } from '@pzehrel/tinyimg-locale'
import { defineCommand, runMain } from 'citty'
import dotenv from 'dotenv'
import { registerCompress } from './commands/compress'

dotenv.config({ path: '.env.local' })

const t = createLocaleI18n()

const main = defineCommand({
  meta: {
    name: 'tinyimg',
    description: t('cli.meta.description'),
    version: '0.0.0',
  },
  ...registerCompress(t),
  subCommands: {
    convert: () => import('./commands/convert').then(m => m.default),
    keys: () => import('./commands/keys').then(m => m.default),
    list: () => import('./commands/list').then(m => m.default),
    ls: () => import('./commands/list').then(m => m.default),
  },
})

runMain(main)
