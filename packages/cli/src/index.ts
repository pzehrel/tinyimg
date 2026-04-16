#!/usr/bin/env node
import { Command } from 'commander'
import dotenv from 'dotenv'
import { registerCompress } from './commands/compress'
import { registerConvert } from './commands/convert'
import { registerKeys } from './commands/keys'
import { registerList } from './commands/list'

dotenv.config({ path: '.env.local' })

const program = new Command()
program.name('tinyimg').description('TinyPNG image compression tool').version('0.0.0')

registerCompress(program)
registerKeys(program)
registerList(program)
registerConvert(program)

program.parse()
