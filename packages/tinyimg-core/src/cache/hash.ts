import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Buffer } from 'node:buffer'

/**
 * Calculate MD5 hash of a file's content.
 *
 * @param filePath - Absolute path to the file
 * @returns MD5 hash as a 32-character hexadecimal string
 *
 * @example
 * ```ts
 * const hash = await calculateMD5('/path/to/image.png')
 * console.log(hash) // 'a1b2c3d4e5f6...'
 * ```
 */
export async function calculateMD5(filePath: string): Promise<string> {
  const content = await readFile(filePath)
  const hash = createHash('md5')
  hash.update(content)
  return hash.digest('hex')
}

/**
 * Calculate MD5 hash of a buffer's content.
 *
 * @param buffer - Buffer to hash
 * @returns MD5 hash as a 32-character hexadecimal string
 *
 * @example
 * ```ts
 * const hash = await calculateMD5FromBuffer(buffer)
 * console.log(hash) // 'a1b2c3d4e5f6...'
 * ```
 */
export async function calculateMD5FromBuffer(buffer: Buffer): Promise<string> {
  const hash = createHash('md5')
  hash.update(buffer)
  return hash.digest('hex')
}
