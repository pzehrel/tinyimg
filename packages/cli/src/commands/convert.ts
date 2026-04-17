import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import path from 'node:path'
import { canConvertToJpg, convertPngToJpg, matchFiles } from '@pzehrel/tinyimg-core'
import { createLocaleI18n } from '@pzehrel/tinyimg-locale'
import kleur from 'kleur'

const t = createLocaleI18n()

export interface ConvertDeps {
  matchFiles: typeof matchFiles
  canConvertToJpg: typeof canConvertToJpg
  convertPngToJpg: typeof convertPngToJpg
  writeFile: typeof fs.writeFile
  unlink: typeof fs.unlink
  log: (...args: any[]) => void
}

export async function runConvert(args: { paths: string | undefined, _: string[], noRename: boolean }, deps: ConvertDeps) {
  const inputs = args._.length ? args._.map(String) : (args.paths ? [args.paths as string] : [])
  if (inputs.length === 0) {
    deps.log(kleur.yellow(t('cli.output.noFiles')))
    return
  }

  const files = await deps.matchFiles({
    paths: inputs,
    ignores: ['node_modules/**'],
  })

  const pngs = files.filter(f => f.path.toLowerCase().endsWith('.png'))

  for (const f of pngs) {
    if (!(await deps.canConvertToJpg(f.path))) {
      deps.log(kleur.gray(t('status.cached')), f.path, t('cli.output.skippedAlpha'))
      continue
    }

    const buf = await deps.convertPngToJpg(f.path)

    if (args.noRename) {
      await deps.writeFile(f.path, buf)
      deps.log(kleur.green(t('status.success')), f.path)
    }
    else {
      const newPath = f.path.replace(/\.png$/i, '.jpg')
      await deps.writeFile(newPath, buf)
      await deps.unlink(f.path)
      deps.log(kleur.green(t('status.success')), f.path, '→', path.basename(newPath))
    }
  }
}

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
    await runConvert(
      { paths: args.paths as string, _: args._.map(String), noRename: args.noRename as boolean },
      {
        matchFiles,
        canConvertToJpg,
        convertPngToJpg,
        writeFile: fs.writeFile,
        unlink: fs.unlink,
        log: console.log,
      },
    )
  },
}

export default convertCommand
