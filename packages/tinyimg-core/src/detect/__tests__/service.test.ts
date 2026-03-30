import type { DetectOptions } from '../types'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { detectAlpha, detectAlphas } from '../service'
import {
  cleanupFixtures,
  createJpgFile,
  createLargePng,
  createOpaquePngNoAlpha,
  createOpaquePngWithAlphaChannel,
  createPngWithAlpha,
} from './fixtures'

// Track fixture paths for cleanup
let alphaPng: string
let opaqueNoAlphaPng: string
let opaqueWithAlphaPng: string
let jpgFile: string
let largePng: string

beforeEach(async () => {
  // Create fresh fixtures for each test
  // Note: Don't call cleanupFixtures() here as it interferes with parallel tests
  alphaPng = await createPngWithAlpha()
  opaqueNoAlphaPng = await createOpaquePngNoAlpha()
  opaqueWithAlphaPng = await createOpaquePngWithAlphaChannel()
  jpgFile = await createJpgFile()
  largePng = await createLargePng()
})

afterAll(() => {
  // Clean up all fixtures after all tests complete
  cleanupFixtures()
})

describe('detectAlpha', () => {
  it('returns true for PNG with transparent pixels', async () => {
    const result = await detectAlpha(alphaPng)
    expect(result).toBe(true)
  })

  it('returns false for PNG with no alpha channel (RGB only)', async () => {
    const result = await detectAlpha(opaqueNoAlphaPng)
    expect(result).toBe(false)
  })

  it('returns false for PNG with alpha channel but all pixels opaque (false positive case)', async () => {
    const result = await detectAlpha(opaqueWithAlphaPng)
    expect(result).toBe(false)
  })

  it('returns false for non-PNG file (JPG)', async () => {
    const result = await detectAlpha(jpgFile)
    expect(result).toBe(false)
  })

  it('throws descriptive error for non-existent file', async () => {
    const nonExistentPath = '/tmp/non-existent-file.png'
    await expect(detectAlpha(nonExistentPath)).rejects.toThrow()
  })

  it('completes detection in under 2 seconds for large PNG', async () => {
    const start = Date.now()
    const result = await detectAlpha(largePng)
    const elapsed = Date.now() - start

    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(2000)
  })
})

describe('detectAlphas', () => {
  it('returns Map with correct results for mixed files', async () => {
    const files = [alphaPng, opaqueNoAlphaPng, opaqueWithAlphaPng]
    const results = await detectAlphas(files)

    expect(results).toBeInstanceOf(Map)
    expect(results.size).toBe(3)
    expect(results.get(alphaPng)).toBe(true)
    expect(results.get(opaqueNoAlphaPng)).toBe(false)
    expect(results.get(opaqueWithAlphaPng)).toBe(false)
  })

  it('respects concurrency option', async () => {
    const files = [alphaPng, opaqueNoAlphaPng, opaqueWithAlphaPng, jpgFile, largePng]
    const options: DetectOptions = { concurrency: 2 }

    const results = await detectAlphas(files, options)

    expect(results).toBeInstanceOf(Map)
    expect(results.size).toBe(5)
  })

  it('returns empty Map for empty input array', async () => {
    const results = await detectAlphas([])

    expect(results).toBeInstanceOf(Map)
    expect(results.size).toBe(0)
  })
})
