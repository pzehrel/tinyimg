import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock tinyimg-core before importing the plugin
vi.mock('tinyimg-core', () => ({
  compressImage: vi.fn().mockResolvedValue(Buffer.from('mock-compressed-image-data')),
  compressImages: vi.fn().mockResolvedValue([]),
  loadKeys: vi.fn().mockReturnValue(['test-key-1', 'test-key-2']),
  loadKeysFromGlobal: vi.fn().mockReturnValue([]),
}))

const fixtureDir = join(__dirname, '../fixtures/webpack')
const distDir = join(fixtureDir, 'dist')

// Check if webpack CLI is available
let webpackAvailable = false
try {
  execSync('webpack --version', { stdio: 'ignore' })
  webpackAvailable = true
}
catch {
  // webpack CLI not found
}

describe('webpack Integration', () => {
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

  // Skip all tests if webpack CLI is not available
  if (!webpackAvailable) {
    it.skip('builds fixture project successfully (CLI unavailable)', () => {
      // Skipped: webpack CLI not found
    })
    it.skip('outputs compressed images (CLI unavailable)', () => {
      // Skipped: webpack CLI not found
    })
    it.skip('shows compression summary (CLI unavailable)', () => {
      // Skipped: webpack CLI not found
    })
    it.skip('skips compression in development mode (CLI unavailable)', () => {
      // Skipped: webpack CLI not found
    })
    it.skip('uses cache on second build (CLI unavailable)', () => {
      // Skipped: webpack CLI not found
    })
    return
  }

  it('builds fixture project successfully (CLI available)', () => {
    const result = execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
      encoding: 'utf-8',
    })

    expect(result).toContain('bundle.js')
  })

  it('outputs compressed images (CLI available)', () => {
    // First, run the build
    execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    })

    // Check that dist directory exists
    expect(existsSync(distDir)).toBe(true)

    // Check for bundle.js in output
    const files = readdirSync(distDir)
    expect(files.length).toBeGreaterThan(0)

    const jsFiles = files.filter(f => f.endsWith('.js'))
    expect(jsFiles.length).toBeGreaterThan(0)

    // Verify JS files contain image data (base64 data URLs)
    jsFiles.forEach((file) => {
      const filePath = join(distDir, file)
      const content = readFileSync(filePath, 'utf-8')

      // Should contain base64 image data
      expect(content).toMatch(/data:image\/(png|jpeg);base64/)
    })
  })

  it('shows compression summary (CLI available)', () => {
    const result = execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
      encoding: 'utf-8',
    })

    // Check for summary output (D-09)
    expect(result).toMatch(/tinyimg|Compressed|compressed/)
    expect(result).toMatch(/images?|KB|bytes/)
  })

  it('skips compression in development mode (CLI available)', () => {
    // Clean dist first
    execSync('rm -rf dist', { cwd: fixtureDir, shell: true })

    // In dev mode, plugin should skip compression
    const result = execSync('webpack', {
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

  it('uses cache on second build (CLI available)', () => {
    // Clean dist first
    execSync('rm -rf dist', { cwd: fixtureDir, shell: true })

    // First build
    execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    })

    // Second build (should use cache)
    const result = execSync('webpack', {
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
