#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import dotenv from 'dotenv'
import { registerCompress } from './commands/compress'

dotenv.config({ path: '.env.local' })

const main = defineCommand({
  meta: {
    name: 'tinyimg',
    description: 'TinyPNG image compression tool',
    version: '0.0.0',
  },
  ...registerCompress(),
  subCommands: {
    convert: () => import('./commands/convert').then(m => m.default),
    keys: () => import('./commands/keys').then(m => m.default),
    list: () => import('./commands/list').then(m => m.default),
  },
})

runMain(main)
