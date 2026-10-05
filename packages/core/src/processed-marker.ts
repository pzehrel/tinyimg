import { Buffer } from 'node:buffer'

const marker = Buffer.from('ProcessedBy: tinyimg')
const pngMarker = Buffer.concat([Buffer.from('tinyimg\0'), marker])
const uuid = Buffer.from('cfbe2a482a924a84ab2b2d7f39b6be20', 'hex')

// Store an ancillary container record; never decode or re-encode image pixels.
export function addProcessedMarker(buffer: Buffer, format: string): Buffer {
  if (format === 'jpeg') {
    const header = Buffer.alloc(4)
    header.writeUInt16BE(0xFFFE)
    header.writeUInt16BE(marker.length + 2, 2)
    return Buffer.concat([buffer.subarray(0, 2), header, marker, buffer.subarray(2)])
  }
  if (format === 'png') {
    const chunk = Buffer.alloc(pngMarker.length + 12)
    chunk.writeUInt32BE(pngMarker.length)
    chunk.write('tEXt', 4)
    pngMarker.copy(chunk, 8)
    chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4)
    let offset = 8
    while (offset + 12 <= buffer.length) {
      if (buffer.toString('ascii', offset + 4, offset + 8) === 'IEND')
        return Buffer.concat([buffer.subarray(0, offset), chunk, buffer.subarray(offset)])
      offset += buffer.readUInt32BE(offset) + 12
    }
    throw new Error('PNG is missing its IEND chunk')
  }
  if (format === 'webp') {
    const chunk = Buffer.alloc(8 + marker.length + marker.length % 2)
    chunk.write('TIMG')
    chunk.writeUInt32LE(marker.length, 4)
    marker.copy(chunk, 8)
    const output = Buffer.concat([buffer, chunk])
    output.writeUInt32LE(output.length - 8, 4)
    return output
  }
  // AVIF is an ISO BMFF container. A top-level UUID box is independent of image items.
  const box = Buffer.alloc(24 + marker.length)
  box.writeUInt32BE(box.length)
  box.write('uuid', 4)
  uuid.copy(box, 8)
  marker.copy(box, 24)
  return Buffer.concat([buffer, box])
}

export function hasProcessedMarker(buffer: Buffer): boolean {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    let offset = 8
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset)
      if (offset + length + 12 > buffer.length)
        return false
      if (buffer.toString('ascii', offset + 4, offset + 8) === 'tEXt'
        && buffer.subarray(offset + 8, offset + 8 + length).equals(pngMarker)) {
        return true
      }
      offset += length + 12
    }
  }
  else if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2
    while (offset + 4 <= buffer.length && buffer[offset] === 0xFF) {
      const type = buffer[offset + 1]
      if (type === 0xDA || type === 0xD9)
        break
      const length = buffer.readUInt16BE(offset + 2)
      if (length < 2 || offset + length + 2 > buffer.length)
        return false
      if (type === 0xFE && buffer.subarray(offset + 4, offset + length + 2).equals(marker))
        return true
      offset += length + 2
    }
  }
  else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    let offset = 12
    while (offset + 8 <= buffer.length) {
      const length = buffer.readUInt32LE(offset + 4)
      if (offset + length + 8 > buffer.length)
        return false
      if (buffer.toString('ascii', offset, offset + 4) === 'TIMG'
        && buffer.subarray(offset + 8, offset + 8 + length).equals(marker)) {
        return true
      }
      offset += 8 + length + length % 2
    }
  }
  else if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    let offset = 0
    while (offset + 8 <= buffer.length) {
      let length = buffer.readUInt32BE(offset)
      let headerSize = 8
      if (length === 1) {
        if (offset + 16 > buffer.length)
          return false
        const largeSize = buffer.readBigUInt64BE(offset + 8)
        if (largeSize > BigInt(Number.MAX_SAFE_INTEGER))
          return false
        length = Number(largeSize)
        headerSize = 16
      }
      if (length === 0)
        length = buffer.length - offset
      if (length < headerSize || offset + length > buffer.length)
        return false
      if (buffer.toString('ascii', offset + 4, offset + 8) === 'uuid'
        && buffer.subarray(offset + headerSize, offset + headerSize + 16).equals(uuid)
        && buffer.subarray(offset + headerSize + 16, offset + length).equals(marker)) {
        return true
      }
      offset += length
    }
  }
  return false
}

function crc32(buffer: Buffer): number {
  let crc = 0xFFFFFFFF
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}
