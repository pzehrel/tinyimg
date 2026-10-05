import type { Buffer } from 'node:buffer'
import sharp from 'sharp'
import { addProcessedMarker, hasProcessedMarker } from './processed-marker'

export async function canConvertToJpg(filePath: string): Promise<boolean> {
  try {
    const meta = await sharp(filePath).metadata()
    return meta.format === 'png' && meta.hasAlpha === false
  }
  catch {
    return false
  }
}

export async function convertPngToJpg(filePath: string): Promise<Buffer> {
  try {
    const pipeline = sharp(filePath)
    const meta = await pipeline.metadata()
    if (meta.format !== 'png') {
      throw new Error(`Expected PNG input, but got ${meta.format ?? 'unknown format'}`)
    }
    return await pipeline.jpeg().toBuffer()
  }
  catch (err) {
    throw new Error(`Failed to convert ${filePath} to JPEG`, { cause: err })
  }
}

export async function markProcessed(buffer: Buffer, ext: 'png' | 'jpg' | 'jpeg' | 'webp' | 'avif'): Promise<Buffer> {
  if (!['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext.toLowerCase()))
    throw new Error(`Unsupported extension for markProcessed: ${ext}`)
  if (await isProcessed(buffer))
    return buffer
  const meta = await sharp(buffer).metadata()
  const format = meta.format === 'heif' && meta.compression === 'av1' ? 'avif' : meta.format
  if (!format || !['png', 'jpeg', 'webp', 'avif'].includes(format))
    throw new Error(`Unsupported image format: ${format}`)
  return addProcessedMarker(buffer, format)
}

export async function isProcessed(buffer: Buffer): Promise<boolean> {
  if (hasProcessedMarker(buffer))
    return true
  try {
    // Continue recognizing files marked by earlier releases using EXIF.
    const meta = await sharp(buffer).metadata()
    return (meta.exif?.toString('latin1') || '').includes('ProcessedBy: tinyimg')
  }
  catch {
    return false
  }
}
