import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

/**
 * Test fixtures for PNG transparency detection
 *
 * Uses sharp to create REAL PNG files with precise alpha channel control
 * This is critical because detection relies on actual pixel data
 */

const FIXTURE_DIR = join(tmpdir(), 'tinyimg-detect-test')

/**
 * Get the fixture directory path
 * Ensures the directory exists before returning
 */
export function getFixtureDir(): string {
  if (!existsSync(FIXTURE_DIR)) {
    try {
      mkdirSync(FIXTURE_DIR, { recursive: true })
    }
    catch (error) {
      throw new Error(`Failed to create fixture directory at ${FIXTURE_DIR}: ${error}`)
    }
  }
  return FIXTURE_DIR
}

/**
 * Clean up all fixture files
 */
export function cleanupFixtures(): void {
  if (existsSync(FIXTURE_DIR)) {
    rmSync(FIXTURE_DIR, { recursive: true, force: true })
  }
}

/**
 * Create a 10x10 PNG with transparent pixels (alpha=128)
 */
export async function createPngWithAlpha(): Promise<string> {
  const filePath = join(getFixtureDir(), 'png-with-alpha.png')

  // Create 10x10 RGBA image with semi-transparent pixels
  await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.5 }, // 50% transparent red
    },
  })
    .png()
    .toFile(filePath)

  return filePath
}

/**
 * Create a 10x10 PNG with NO alpha channel (RGB only)
 */
export async function createOpaquePngNoAlpha(): Promise<string> {
  const filePath = join(getFixtureDir(), 'opaque-no-alpha.png')

  // Create 10x10 RGB image (no alpha channel)
  await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3, // RGB only
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .png()
    .toFile(filePath)

  return filePath
}

/**
 * Create a 10x10 PNG with alpha channel but ALL pixels opaque (alpha=255)
 * This is the FALSE POSITIVE case from RESEARCH.md Pitfall 1
 */
export async function createOpaquePngWithAlphaChannel(): Promise<string> {
  const filePath = join(getFixtureDir(), 'opaque-with-alpha-channel.png')

  // Create 10x10 RGBA image with all pixels fully opaque
  await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1.0 }, // Fully opaque green
    },
  })
    .png()
    .toFile(filePath)

  return filePath
}

/**
 * Create a JPG file for non-PNG handling test
 */
export async function createJpgFile(): Promise<string> {
  const filePath = join(getFixtureDir(), 'test.jpg')

  // Create 10x10 RGB JPEG
  await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .jpeg()
    .toFile(filePath)

  return filePath
}

/**
 * Create a large PNG for performance test
 * 500x500 RGBA PNG - sufficient for performance testing
 */
export async function createLargePng(): Promise<string> {
  const filePath = join(getFixtureDir(), 'large-png.png')

  try {
    // Create 500x500 RGBA image
    await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1.0 },
      },
    })
      .png()
      .toFile(filePath)

    // Verify file was created
    if (!existsSync(filePath)) {
      throw new Error(`Failed to create large PNG file at ${filePath}`)
    }

    return filePath
  }
  catch (error) {
    throw new Error(`Failed to create large PNG: ${error}`)
  }
}
