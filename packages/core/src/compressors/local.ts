import { Buffer } from 'node:buffer'
import sharp from 'sharp'

/**
 * Compress an image buffer locally using sharp.
 *
 * @param buffer - The input image buffer.
 * @param maxFileSize - The desired maximum file size in bytes.
 * @param ext - The target image format ('png' | 'jpg' | 'jpeg' | 'webp' | 'avif').
 * @returns The compressed buffer. May still exceed `maxFileSize` if compression
 *   cannot reduce the size further. Returns the original buffer if it already
 *   meets the size limit. A maximum of 2 compression rounds are attempted.
 */
const MAX_ROUNDS = 2
const MIN_QUALITY = 10
const MAX_QUALITY = 90

export async function localCompress(buffer: Buffer, maxFileSize: number, ext: 'png' | 'jpg' | 'jpeg' | 'webp' | 'avif'): Promise<Buffer> {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('buffer must be a Buffer')
  }
  if (maxFileSize <= 0) {
    throw new RangeError('maxFileSize must be greater than 0')
  }
  if (buffer.length <= maxFileSize) {
    return buffer
  }

  let current = buffer
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const ratio = maxFileSize / current.length
    const quality = Math.max(MIN_QUALITY, Math.min(MAX_QUALITY, Math.round(ratio * 100) - round * 10))

    let next: Buffer
    try {
      if (ext === 'png') {
        // sharp PNG output does not support a quality parameter for lossy compression.
        // We use maximum zlib compression via compressionLevel: 9.
        next = await sharp(current).png({ compressionLevel: 9 }).toBuffer()
      }
      else if (ext === 'jpg' || ext === 'jpeg') {
        next = await sharp(current).jpeg({ quality, progressive: true }).toBuffer()
      }
      else if (ext === 'webp') {
        next = await sharp(current).webp({ quality }).toBuffer()
      }
      else if (ext === 'avif') {
        next = await sharp(current).avif({ quality }).toBuffer()
      }
      else {
        throw new TypeError(`Unsupported format: ${ext}`)
      }
    }
    catch (err) {
      throw new Error('Local compression failed', { cause: err })
    }

    if (next.length <= maxFileSize || next.length >= current.length) {
      if (next.length < current.length) {
        current = next
      }
      break
    }
    current = next
  }

  return current
}
