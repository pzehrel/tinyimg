import type { Command } from 'commander'
import { addUserKeys, listUserKeys, removeUserKey } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'

export function registerKeys(program: Command) {
  const keysCmd = program.command('keys').description('Manage API keys')

  keysCmd
    .command('list')
    .alias('ls')
    .description('List saved keys')
    .action(async () => {
      const keys = await listUserKeys()
      if (keys.length === 0) {
        console.log(kleur.yellow('No keys saved'))
        return
      }
      console.table(keys)
    })

  keysCmd
    .command('add')
    .description('Add and verify API keys')
    .argument('<keys...>', 'API keys')
    .action(async (keys: string[]) => {
      const results = await addUserKeys(keys)
      for (const r of results) {
        if (r.valid) {
          console.log(kleur.green('✓'), r.key, r.remaining !== undefined ? `(${r.remaining} remaining)` : '')
        }
        else {
          console.log(kleur.red('✗'), r.key, r.error || '')
        }
      }
    })

  keysCmd
    .command('del')
    .description('Delete a saved key')
    .argument('<maskedKey>', 'Masked key to delete')
    .action(async (maskedKey: string) => {
      await removeUserKey(maskedKey)
      console.log(kleur.green('✓'), 'Key removed')
    })
}
