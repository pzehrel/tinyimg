import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import { canConvertToJpg, convertPngToJpg, matchFiles } from '@pzehrel/tinyimg-core'
import { createLocaleI18n } from '@pzehrel/tinyimg-locale'
import kleur from 'kleur'

const t = createLocaleI18n()

const convertCommand: CommandDef = {
  meta: {
    name: 'convert',
    description: t('cli.command.convert.description'),
  },
  args: {
    paths: {
      type: 'positional',
      description: t('cli.arg.paths.description'),
      required: true,
    },
    noRename: {
      type: 'boolean',
      description: t('cli.arg.noRename.description'),
      default: false,
    },
  },
  async run({ args, cmd }) {
    const inputs = args._.length ? args._.map(String) : (args.paths ? [args.paths as string] : [])
    if (inputs.length === 0) {
      const { renderUsage } = await import('citty')
      console.log(await renderUsage(cmd))
      return
    }

    const files = await matchFiles({
      paths: inputs,
      ignores: ['node_modules/**'],
    })

    const pngs = files.filter(f => f.path.toLowerCase().endsWith('.png'))

    for (const f of pngs) {
      if (!(await canConvertToJpg(f.path))) {
        console.log(kleur.gray(t('status.cached')), f.path, t('cli.output.skippedAlpha'))
        continue
      }

      const buf = await convertPngToJpg(f.path)

      if (args.noRename) {
        await fs.writeFile(f.path, buf)
        console.log(kleur.green(t('status.success')), f.path)
      }
      else {
        const newPath = f.path.replace(/\.png$/i, '.jpg')
        await fs.writeFile(newPath, buf)
        await fs.unlink(f.path)
        console.log(kleur.green(t('status.success')), f.path, '→', path.basename(newPath))
      }
    }
  },
}

export default convertCommand
