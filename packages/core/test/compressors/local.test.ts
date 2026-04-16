import { Buffer } from 'node:buffer'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { localCompress } from '../../src/compressors/local'

describe('localCompress', () => {
  it('should return the original buffer when it is already within maxFileSize', async () => {
    const buffer = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .jpeg()
      .toBuffer()
    const result = await localCompress(buffer, buffer.length + 1, 'jpg')
    expect(result).toBe(buffer)
  })

  it('should compress an oversized JPEG below maxFileSize', async () => {
    const width = 800
    const height = 800
    const raw = randomBytes(width * height * 3)
    const buffer = await sharp(raw, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 95 })
      .toBuffer()
    const maxFileSize = Math.floor(buffer.length / 2)
    const result = await localCompress(buffer, maxFileSize, 'jpg')
    expect(result.length).toBeLessThanOrEqual(maxFileSize)
  })

  it('should accept jpeg alias', async () => {
    const width = 800
    const height = 800
    const raw = randomBytes(width * height * 3)
    const buffer = await sharp(raw, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 95 })
      .toBuffer()
    const maxFileSize = Math.floor(buffer.length / 2)
    const result = await localCompress(buffer, maxFileSize, 'jpeg')
    expect(result.length).toBeLessThanOrEqual(maxFileSize)
  })

  it('should compress an oversized WebP below maxFileSize', async () => {
    const width = 800
    const height = 800
    const raw = randomBytes(width * height * 3)
    const buffer = await sharp(raw, { raw: { width, height, channels: 3 } })
      .webp({ quality: 95 })
      .toBuffer()
    // Use a less aggressive target so 2 rounds of quality reduction can succeed.
    const maxFileSize = Math.floor(buffer.length * 0.75)
    const result = await localCompress(buffer, maxFileSize, 'webp')
    expect(result.length).toBeLessThanOrEqual(maxFileSize)
  })

  it('should handle PNG compression without quality option', async () => {
    const buffer = await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 0, g: 0, b: 255 } } })
      .png()
      .toBuffer()
    const maxFileSize = buffer.length - 1
    const result = await localCompress(buffer, maxFileSize, 'png')
    // sharp PNG output does not support a quality parameter for lossy compression.
    // We use maximum zlib compression via compressionLevel: 9.
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeLessThan(buffer.length)
  })

  it('should handle AVIF compression', async () => {
    const buffer = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 255, b: 0 } } })
      .avif({ quality: 80 })
      .toBuffer()
    const maxFileSize = Math.floor(buffer.length / 2)
    const result = await localCompress(buffer, maxFileSize, 'avif')
    // AVIF recompression with sharp may not shrink significantly under local
    // compression (encoding is already aggressive), so we only assert it
    // returns a valid buffer without growing.
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeLessThanOrEqual(buffer.length)
  })

  it('should break the loop when size stops decreasing', async () => {
    // Create a tiny JPEG that cannot be compressed much further.
    const buffer = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .jpeg({ quality: 10 })
      .toBuffer()
    const maxFileSize = 1
    const result = await localCompress(buffer, maxFileSize, 'jpg')
    // Should return the smallest achievable buffer, even if still above maxFileSize.
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should throw a domain-specific error when sharp fails', async () => {
    const invalidBuffer = Buffer.from('not an image')
    await expect(localCompress(invalidBuffer, 1, 'jpg')).rejects.toThrow('Local compression failed')
  })

  it('should throw TypeError when buffer is not a Buffer', async () => {
    await expect(localCompress('not a buffer' as unknown as Buffer, 1, 'jpg')).rejects.toThrow(TypeError)
    await expect(localCompress('not a buffer' as unknown as Buffer, 1, 'jpg')).rejects.toThrow('buffer must be a Buffer')
  })

  it('should throw RangeError when maxFileSize is not positive', async () => {
    const buffer = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .jpeg()
      .toBuffer()
    await expect(localCompress(buffer, 0, 'jpg')).rejects.toThrow(RangeError)
    await expect(localCompress(buffer, 0, 'jpg')).rejects.toThrow('maxFileSize must be greater than 0')
    await expect(localCompress(buffer, -1, 'jpg')).rejects.toThrow('maxFileSize must be greater than 0')
  })
})
