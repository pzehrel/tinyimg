import { Buffer } from 'node:buffer'
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock tinyimg-core before importing the plugin
vi.mock('@pz4l/tinyimg-core', () => ({
  compressImage: vi.fn().mockResolvedValue(Buffer.from('mock-compressed-image-data')),
  compressImages: vi.fn().mockResolvedValue([]),
  loadKeys: vi.fn().mockReturnValue(['test-key-1', 'test-key-2']),
  loadKeysFromGlobal: vi.fn().mockReturnValue([]),
}))

const fixtureDir = join(__dirname, '../fixtures/vite')
const distDir = join(fixtureDir, 'dist')
const _imageAssetsDir = join(distDir, 'images')

describe('vite Integration', () => {
  beforeAll(async () => {
    // Clean dist directory
    await rm(distDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    // Set TINYPNG_KEYS environment variable for each test
    process.env.TINYPNG_KEYS = 'test-key-1,test-key-2'
  })

  afterEach(() => {
    // Clean up environment variable
    delete process.env.TINYPNG_KEYS
  })

  afterAll(async () => {
    // Clean dist directory
    await rm(distDir, { recursive: true, force: true })
  })

  it('builds fixture project successfully', () => {
    const result = execSync('npx vite build', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
      encoding: 'utf-8',
    })

    expect(result).toContain('build')
    expect(result).toContain('dist')
  })

  it('outputs compressed images', () => {
    // First, run the build
    execSync('npx vite build', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    })

    // Check that dist directory exists
    expect(existsSync(distDir)).toBe(true)

    // Check that assets directory exists
    const assetsDir = join(distDir, 'assets')
    expect(existsSync(assetsDir)).toBe(true)

    // Check for JS files in output (images are embedded as base64)
    const files = readdirSync(assetsDir)
    expect(files.length).toBeGreaterThan(0)

    const jsFiles = files.filter(f => f.endsWith(''))
    expect(jsFiles.length).toBeGreaterThan(0)

    // Verify JS files contain image data (base64 data URLs)
    jsFiles.forEach((file) => {
      const filePath = join(assetsDir, file)
      const content = readFileSync(filePath, 'utf-8')

      // Should contain base64 image data
      expect(content).toMatch(/data:image\/(png|jpeg);base64/)
    })
  })

  it('shows compression summary', () => {
    const result = execSync('npx vite build', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
      encoding: 'utf-8',
    })

    // Check for summary output (D-09)
    // The summary should mention compression and saved bytes
    expect(result).toMatch(/tinyimg|Compressed|compressed/)
    expect(result).toMatch(/images?|KB|bytes/)
  })

  it('skips compression in development mode', () => {
    // Clean dist first
    execSync('rm -rf dist', { cwd: fixtureDir })

    // In dev mode, plugin should skip compression
    const result = execSync('npx vite build', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
      encoding: 'utf-8',
    })

    // Should not show compression output
    expect(result).not.toMatch(/Compressing|compressing/)
  })

  it('uses cache on second build', () => {
    // Clean dist first
    execSync('rm -rf dist', { cwd: fixtureDir })

    // First build
    execSync('npx vite build', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    })

    // Second build (should use cache)
    const result = execSync('npx vite build', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
      encoding: 'utf-8',
    })

    // Should indicate cache hits
    expect(result).toMatch(/cached|cache|Cache/)
  })
})
