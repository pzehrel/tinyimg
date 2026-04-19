import type { CommandDef } from 'citty'
import fs from 'node:fs/promises'
import process from 'node:process'
import { canConvertToJpg, convertPngToJpg, matchFiles } from '@pz4l/tinyimg-core'
import { createLocaleI18n } from '@pz4l/tinyimg-locale'
import kleur from 'kleur'
import path from 'pathe'

const t = createLocaleI18n()

export interface ConvertDeps {
  matchFiles: typeof matchFiles
  canConvertToJpg: typeof canConvertToJpg
  convertPngToJpg: typeof convertPngToJpg
  writeFile: typeof fs.writeFile
  unlink: typeof fs.unlink
  log: (...args: any[]) => void
}

export async function runConvert(args: { paths: string | undefined, _: string[], rename: boolean, cwd?: string }, deps: ConvertDeps) {
  const inputs = args._.length ? args._.map(String) : (args.paths ? [args.paths as string] : [])
  if (inputs.length === 0) {
    deps.log(kleur.yellow(t('cli.output.noFiles')))
    return
  }

  const cwd = args.cwd || process.cwd()

  const files = await deps.matchFiles({
    paths: inputs,
    ignores: ['node_modules/**'],
    cwd,
  })

  const pngs = files.filter(f => f.path.toLowerCase().endsWith('.png'))

  for (const f of pngs) {
    if (!(await deps.canConvertToJpg(f.path))) {
      continue
    }

    const buf = await deps.convertPngToJpg(f.path)
    const relPath = path.relative(cwd, f.path)

    if (args.rename) {
      const newPath = f.path.replace(/\.png$/i, '.jpg')
      await deps.writeFile(newPath, buf)
      await deps.unlink(f.path)
      const relNewPath = path.relative(cwd, newPath)
      deps.log(kleur.green(t('status.success')), relPath, '→', path.basename(relNewPath))
    }
    else {
      await deps.writeFile(f.path, buf)
      deps.log(kleur.green(t('status.success')), relPath)
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
    rename: {
      type: 'boolean',
      description: t('cli.arg.rename.description'),
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
      { paths: args.paths as string, _: args._.map(String), rename: args.rename as boolean },
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
