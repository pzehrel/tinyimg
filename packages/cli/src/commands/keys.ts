import type { CommandDef } from 'citty'
import { addUserKeys, listUserKeys, removeUserKey } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'

const listCommand: CommandDef = {
  meta: {
    name: 'list',
    description: 'List saved keys',
  },
  async run() {
    const keys = await listUserKeys()
    if (keys.length === 0) {
      console.log(kleur.yellow('No keys saved'))
      return
    }
    console.table(keys)
  },
}

const addCommand: CommandDef = {
  meta: {
    name: 'add',
    description: 'Add and verify API keys',
  },
  args: {
    keys: {
      type: 'positional',
      description: 'API keys',
      required: true,
    },
  },
  async run({ args }) {
    const rawKeys = args._.length ? args._.map(String) : [args.keys as string]
    const results = await addUserKeys(rawKeys)
    for (const r of results) {
      if (r.valid) {
        console.log(kleur.green('✓'), r.key, r.remaining !== undefined ? `(${r.remaining} remaining)` : '')
      }
      else {
        console.log(kleur.red('✗'), r.key, r.error || '')
      }
    }
  },
}

const delCommand: CommandDef = {
  meta: {
    name: 'del',
    description: 'Delete a saved key',
  },
  args: {
    maskedKey: {
      type: 'positional',
      description: 'Masked key to delete',
      required: true,
    },
  },
  async run({ args }) {
    await removeUserKey(args.maskedKey as string)
    console.log(kleur.green('✓'), 'Key removed')
  },
}

const keysCommand: CommandDef = {
  meta: {
    name: 'keys',
    description: 'Manage API keys',
  },
  subCommands: {
    list: listCommand,
    add: addCommand,
    del: delCommand,
  },
}

export default keysCommand
