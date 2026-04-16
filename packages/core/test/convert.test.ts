import type { Buffer } from 'node:buffer'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { canConvertToJpg, convertPngToJpg, isProcessed, markProcessed } from '../src/convert'

async function createTestBuffer(
  format: 'png' | 'jpeg' | 'webp',
  options: { width?: number, height?: number, channels?: 3 | 4 } = {},
): Promise<Buffer> {
  const { width = 10, height = 10, channels = 3 } = options
  const background = channels === 4
    ? { r: 255, g: 0, b: 0, alpha: 0.5 }
    : { r: 255, g: 0, b: 0 }
  return sharp({ create: { width, height, channels, background } })
    .toFormat(format)
    .toBuffer()
}

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'tinyimg-convert-'))
  try {
    await fn(dir)
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe('convert', () => {
  it('canConvertToJpg returns true for an opaque PNG', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = join(tmpDir, 'opaque.png')
      const buffer = await createTestBuffer('png')
      await writeFile(filePath, buffer)
      await expect(canConvertToJpg(filePath)).resolves.toBe(true)
    })
  })

  it('canConvertToJpg returns false for a transparent PNG', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = join(tmpDir, 'transparent.png')
      const buffer = await createTestBuffer('png', { channels: 4 })
      await writeFile(filePath, buffer)
      await expect(canConvertToJpg(filePath)).resolves.toBe(false)
    })
  })

  it('convertPngToJpg takes a PNG file path and produces a valid JPEG buffer', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = join(tmpDir, 'input.png')
      const buffer = await createTestBuffer('png')
      await writeFile(filePath, buffer)
      const result = await convertPngToJpg(filePath)
      const meta = await sharp(result).metadata()
      expect(meta.format).toBe('jpeg')
    })
  })

  it('convertPngToJpg throws when file does not exist', async () => {
    await expect(convertPngToJpg('/nonexistent/path.png')).rejects.toSatisfy((err: Error) => {
      return /Failed to convert/.test(err.message) && err.cause !== undefined
    })
  })

  it('convertPngToJpg throws when given a non-PNG file', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = join(tmpDir, 'input.jpg')
      const buffer = await createTestBuffer('jpeg')
      await writeFile(filePath, buffer)
      await expect(convertPngToJpg(filePath)).rejects.toSatisfy((err: Error) => {
        return /Failed to convert/.test(err.message)
          && err.cause instanceof Error
          && /Expected PNG input/.test(err.cause.message)
      })
    })
  })

  it('markProcessed + isProcessed round-trip returns true for a PNG buffer', async () => {
    const buffer = await createTestBuffer('png')
    const marked = await markProcessed(buffer, 'png')
    await expect(isProcessed(marked)).resolves.toBe(true)
  })

  it('markProcessed + isProcessed round-trip returns true for a JPEG buffer', async () => {
    const buffer = await createTestBuffer('jpeg')
    const marked = await markProcessed(buffer, 'jpg')
    await expect(isProcessed(marked)).resolves.toBe(true)
  })

  it('isProcessed returns false for an unmarked image buffer', async () => {
    const buffer = await createTestBuffer('png')
    await expect(isProcessed(buffer)).resolves.toBe(false)
  })

  it('markProcessed + isProcessed round-trip returns true for a WebP buffer', async () => {
    const buffer = await createTestBuffer('webp')
    const marked = await markProcessed(buffer, 'webp')
    await expect(isProcessed(marked)).resolves.toBe(true)
  })

  it('markProcessed throws for unsupported extension', async () => {
    const buffer = await createTestBuffer('png')
    // @ts-expect-error testing unsupported extension
    await expect(markProcessed(buffer, 'gif')).rejects.toThrow('Unsupported extension')
  })

  it('isProcessed returns false for an invalid buffer', async () => {
    await expect(isProcessed(Buffer.from('not-an-image'))).resolves.toBe(false)
  })

  it('isProcessed returns false for an unmarked WebP buffer', async () => {
    const webpBuffer = await createTestBuffer('webp')
    await expect(isProcessed(webpBuffer)).resolves.toBe(false)
  })

  it('isProcessed returns false for a buffer with unrelated EXIF ImageDescription', async () => {
    const buffer = await createTestBuffer('png')
    const marked = await sharp(buffer)
      .withMetadata({ exif: { IFD0: { ImageDescription: 'Some other tool' } } })
      .png()
      .toBuffer()
    await expect(isProcessed(marked)).resolves.toBe(false)
  })

  it('canConvertToJpg returns false for a JPEG file', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = join(tmpDir, 'input.jpg')
      const buffer = await createTestBuffer('jpeg')
      await writeFile(filePath, buffer)
      await expect(canConvertToJpg(filePath)).resolves.toBe(false)
    })
  })

  it('canConvertToJpg returns false for a nonexistent file', async () => {
    await expect(canConvertToJpg('/nonexistent/path.png')).resolves.toBe(false)
  })
})
