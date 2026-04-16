import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
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
