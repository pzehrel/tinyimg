import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import { canConvertToJpg, convertPngToJpg, matchFiles } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'

const convertCommand: CommandDef = {
  meta: {
    name: 'convert',
    description: 'Convert PNG to JPG',
  },
  args: {
    paths: {
      type: 'positional',
      description: 'PNG paths',
      required: false,
      default: './',
    },
    replace: {
      type: 'boolean',
      description: 'replace source files',
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
        console.log(kleur.gray('○'), f.path, 'skipped (has alpha)')
        continue
      }

      const buf = await convertPngToJpg(f.path)
      const newPath = f.path.replace(/\.png$/i, '.jpg')
      await fs.writeFile(newPath, buf)

      if (args.replace) {
        await fs.unlink(f.path)
      }

      console.log(kleur.green('✓'), f.path, '→', path.basename(newPath))
    }
  },
}

export default convertCommand
