import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export async function readCache(md5: string, ext: string, cacheDir: string): Promise<Buffer | null> {
  const filePath = path.join(cacheDir, `${md5}.${ext}`)
  try {
    return await fs.readFile(filePath)
  }
  catch {
    return null
  }
}

export async function writeCache(md5: string, ext: string, buffer: Buffer, cacheDir: string): Promise<void> {
  await fs.mkdir(cacheDir, { recursive: true })
  const filePath = path.join(cacheDir, `${md5}.${ext}`)
  await fs.writeFile(filePath, buffer)
}

export function getCacheDir(cwd: string): string {
  return path.join(cwd, 'node_modules', '.tinyimg')
}

export function getUserCacheDir(): string {
  return path.join(os.homedir(), '.tinyimg')
}

export async function listCacheEntries(cacheDir: string): Promise<{ md5: string, ext: string, size: number }[]> {
  try {
    const entries = await fs.readdir(cacheDir)
    const result = await Promise.all(
      entries.map(async (entry) => {
        const lastDot = entry.lastIndexOf('.')
        const md5 = lastDot > 0 ? entry.slice(0, lastDot) : entry
        const ext = lastDot > 0 ? entry.slice(lastDot + 1) : ''
        const stat = await fs.stat(path.join(cacheDir, entry))
        return { md5, ext, size: stat.size }
      }),
    )
    return result.sort((a, b) => b.size - a.size)
  }
  catch {
    return []
  }
}

export async function clearCache(cacheDir: string): Promise<{ deleted: number }> {
  try {
    const entries = await fs.readdir(cacheDir)
    await Promise.all(entries.map(entry => fs.unlink(path.join(cacheDir, entry))))
    return { deleted: entries.length }
  }
  catch {
    return { deleted: 0 }
  }
}
