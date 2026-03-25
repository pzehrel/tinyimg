import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'

const fixtureDir = join(__dirname, '../fixtures/webpack')
const distDir = join(fixtureDir, 'dist')

describe('Webpack Integration', () => {
  beforeAll(async () => {
    // Clean dist directory
    await rm(distDir, { recursive: true, force: true })
  })

  afterAll(async () => {
    // Clean dist directory
    await rm(distDir, { recursive: true, force: true })
  })

  test('builds fixture project successfully', () => {
    const result = execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
      encoding: 'utf-8'
    })

    expect(result).toContain('bundle.js')
  })

  test('outputs compressed images', () => {
    // First, run the build
    execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    })

    // Check that dist directory exists
    expect(existsSync(distDir)).toBe(true)

    // Check for bundle.js in output
    const files = readdirSync(distDir)
    expect(files.length).toBeGreaterThan(0)

    const jsFiles = files.filter(f => f.endsWith('.js'))
    expect(jsFiles.length).toBeGreaterThan(0)

    // Verify JS files contain image data (base64 data URLs)
    jsFiles.forEach(file => {
      const filePath = join(distDir, file)
      const content = readFileSync(filePath, 'utf-8')

      // Should contain base64 image data
      expect(content).toMatch(/data:image\/(png|jpeg);base64/)
    })
  })

  test('shows compression summary', () => {
    const result = execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
      encoding: 'utf-8'
    })

    // Check for summary output (D-09)
    expect(result).toMatch(/tinyimg|Compressed|compressed/)
    expect(result).toMatch(/images?|KB|bytes/)
  })

  test('skips compression in development mode', () => {
    // Clean dist first
    execSync('rm -rf dist', { cwd: fixtureDir, shell: true })

    // In dev mode, plugin should skip compression
    const result = execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      },
      encoding: 'utf-8'
    })

    // Should not show compression output
    expect(result).not.toMatch(/Compressing|compressing/)
  })

  test('uses cache on second build', () => {
    // Clean dist first
    execSync('rm -rf dist', { cwd: fixtureDir, shell: true })

    // First build
    execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    })

    // Second build (should use cache)
    const result = execSync('webpack', {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
      encoding: 'utf-8'
    })

    // Should indicate cache hits
    expect(result).toMatch(/cached|cache|Cache/)
  })
})
