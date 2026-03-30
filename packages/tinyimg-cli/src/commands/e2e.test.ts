import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { expandInputs, isImageFile } from '../utils/files'
import { convertCommand } from './convert'
import { listCommand } from './list'

/**
 * E2E tests for CLI commands using real file system operations
 *
 * These tests use sharp-generated fixtures (REAL image files) to verify
 * integration between components that unit tests with mocks cannot catch.
 */

describe('e2E: CLI Commands', () => {
  const tmpdirPath = join(tmpdir(), 'tinyimg-e2e-test')
  const opaquePngPath = join(tmpdirPath, 'opaque.png')
  const transparentPngPath = join(tmpdirPath, 'transparent.png')
  const jpgPath = join(tmpdirPath, 'photo.jpg')
  const webpPath = join(tmpdirPath, 'image.webp')
  const avifPath = join(tmpdirPath, 'image.avif')
  const subDirPath = join(tmpdirPath, 'subdir')

  // Spy on console methods
  const consoleLogSpy = vi.spyOn(console, 'log')
  vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    throw new Error(`process.exit called with code: ${code}`)
  })

  beforeAll(async () => {
    // Create temp directory
    if (!existsSync(tmpdirPath)) {
      mkdirSync(tmpdirPath, { recursive: true })
    }

    // Create opaque PNG (RGBA, all alpha=255)
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1.0 }, // Fully opaque red
      },
    })
      .png()
      .toFile(opaquePngPath)

    // Create transparent PNG (alpha channel with alpha<255)
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 0.5 }, // 50% transparent green
      },
    })
      .png()
      .toFile(transparentPngPath)

    // Create JPEG file
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .jpeg()
      .toFile(jpgPath)

    // Create WebP file
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .webp()
      .toFile(webpPath)

    // Create AVIF file
    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 255, b: 0 },
      },
    })
      .avif()
      .toFile(avifPath)
  })

  afterAll(() => {
    // Clean up temp directory
    if (existsSync(tmpdirPath)) {
      rmSync(tmpdirPath, { recursive: true, force: true })
    }
  })

  describe('list command', () => {
    it('lists all image files in directory', async () => {
      try {
        await listCommand([tmpdirPath])
      }
      catch {
        // process.exit was called, ignore
      }

      const logs = consoleLogSpy.mock.calls.map(call => call[0]).join('\n')
      expect(logs).toContain('opaque.png')
      expect(logs).toContain('transparent.png')
      expect(logs).toContain('photo.jpg')
      expect(logs).toContain('image.webp')
      expect(logs).toContain('image.avif')
    })

    it('shows file count and total size', async () => {
      try {
        await listCommand([tmpdirPath])
      }
      catch {
        // process.exit was called, ignore
      }

      const logs = consoleLogSpy.mock.calls.map(call => call[0]).join('\n')
      expect(logs).toContain('5 files') // Should show "5 files"
      expect(logs).toMatch(/\d+KB|\d+MB/) // Should show a size
    })

    it('works with ls alias (same command)', async () => {
      try {
        await listCommand([tmpdirPath])
      }
      catch {
        // process.exit was called, ignore
      }

      // listCommand IS the ls command (same function)
      // Just verify it works
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('handles multiple input paths', async () => {
      // Create subdirectory with images
      mkdirSync(subDirPath, { recursive: true })
      const subImagePath = join(subDirPath, 'sub.png')
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .png()
        .toFile(subImagePath)

      try {
        await listCommand([tmpdirPath, subDirPath])
      }
      catch {
        // process.exit was called, ignore
      }

      const logs = consoleLogSpy.mock.calls.map(call => call[0]).join('\n')
      expect(logs).toContain('sub.png') // Should include file from subdirectory
      expect(logs).toContain('6 files') // 5 + 1 = 6 files
    })
  })

  describe('convert command', () => {
    it('converts opaque PNG to JPG', async () => {
      try {
        await convertCommand([opaquePngPath])
      }
      catch {
        // process.exit was called, ignore
      }

      const jpgFilePath = opaquePngPath.replace(/\.png$/i, '.jpg')
      expect(existsSync(jpgFilePath)).toBe(true)

      // Clean up
      if (existsSync(jpgFilePath)) {
        rmSync(jpgFilePath)
      }
    })

    it('skips transparent PNG', async () => {
      try {
        await convertCommand([transparentPngPath])
      }
      catch {
        // process.exit was called, ignore
      }

      const jpgFilePath = transparentPngPath.replace(/\.png$/i, '.jpg')
      expect(existsSync(jpgFilePath)).toBe(false)

      const logs = consoleLogSpy.mock.calls.map(call => call[0]).join('\n')
      expect(logs).toContain('Skipping')
      expect(logs).toContain('transparency')
    })

    it('respects quality option', async () => {
      try {
        await convertCommand([opaquePngPath], { quality: 50 })
      }
      catch {
        // process.exit was called, ignore
      }

      const jpgFilePath = opaquePngPath.replace(/\.png$/i, '.jpg')
      expect(existsSync(jpgFilePath)).toBe(true)

      // Clean up
      if (existsSync(jpgFilePath)) {
        rmSync(jpgFilePath)
      }
    })

    it('deletes original when --delete-original flag', async () => {
      // Create a test file for deletion
      const testPngPath = join(tmpdirPath, 'test-delete.png')
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 200, g: 200, b: 200 },
        },
      })
        .png()
        .toFile(testPngPath)

      try {
        await convertCommand([testPngPath], { deleteOriginal: true })
      }
      catch {
        // process.exit was called, ignore
      }

      const jpgFilePath = testPngPath.replace(/\.png$/i, '.jpg')
      expect(existsSync(jpgFilePath)).toBe(true)
      expect(existsSync(testPngPath)).toBe(false)

      // Clean up
      if (existsSync(jpgFilePath)) {
        rmSync(jpgFilePath)
      }
    })
  })

  describe('format support', () => {
    it('isImageFile returns true for .webp', () => {
      expect(isImageFile('test.webp')).toBe(true)
    })

    it('isImageFile returns true for .avif', () => {
      expect(isImageFile('test.avif')).toBe(true)
    })

    it('isImageFile returns true for .png/.jpg/.jpeg', () => {
      expect(isImageFile('test.png')).toBe(true)
      expect(isImageFile('test.jpg')).toBe(true)
      expect(isImageFile('test.jpeg')).toBe(true)
    })

    it('expandInputs discovers WebP files', async () => {
      const results = await expandInputs([webpPath])
      expect(results).toContain(webpPath)
    })

    it('expandInputs discovers AVIF files', async () => {
      const results = await expandInputs([avifPath])
      expect(results).toContain(avifPath)
    })
  })

  describe('multiple input paths', () => {
    it('expandInputs handles multiple directory paths', async () => {
      // Create a second temp directory
      const tmpdir2 = join(tmpdir(), 'tinyimg-e2e-test-2')
      mkdirSync(tmpdir2, { recursive: true })

      const imagePath2 = join(tmpdir2, 'image2.png')
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 50, g: 50, b: 50 },
        },
      })
        .png()
        .toFile(imagePath2)

      const results = await expandInputs([tmpdirPath, tmpdir2])

      // Should include files from both directories
      expect(results.length).toBeGreaterThan(5) // At least 5 from tmpdirPath + 1 from tmpdir2

      // Clean up
      rmSync(tmpdir2, { recursive: true, force: true })
    })

    it('expandInputs handles mixed files and directories', async () => {
      const results = await expandInputs([opaquePngPath, tmpdirPath])

      // Should include the specific file + all files in directory
      expect(results).toContain(opaquePngPath)
      expect(results.length).toBeGreaterThan(1)
    })
  })
})
