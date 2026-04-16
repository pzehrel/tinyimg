import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readCache, writeCache } from '../src/cache'

describe('cache', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyimg-cache-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should return null when cache miss', async () => {
    const result = await readCache('abc123', 'png', tmpDir)
    expect(result).toBeNull()
  })

  it('should write and read cache', async () => {
    const buf = Buffer.from('compressed')
    await writeCache('abc123', 'png', buf, tmpDir)
    const result = await readCache('abc123', 'png', tmpDir)
    expect(result).toEqual(buf)
  })
})
