import type { CommandDef } from 'citty'
import { addUserKeys, listUserKeys, removeUserKey } from '@pzehrel/tinyimg-core'
import { createLocaleI18n } from '@pzehrel/tinyimg-locale'
import kleur from 'kleur'

const t = createLocaleI18n()

const addCommand: CommandDef = {
  meta: {
    name: 'add',
    description: t('cli.command.keys.add.description'),
  },
  args: {
    keys: {
      type: 'positional',
      description: t('cli.arg.keys.description'),
      required: true,
    },
  },
  async run({ args }) {
    const rawKeys = args._.length ? args._.map(String) : [args.keys as string]
    const results = await addUserKeys(rawKeys)
    for (const r of results) {
      if (r.valid) {
        console.log(kleur.green(t('status.success')), r.key, r.remaining !== undefined ? `(${r.remaining} remaining)` : '')
      }
      else {
        console.log(kleur.red(t('status.failed')), r.key, r.error || '')
      }
    }
  },
}

const delCommand: CommandDef = {
  meta: {
    name: 'del',
    description: t('cli.command.keys.del.description'),
  },
  args: {
    maskedKey: {
      type: 'positional',
      description: t('cli.arg.maskedKey.description'),
      required: true,
    },
  },
  async run({ args }) {
    await removeUserKey(args.maskedKey as string)
    console.log(kleur.green(t('status.success')), t('cli.output.keyRemoved'))
  },
}

const keysCommand: CommandDef = {
  meta: {
    name: 'keys',
    description: t('cli.command.keys.description'),
  },
  async run() {
    const keys = await listUserKeys()
    if (keys.length === 0) {
      console.log(kleur.yellow(t('cli.output.noKeys')))
      return
    }
    console.table(keys)
  },
  subCommands: {
    add: addCommand,
    del: delCommand,
  },
}

export default keysCommand
