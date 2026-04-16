import type { Command } from 'commander'
import fs from 'node:fs/promises'
import path from 'node:path'
import { canConvertToJpg, convertPngToJpg, matchFiles } from '@pzehrel/tinyimg-core'
import kleur from 'kleur'

export function registerConvert(program: Command) {
  program
    .command('convert')
    .argument('[paths...]', 'PNG paths')
    .option('--replace', 'replace source files', true)
    .option('--no-replace', 'keep original files')
    .action(async (inputs: string[], options) => {
      const files = await matchFiles({
        paths: inputs.length ? inputs : ['./'],
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

        if (options.replace) {
          await fs.unlink(f.path)
        }

        console.log(kleur.green('✓'), f.path, '→', path.basename(newPath))
      }
    })
}
