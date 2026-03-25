import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const fixturesDir = join(__dirname, 'images')

/**
 * Create a minimal valid PNG buffer (1KB).
 *
 * PNG structure:
 * - 8-byte signature: 89 50 4E 47 0D 0A 1A 0A
 * - IHDR chunk (13 bytes + 12 bytes chunk overhead)
 * - IDAT chunk (minimal data)
 * - IEND chunk (12 bytes chunk overhead)
 */
async function createSamplePng(): Promise<Buffer> {
  const size = 1024 // 1KB
  const buffer = Buffer.alloc(size)

  // PNG signature
  buffer[0] = 0x89
  buffer[1] = 0x50
  buffer[2] = 0x4E
  buffer[3] = 0x47
  buffer[4] = 0x0D
  buffer[5] = 0x0A
  buffer[6] = 0x1A
  buffer[7] = 0x0A

  // Minimal IHDR chunk (at offset 8)
  // Length: 13 (0x00 0x00 0x00 0x0D)
  buffer.writeUInt32BE(13, 8)
  // Chunk type: IHDR
  buffer[12] = 0x49
  buffer[13] = 0x48
  buffer[14] = 0x44
  buffer[15] = 0x52
  // Width: 1px (0x00 0x00 0x00 0x01)
  buffer.writeUInt32BE(1, 16)
  // Height: 1px (0x00 0x00 0x00 0x01)
  buffer.writeUInt32BE(1, 20)
  // Bit depth: 8 (0x08)
  buffer[24] = 0x08
  // Color type: 2 (RGB) (0x02)
  buffer[25] = 0x02
  // Compression: 0 (0x00)
  buffer[26] = 0x00
  // Filter: 0 (0x00)
  buffer[27] = 0x00
  // Interlace: 0 (0x00)
  buffer[28] = 0x00
  // CRC (4 bytes) - dummy value
  buffer[29] = 0x00
  buffer[30] = 0x00
  buffer[31] = 0x00
  buffer[32] = 0x00

  // IEND chunk at the end (last 12 bytes)
  const iendOffset = size - 12
  // Length: 0 (0x00 0x00 0x00 0x00)
  buffer.writeUInt32BE(0, iendOffset)
  // Chunk type: IEND
  buffer[iendOffset + 4] = 0x49
  buffer[iendOffset + 5] = 0x45
  buffer[iendOffset + 6] = 0x4E
  buffer[iendOffset + 7] = 0x44
  // CRC (4 bytes) - dummy value
  buffer[iendOffset + 8] = 0xAE
  buffer[iendOffset + 9] = 0x42
  buffer[iendOffset + 10] = 0x60
  buffer[iendOffset + 11] = 0x82

  return buffer
}

/**
 * Create a minimal valid JPG buffer (1KB).
 *
 * JPG structure:
 * - SOI marker: FF D8
 * - APP0 marker (JFIF identifier)
 * - DQT marker (quantization table)
 * - SOF0 marker (baseline DCT)
 * - DHT marker (Huffman table)
 * - SOS marker (start of scan)
 * - Minimal scan data
 * - EOI marker: FF D9
 */
async function createSampleJpg(): Promise<Buffer> {
  const size = 1024 // 1KB
  const buffer = Buffer.alloc(size)

  let offset = 0

  // SOI marker (Start of Image)
  buffer[offset++] = 0xFF
  buffer[offset++] = 0xD8

  // APP0 marker (JFIF identifier)
  buffer[offset++] = 0xFF
  buffer[offset++] = 0xE0
  // Length (16 bytes including marker length)
  buffer.writeUInt16BE(16, offset)
  offset += 2
  // Identifier "JFIF"
  buffer[offset++] = 0x4A
  buffer[offset++] = 0x46
  buffer[offset++] = 0x49
  buffer[offset++] = 0x46
  buffer[offset++] = 0x00
  // Version (1.1)
  buffer[offset++] = 0x01
  buffer[offset++] = 0x01
  // Units (0 = aspect ratio)
  buffer[offset++] = 0x00
  // X density (1)
  buffer.writeUInt16BE(1, offset)
  offset += 2
  // Y density (1)
  buffer.writeUInt16BE(1, offset)
  offset += 2
  // Thumbnail (0x0 = no thumbnail)
  buffer[offset++] = 0x00
  buffer[offset++] = 0x00

  // SOF0 marker (Start of Frame, baseline DCT)
  buffer[offset++] = 0xFF
  buffer[offset++] = 0xC0
  // Length (17 bytes including marker length)
  buffer.writeUInt16BE(17, offset)
  offset += 2
  // Precision (8 bits)
  buffer[offset++] = 0x08
  // Height (1px)
  buffer.writeUInt16BE(1, offset)
  offset += 2
  // Width (1px)
  buffer.writeUInt16BE(1, offset)
  offset += 2
  // Number of components (3 = RGB)
  buffer[offset++] = 0x03
  // Component 1 (Y)
  buffer[offset++] = 0x01 // Component ID
  buffer[offset++] = 0x11 // Sampling (1x1)
  buffer[offset++] = 0x00 // Quantization table
  // Component 2 (Cb)
  buffer[offset++] = 0x02 // Component ID
  buffer[offset++] = 0x11 // Sampling (1x1)
  buffer[offset++] = 0x01 // Quantization table
  // Component 3 (Cr)
  buffer[offset++] = 0x03 // Component ID
  buffer[offset++] = 0x11 // Sampling (1x1)
  buffer[offset++] = 0x01 // Quantization table

  // SOS marker (Start of Scan)
  buffer[offset++] = 0xFF
  buffer[offset++] = 0xDA
  // Length (12 bytes including marker length)
  buffer.writeUInt16BE(12, offset)
  offset += 2
  // Number of components (3)
  buffer[offset++] = 0x03
  // Component 1 (Y)
  buffer[offset++] = 0x01 // Component ID
  buffer[offset++] = 0x00 // DC/AC table
  // Component 2 (Cb)
  buffer[offset++] = 0x02 // Component ID
  buffer[offset++] = 0x11 // DC/AC table
  // Component 3 (Cr)
  buffer[offset++] = 0x03 // Component ID
  buffer[offset++] = 0x11 // DC/AC table
  // Spectral selection
  buffer[offset++] = 0x00
  buffer[offset++] = 0x3F
  buffer[offset++] = 0x00

  // Fill remaining space with minimal data (just padding)
  while (offset < size - 2) {
    buffer[offset++] = 0x00
  }

  // EOI marker (End of Image)
  buffer[offset++] = 0xFF
  buffer[offset++] = 0xD9

  return buffer
}

/**
 * Generate fixture files for testing.
 */
async function generateFixtures() {
  const png = await createSamplePng()
  const jpg = await createSampleJpg()

  await writeFile(join(fixturesDir, 'sample.png'), png)
  await writeFile(join(fixturesDir, 'sample.jpg'), jpg)

  console.log('✓ Generated sample.png (1KB PNG)')
  console.log('✓ Generated sample.jpg (1KB JPG)')
}

generateFixtures().catch(console.error)
