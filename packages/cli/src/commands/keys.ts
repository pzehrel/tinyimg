import type { CommandDef } from 'citty'
import process from 'node:process'
import { addUserKeys, initKeyManager, listProjectKeys, listUserKeys, removeUserKey, resolveProjectKeysFromEnv } from '@pzehrel/tinyimg-core'
import { createLocaleI18n } from '@pzehrel/tinyimg-locale'
import kleur from 'kleur'

const t = createLocaleI18n()

export interface KeysConsole {
  log: (...args: any[]) => void
}

export async function runKeysAdd(args: { keys: string | undefined, _: string[] }, console_: KeysConsole) {
  const rawKeys = args._.length ? args._.map(String) : [args.keys as string]
  const results = await addUserKeys(rawKeys)
  for (const r of results) {
    if (r.valid) {
      console_.log(kleur.green(t('status.success')), r.key, r.remaining !== undefined ? `(${r.remaining} remaining)` : '')
    }
    else {
      console_.log(kleur.red(t('status.failed')), r.key, r.error || '')
    }
  }
}

export async function runKeysDel(args: { maskedKey: string }, console_: KeysConsole) {
  await removeUserKey(args.maskedKey)
  console_.log(kleur.green(t('status.success')), t('cli.output.keyRemoved'))
}

export async function runKeysList(console_: KeysConsole) {
  initKeyManager({ projectKeys: resolveProjectKeysFromEnv(process.env) })
  const projectKeys = listProjectKeys()
  const userKeys = await listUserKeys()

  if (projectKeys.length === 0 && userKeys.length === 0) {
    console_.log(kleur.yellow(t('cli.output.noKeys')))
    return
  }

  if (projectKeys.length > 0) {
    console_.log(kleur.cyan(`${t('cli.output.project')}:`))
    projectKeys.forEach((k, i) => {
      console_.log(`  ${i + 1}. ${k.key} (${t('cli.output.usedThisMonth')}: ${k.used})`)
    })
  }

  if (userKeys.length > 0) {
    console_.log(kleur.cyan(`${t('cli.output.user')}:`))
    userKeys.forEach((k, i) => {
      console_.log(`  ${i + 1}. ${k.key} (${t('cli.output.usedThisMonth')}: ${k.used})`)
    })
  }
}

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
    await runKeysAdd({ keys: args.keys as string, _: args._.map(String) }, console)
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
    await runKeysDel({ maskedKey: args.maskedKey as string }, console)
  },
}

const keysCommand: CommandDef = {
  meta: {
    name: 'keys',
    description: t('cli.command.keys.description'),
  },
  async run() {
    await runKeysList(console)
  },
  subCommands: {
    add: addCommand,
    del: delCommand,
  },
}

export default keysCommand
