import fs from 'node:fs/promises'
import path from 'node:path'
// Mock fast-glob - import after mocking
import fastGlob from 'fast-glob'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { expandInputs, isImageFile, resolveOutputPath } from './files'

// Mock file system
vi.mock('node:fs/promises')

vi.mock('fast-glob')

describe('files utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isImageFile', () => {
    it('returns true for .png files', () => {
      expect(isImageFile('test.png')).toBe(true)
      expect(isImageFile('/path/to/test.png')).toBe(true)
    })

    it('returns true for .jpg files', () => {
      expect(isImageFile('test.jpg')).toBe(true)
      expect(isImageFile('/path/to/test.jpg')).toBe(true)
    })

    it('returns true for .jpeg files (case insensitive)', () => {
      expect(isImageFile('test.jpeg')).toBe(true)
      expect(isImageFile('test.JPEG')).toBe(true)
      expect(isImageFile('test.Jpg')).toBe(true)
    })

    it('returns true for .webp files (case insensitive)', () => {
      expect(isImageFile('test.webp')).toBe(true)
      expect(isImageFile('test.WEBP')).toBe(true)
      expect(isImageFile('test.Webp')).toBe(true)
    })

    it('returns true for .avif files (case insensitive)', () => {
      expect(isImageFile('test.avif')).toBe(true)
      expect(isImageFile('test.AVIF')).toBe(true)
      expect(isImageFile('test.Avif')).toBe(true)
    })

    it('returns false for other extensions', () => {
      expect(isImageFile('test.txt')).toBe(false)
      expect(isImageFile('test.gif')).toBe(false)
      expect(isImageFile('test.pdf')).toBe(false)
    })

    it('returns false for files without extension', () => {
      expect(isImageFile('test')).toBe(false)
      expect(isImageFile('/path/to/test')).toBe(false)
    })
  })

  describe('expandInputs', () => {
    it('returns empty array for empty inputs', async () => {
      const result = await expandInputs([])
      expect(result).toEqual([])
    })

    it('expands single file to absolute path (if image)', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
      vi.mocked(fastGlob.glob).mockResolvedValue([])

      const result = await expandInputs(['test.png'])
      expect(result).toHaveLength(1)
      expect(result[0]).toMatch(/test\.png$/)
    })

    it('ignores single file (if not image)', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
      vi.mocked(fastGlob.glob).mockResolvedValue([])

      const result = await expandInputs(['test.txt'])
      expect(result).toEqual([])
    })

    it('expands directory to all image files recursively', async () => {
      const mockFiles = [
        '/abs/path/image1.png',
        '/abs/path/image2.jpg',
        '/abs/path/subdir/image3.jpeg',
        '/abs/path/readme.txt',
      ]
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false, isDirectory: () => true } as any)
      vi.mocked(fastGlob.glob).mockResolvedValue(mockFiles)

      const result = await expandInputs(['testdir'])
      expect(result).toEqual([
        '/abs/path/image1.png',
        '/abs/path/image2.jpg',
        '/abs/path/subdir/image3.jpeg',
      ])
    })

    it('handles glob patterns', async () => {
      const mockFiles = [
        '/abs/path/image1.png',
        '/abs/path/image2.jpg',
      ]
      vi.mocked(fs.stat).mockRejectedValue(new Error('not found'))
      vi.mocked(fastGlob.glob).mockResolvedValue(mockFiles)

      const result = await expandInputs(['*.png'])
      // isImageFile filters all supported formats, not just the glob pattern
      expect(result).toEqual(['/abs/path/image1.png', '/abs/path/image2.jpg'])
    })

    it('deduplicates results', async () => {
      const mockFiles = [
        '/abs/path/image.png',
        '/abs/path/image.png',
        '/abs/path/other.png',
      ]
      vi.mocked(fs.stat).mockRejectedValue(new Error('not found'))
      vi.mocked(fastGlob.glob).mockResolvedValue(mockFiles)

      const result = await expandInputs(['*.png'])
      expect(result).toEqual([
        '/abs/path/image.png',
        '/abs/path/other.png',
      ])
    })

    it('handles non-existent paths gracefully', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('not found'))
      vi.mocked(fastGlob.glob).mockRejectedValue(new Error('invalid pattern'))

      const result = await expandInputs(['nonexistent'])
      expect(result).toEqual([])
    })

    it('handles multiple inputs of different types', async () => {
      // Mock file
      vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => true, isDirectory: () => false } as any)

      // Mock directory
      const dirFiles = ['/abs/path/dir/image1.png', '/abs/path/dir/image2.jpg']
      vi.mocked(fs.stat).mockResolvedValueOnce({ isFile: () => false, isDirectory: () => true } as any)
      vi.mocked(fastGlob.glob).mockResolvedValueOnce(dirFiles)

      // Mock glob
      const globFiles = ['/abs/path/glob/image3.png']
      vi.mocked(fastGlob.glob).mockResolvedValueOnce(globFiles)

      const result = await expandInputs(['file.png', 'dir', '*.png'])

      expect(result).toHaveLength(4)
      expect(result).toContainEqual(expect.stringMatching(/file\.png$/))
      expect(result).toContain('/abs/path/dir/image1.png')
      expect(result).toContain('/abs/path/dir/image2.jpg')
      expect(result).toContain('/abs/path/glob/image3.png')
    })
  })

  describe('resolveOutputPath', () => {
    it('returns input path when no outputDir provided', async () => {
      const result = await resolveOutputPath('/path/to/image.png')
      expect(result).toBe('/path/to/image.png')
    })

    it('returns outputDir + basename when outputDir provided', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)

      const result = await resolveOutputPath('/path/to/image.png', '/output/dir')
      expect(result).toBe(path.resolve('/output/dir/image.png'))
    })

    it('creates output directory if needed', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)

      await resolveOutputPath('/path/to/image.png', '/output/dir')
      expect(fs.mkdir).toHaveBeenCalledWith(path.resolve('/output/dir'), { recursive: true })
    })
  })
})
