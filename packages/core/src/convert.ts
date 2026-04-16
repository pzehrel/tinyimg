import type { Buffer } from 'node:buffer'
import sharp from 'sharp'

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

export async function markProcessed(buffer: Buffer, ext: 'png' | 'jpg' | 'jpeg' | 'webp'): Promise<Buffer> {
  const normalized = ext.toLowerCase()
  let pipeline: sharp.Sharp

  if (normalized === 'png') {
    pipeline = sharp(buffer).png({ compressionLevel: 9 })
  }
  else if (normalized === 'jpg' || normalized === 'jpeg') {
    pipeline = sharp(buffer).jpeg()
  }
  else if (normalized === 'webp') {
    pipeline = sharp(buffer).webp()
  }
  else {
    throw new Error(`Unsupported extension for markProcessed: ${ext}`)
  }

  return pipeline
    .withMetadata({ exif: { IFD0: { ImageDescription: 'ProcessedBy: tinyimg' } } })
    .toBuffer()
}

/**
 * Checks if the image buffer contains the "ProcessedBy: tinyimg" marker.
 *
 * sharp's `metadata()` returns the raw EXIF buffer (`meta.exif`) but does not
 * expose parsed IFD0 fields directly. We decode the buffer as latin1 and scan
 * for the marker string. This is a lightweight approach that avoids adding a
 * dedicated EXIF-parsing dependency.
 */
export async function isProcessed(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata()
    const desc = meta.exif ? meta.exif.toString('latin1') : ''
    return desc.includes('ProcessedBy: tinyimg')
  }
  catch {
    return false
  }
}
