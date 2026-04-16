import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { canConvertToJpg } from './convert'

export interface MatchOptions {
  paths: string[]
  ignores?: string[]
  cwd?: string
  followSymlinks?: boolean
  checkConvertible?: boolean
  includeMd5?: boolean
}

export interface MatchedFile {
  path: string
  size: number
  convertible?: boolean
  md5?: string
}

export async function matchFiles(options: MatchOptions): Promise<MatchedFile[]> {
  const cwd = options.cwd || process.cwd()
  const entries = await fg(options.paths, {
    cwd,
    ignore: options.ignores,
    onlyFiles: true,
    followSymbolicLinks: options.followSymlinks ?? false,
    absolute: true,
  })

  const results: MatchedFile[] = []
  for (const filePath of entries) {
    const stat = await fs.stat(filePath)
    if (!stat.isFile())
      continue

    const ext = path.extname(filePath).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext))
      continue

    const item: MatchedFile = {
      path: filePath,
      size: stat.size,
    }

    if (options.checkConvertible && ext === '.png') {
      item.convertible = await canConvertToJpg(filePath)
    }

    if (options.includeMd5) {
      const buf = await fs.readFile(filePath)
      item.md5 = crypto.createHash('md5').update(buf).digest('hex')
    }

    results.push(item)
  }

  return results
}
