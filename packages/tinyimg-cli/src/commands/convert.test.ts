import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import process from 'node:process'
import { detectAlpha } from '@pz4l/tinyimg-core'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expandInputs } from '../utils/files'
import { logger } from '../utils/logger'
import { convertCommand } from './convert'

// Mock dependencies BEFORE importing the module under test
vi.mock('node:fs/promises')
vi.mock('sharp', () => ({
  default: vi.fn(),
}))
vi.mock('@pz4l/tinyimg-core', () => ({
  detectAlpha: vi.fn(),
}))
vi.mock('../utils/files', () => ({
  expandInputs: vi.fn(),
}))
vi.mock('../utils/format', () => ({
  formatProgress: vi.fn((current, total) => `[${current}/${total}]`),
}))
vi.mock('../utils/logger', () => ({
  logger: {
    setLevel: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('convert command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('input validation', () => {
    it('exits with error when no inputs provided', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit called')
      })

      await expect(convertCommand([])).rejects.toThrow('exit called')
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No input files specified'))
      exitSpy.mockRestore()
    })

    it('exits when no PNG files found', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit called')
      })

      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.jpg'])

      await expect(convertCommand(['/path/to/image.jpg'])).rejects.toThrow('exit called')
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No PNG files found'))

      exitSpy.mockRestore()
    })
  })

  describe('pNG transparency handling', () => {
    it('skips PNG files with transparency', async () => {
      vi.mocked(detectAlpha).mockResolvedValue(true)
      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])

      // Don't expect exit on success - command completes normally
      await convertCommand(['/path/to/image.png'])

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('has transparency'))
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Skipped (transparent): 1'))
    })

    it('converts opaque PNG files', async () => {
      vi.mocked(detectAlpha).mockResolvedValue(false)
      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])

      const mockBuffer: Buffer = Buffer.from('converted jpg data')
      const mockSharp = {
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockBuffer),
      }
      vi.mocked(sharp).mockReturnValue(mockSharp as any)

      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      // Don't expect exit on success - command completes normally
      await convertCommand(['/path/to/image.png'])

      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/image.jpg', mockBuffer)
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Converted: 1'))
    })
  })

  describe('file operations', () => {
    it('deletes original file when --delete-original flag is set', async () => {
      vi.mocked(detectAlpha).mockResolvedValue(false)
      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])

      const mockBuffer: Buffer = Buffer.from('converted jpg data')
      const mockSharp = {
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockBuffer),
      }
      vi.mocked(sharp).mockReturnValue(mockSharp as any)

      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      await convertCommand(['/path/to/image.png'], { deleteOriginal: true })

      expect(fs.unlink).toHaveBeenCalledWith('/path/to/image.png')
    })

    it('preserves original file when --delete-original flag is not set', async () => {
      vi.mocked(detectAlpha).mockResolvedValue(false)
      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])

      const mockBuffer: Buffer = Buffer.from('converted jpg data')
      const mockSharp = {
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockBuffer),
      }
      vi.mocked(sharp).mockReturnValue(mockSharp as any)

      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await convertCommand(['/path/to/image.png'], { deleteOriginal: false })

      expect(fs.unlink).not.toHaveBeenCalled()
    })
  })

  describe('batch processing', () => {
    it('processes multiple PNG files', async () => {
      vi.mocked(detectAlpha)
        .mockResolvedValueOnce(false) // image1.png - opaque
        .mockResolvedValueOnce(true) // image2.png - transparent
        .mockResolvedValueOnce(false) // image3.png - opaque

      vi.mocked(expandInputs).mockResolvedValue([
        '/path/to/image1.png',
        '/path/to/image2.png',
        '/path/to/image3.png',
      ])

      const mockBuffer: Buffer = Buffer.from('converted jpg data')
      const mockSharp = {
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(mockBuffer),
      }
      vi.mocked(sharp).mockReturnValue(mockSharp as any)

      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await convertCommand(['*.png'])

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Converted: 2'))
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Skipped (transparent): 1'))
    })
  })

  describe('error handling', () => {
    it('handles conversion errors gracefully', async () => {
      vi.mocked(detectAlpha).mockResolvedValue(false)
      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])

      vi.mocked(sharp).mockReturnValue({
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockRejectedValue(new Error('Conversion failed')),
      } as any)

      await convertCommand(['/path/to/image.png'])

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error converting'))
    })

    it('uses default quality of 85 when not specified', async () => {
      vi.mocked(detectAlpha).mockResolvedValue(false)
      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])

      const mockBuffer: Buffer = Buffer.from('converted jpg data')
      const jpegMock = vi.fn().mockReturnThis()
      vi.mocked(sharp).mockReturnValue({
        jpeg: jpegMock,
        toBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any)

      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await convertCommand(['/path/to/image.png'])

      expect(jpegMock).toHaveBeenCalledWith({ quality: 85, progressive: true })
    })

    it('uses custom quality when specified', async () => {
      vi.mocked(detectAlpha).mockResolvedValue(false)
      vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])

      const mockBuffer: Buffer = Buffer.from('converted jpg data')
      const jpegMock = vi.fn().mockReturnThis()
      vi.mocked(sharp).mockReturnValue({
        jpeg: jpegMock,
        toBuffer: vi.fn().mockResolvedValue(mockBuffer),
      } as any)

      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await convertCommand(['/path/to/image.png'], { quality: 95 })

      expect(jpegMock).toHaveBeenCalledWith({ quality: 95, progressive: true })
    })
  })
})
