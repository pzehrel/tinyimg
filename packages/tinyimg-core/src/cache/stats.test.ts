import { Buffer } from 'node:buffer'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getProjectCachePath } from './paths'
import { formatBytes, getAllCacheStats, getCacheStats } from './stats'

describe('cache statistics', () => {
  describe('getCacheStats', () => {
    it('should return count and size for existing cache directory', async () => {
      const tempDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)

      try {
        await mkdir(tempDir, { recursive: true })

        // Create test files with known sizes
        const file1 = join(tempDir, 'file1')
        const file2 = join(tempDir, 'file2')

        await writeFile(file1, Buffer.alloc(1024)) // 1 KB
        await writeFile(file2, Buffer.alloc(2048)) // 2 KB

        const stats = await getCacheStats(tempDir)

        expect(stats.count).toBe(2)
        expect(stats.size).toBe(3072) // 1024 + 2048
      }
      finally {
        await rm(tempDir, { recursive: true, force: true })
      }
    })

    it('should return { count: 0, size: 0 } for non-existent directory', async () => {
      const nonExistentDir = join(tmpdir(), 'does-not-exist')
      const stats = await getCacheStats(nonExistentDir)

      expect(stats.count).toBe(0)
      expect(stats.size).toBe(0)
    })

    it('should handle empty cache directory', async () => {
      const tempDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)

      try {
        await mkdir(tempDir, { recursive: true })

        const stats = await getCacheStats(tempDir)

        expect(stats.count).toBe(0)
        expect(stats.size).toBe(0)
      }
      finally {
        await rm(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('should format bytes in B range (< 1024)', () => {
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(1023)).toBe('1023 B')
    })

    it('should format bytes in KB range (< 1024^2)', () => {
      expect(formatBytes(1024)).toBe('1.00 KB')
      expect(formatBytes(1536)).toBe('1.50 KB')
      expect(formatBytes(1024 * 100)).toBe('100.00 KB')
    })

    it('should format bytes in MB range (< 1024^3)', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
      expect(formatBytes(1024 * 1024 * 5)).toBe('5.00 MB')
    })

    it('should format bytes in GB range (>= 1024^3)', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB')
      expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2.00 GB')
    })
  })

  describe('getAllCacheStats', () => {
    it('should return both project and global stats', async () => {
      const tempDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)

      try {
        // Create test files in project cache
        const projectCachePath = getProjectCachePath(tempDir)
        await mkdir(projectCachePath, { recursive: true })

        const file1 = join(projectCachePath, 'file1')
        await writeFile(file1, Buffer.alloc(1024))

        const stats = await getAllCacheStats(tempDir)

        expect(stats.project).toBeDefined()
        expect(stats.project?.count).toBe(1)
        expect(stats.project?.size).toBe(1024)

        expect(stats.global).toBeDefined()
        expect(stats.global.count).toBe(0)
        expect(stats.global.size).toBe(0)
      }
      finally {
        await rm(tempDir, { recursive: true, force: true })
      }
    })

    it('should return null project stats when no projectRoot provided', async () => {
      const stats = await getAllCacheStats()

      expect(stats.project).toBeNull()
      expect(stats.global).toBeDefined()
    })
  })
})
