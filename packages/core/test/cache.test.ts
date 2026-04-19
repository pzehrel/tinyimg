import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearCache, getCacheDir, getUserCacheDir, listCacheEntries, readCache, writeCache } from '../src/cache'

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

  it('getCacheDir returns project cache path', () => {
    expect(getCacheDir('/project')).toBe('/project/node_modules/.tinyimg')
  })

  it('getUserCacheDir returns user cache path in homedir', () => {
    expect(getUserCacheDir()).toBe(path.join(os.homedir(), '.tinyimg'))
  })

  it('listCacheEntries returns empty array when cache dir does not exist', async () => {
    const result = await listCacheEntries(path.join(tmpDir, 'nonexistent'))
    expect(result).toEqual([])
  })

  it('listCacheEntries lists files with md5, ext, and size', async () => {
    await writeCache('abc123def456', 'png', Buffer.from('compressed-png'), tmpDir)
    await writeCache('xyz789uvw012', 'jpg', Buffer.from('compressed-jpg'), tmpDir)
    const result = await listCacheEntries(tmpDir)
    expect(result).toHaveLength(2)
    expect(result.some(e => e.md5 === 'abc123def456' && e.ext === 'png' && e.size === 14)).toBe(true)
    expect(result.some(e => e.md5 === 'xyz789uvw012' && e.ext === 'jpg' && e.size === 14)).toBe(true)
  })

  it('clearCache returns deleted 0 when cache dir does not exist', async () => {
    const result = await clearCache(path.join(tmpDir, 'nonexistent'))
    expect(result.deleted).toBe(0)
  })

  it('clearCache deletes all files in cache dir', async () => {
    await writeCache('abc123', 'png', Buffer.from('data'), tmpDir)
    const result = await clearCache(tmpDir)
    expect(result.deleted).toBe(1)
    const entries = await fs.readdir(tmpDir)
    expect(entries).toHaveLength(0)
  })
})
