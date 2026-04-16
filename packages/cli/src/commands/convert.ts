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
      required: false,
      default: './',
    },
    replace: {
      type: 'boolean',
      description: t('cli.arg.replace.description'),
      default: true,
    },
  },
  async run({ args }) {
    const inputs = args._.length ? args._.map(String) : [args.paths as string]

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
      const newPath = f.path.replace(/\.png$/i, '.jpg')
      await fs.writeFile(newPath, buf)

      if (args.replace) {
        await fs.unlink(f.path)
      }

      console.log(kleur.green(t('status.success')), f.path, '→', path.basename(newPath))
    }
  },
}

export default convertCommand
