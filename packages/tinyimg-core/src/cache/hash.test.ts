import { Buffer } from 'node:buffer'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateMD5 } from './hash'

describe('calculateMD5', () => {
  it('should return correct MD5 hash for given file content', async () => {
    const testDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)
    await mkdir(testDir, { recursive: true })

    try {
      const content = Buffer.from('test content')
      const filePath = join(testDir, 'test.png')
      await writeFile(filePath, content)

      const hash = await calculateMD5(filePath)
      expect(hash).toBe('9473fdd0d880a43c21b7778d34872157') // Pre-calculated MD5
    }
    finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('should produce same MD5 for same content with different filenames', async () => {
    const testDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)
    await mkdir(testDir, { recursive: true })

    try {
      const content = Buffer.from('same content')
      const file1 = join(testDir, 'file1.png')
      const file2 = join(testDir, 'file2.jpg')

      await writeFile(file1, content)
      await writeFile(file2, content)

      const hash1 = await calculateMD5(file1)
      const hash2 = await calculateMD5(file2)

      expect(hash1).toBe(hash2)
    }
    finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('should produce different MD5 for different content', async () => {
    const testDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)
    await mkdir(testDir, { recursive: true })

    try {
      const file1 = join(testDir, 'file1.png')
      const file2 = join(testDir, 'file2.png')

      await writeFile(file1, Buffer.from('content 1'))
      await writeFile(file2, Buffer.from('content 2'))

      const hash1 = await calculateMD5(file1)
      const hash2 = await calculateMD5(file2)

      expect(hash1).not.toBe(hash2)
    }
    finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('should handle empty file and return valid MD5 hash', async () => {
    const testDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)
    await mkdir(testDir, { recursive: true })

    try {
      const filePath = join(testDir, 'empty.png')
      await writeFile(filePath, Buffer.from(''))

      const hash = await calculateMD5(filePath)
      expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e')
    }
    finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('should handle binary content correctly', async () => {
    const testDir = join(tmpdir(), `tinyimg-test-${Date.now()}-${Math.random()}`)
    await mkdir(testDir, { recursive: true })

    try {
      // PNG magic bytes + some binary data
      const binaryContent = Buffer.from([
        0x89,
        0x50,
        0x4E,
        0x47,
        0x0D,
        0x0A,
        0x1A,
        0x0A, // PNG signature
        0x00,
        0x01,
        0x02,
        0x03,
        0x04,
        0x05,
        0x06,
        0x07, // Binary data
      ])
      const filePath = join(testDir, 'binary.png')
      await writeFile(filePath, binaryContent)

      const hash = await calculateMD5(filePath)
      expect(hash).toMatch(/^[a-f0-9]{32}$/) // Valid MD5 format
    }
    finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })
})
