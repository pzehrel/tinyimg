import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cleanupFixtures, createLargePng, createOpaquePngNoAlpha, createOpaquePngWithAlphaChannel, createPngWithAlpha, getFixtureDir } from '../detect/__tests__/fixtures'
import { detectAlpha, detectAlphas } from '../detect/service'

// Find the project root by looking for package.json
let projectRoot = process.cwd()
while (!existsSync(join(projectRoot, 'package.json')) || projectRoot === '/') {
  projectRoot = join(projectRoot, '..')
}

// Import from CLI package (cross-package import)
const filesUtilsPath = join(projectRoot, 'packages/tinyimg-cli/src/utils/files.ts')

/**
 * v0.3.0 Milestone Requirements Verification
 *
 * This test file serves as an automated checklist verifying all 9 v0.3.0 requirements.
 * Each requirement has at least one test case verifying its implementation.
 */

describe('v0.3.0 Milestone Requirements Verification', () => {
  beforeAll(async () => {
    // Ensure temp directory exists for cross-package tests
    const testTmpDir = join(tmpdir(), 'tinyimg-milestone-test')
    if (!existsSync(testTmpDir)) {
      mkdirSync(testTmpDir, { recursive: true })
    }

    // Ensure fixture directory exists for detect tests
    // and create all fixtures fresh to avoid cleanup conflicts
    getFixtureDir()
    await createPngWithAlpha()
    await createOpaquePngNoAlpha()
    await createOpaquePngWithAlphaChannel()
  })

  afterAll(() => {
    // Clean up fixtures
    cleanupFixtures()
  })

  describe('iMG-01: PNG Transparency Detection', () => {
    it('detectAlpha returns true for PNG with transparent pixels', async () => {
      const filePath = await createPngWithAlpha()
      const hasTransparency = await detectAlpha(filePath)
      expect(hasTransparency).toBe(true)
    })

    it('detectAlpha returns false for opaque PNG without alpha channel', async () => {
      const filePath = await createOpaquePngNoAlpha()
      const hasTransparency = await detectAlpha(filePath)
      expect(hasTransparency).toBe(false)
    })

    it('detectAlpha returns false for opaque PNG with alpha channel metadata', async () => {
      const filePath = await createOpaquePngWithAlphaChannel()
      const hasTransparency = await detectAlpha(filePath)
      expect(hasTransparency).toBe(false)
    })

    it('detectAlpha completes under 2 seconds for large PNG', async () => {
      const filePath = await createLargePng()
      const start = Date.now()
      await detectAlpha(filePath)
      const duration = Date.now() - start
      expect(duration).toBeLessThan(2000)
    })

    it('detectAlphas handles batch with mixed transparency', async () => {
      // Create fixtures in a dedicated directory to avoid conflicts
      const testDir = join(tmpdir(), 'tinyimg-milestone-batch-test')
      mkdirSync(testDir, { recursive: true })

      const transparentPath = join(testDir, 'transparent.png')
      const opaquePath = join(testDir, 'opaque.png')
      const jpgPath = join(testDir, 'test.jpg')

      await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).png().toFile(transparentPath)
      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } } }).png().toFile(opaquePath)
      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toFile(jpgPath)

      const results = await detectAlphas([transparentPath, opaquePath, jpgPath])

      expect(results.get(transparentPath)).toBe(true)
      expect(results.get(opaquePath)).toBe(false)
      expect(results.get(jpgPath)).toBe(false)

      // Clean up
      rmSync(testDir, { recursive: true, force: true })
    })
  })

  describe('fMT-01: AVIF/WebP Format Support', () => {
    // Dynamically import files.ts to avoid module resolution issues
    it('isImageFile accepts .webp extension', async () => {
      // Import dynamically
      const filesModule = await import(filesUtilsPath)
      const isImageFile = filesModule.isImageFile as (path: string) => boolean

      expect(isImageFile('image.webp')).toBe(true)
    })

    it('isImageFile accepts .avif extension', async () => {
      const filesModule = await import(filesUtilsPath)
      const isImageFile = filesModule.isImageFile as (path: string) => boolean

      expect(isImageFile('image.avif')).toBe(true)
    })

    it('isImageFile is case-insensitive', async () => {
      const filesModule = await import(filesUtilsPath)
      const isImageFile = filesModule.isImageFile as (path: string) => boolean

      expect(isImageFile('image.WEBP')).toBe(true)
      expect(isImageFile('image.AVIF')).toBe(true)
    })

    it('isImageFile rejects non-image extensions', async () => {
      const filesModule = await import(filesUtilsPath)
      const isImageFile = filesModule.isImageFile as (path: string) => boolean

      expect(isImageFile('image.gif')).toBe(false)
      expect(isImageFile('image.pdf')).toBe(false)
    })
  })

  describe('fMT-02: Multiple Input Paths', () => {
    it('expandInputs processes multiple file paths', async () => {
      const filesModule = await import(filesUtilsPath)
      const expandInputs = filesModule.expandInputs as (inputs: string[]) => Promise<string[]>

      // Create test files
      const testDir = join(tmpdir(), 'tinyimg-milestone-test')
      const file1 = join(testDir, 'test1.png')
      const file2 = join(testDir, 'test2.jpg')

      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toFile(file1)
      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toFile(file2)

      const results = await expandInputs([file1, file2])
      expect(results).toContain(file1)
      expect(results).toContain(file2)
      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('expandInputs processes directory paths', async () => {
      const filesModule = await import(filesUtilsPath)
      const expandInputs = filesModule.expandInputs as (inputs: string[]) => Promise<string[]>

      // Create test directory with images
      const testDir = join(tmpdir(), 'tinyimg-milestone-dir-test')
      mkdirSync(testDir, { recursive: true })

      const file1 = join(testDir, 'image1.png')
      const file2 = join(testDir, 'image2.jpg')

      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toFile(file1)
      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toFile(file2)

      const results = await expandInputs([testDir])
      expect(results.length).toBeGreaterThanOrEqual(2)

      // Clean up
      rmSync(testDir, { recursive: true, force: true })
    })

    it('expandInputs processes glob patterns', async () => {
      const filesModule = await import(filesUtilsPath)
      const expandInputs = filesModule.expandInputs as (inputs: string[]) => Promise<string[]>

      // Create test directory with images
      const testDir = join(tmpdir(), 'tinyimg-glob-test')
      mkdirSync(testDir, { recursive: true })

      const file1 = join(testDir, 'test.png')
      const file2 = join(testDir, 'test.jpg')

      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toFile(file1)
      await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toFile(file2)

      const results = await expandInputs([`${testDir}/*.png`])
      expect(results.length).toBeGreaterThanOrEqual(1)

      // Clean up
      rmSync(testDir, { recursive: true, force: true })
    })
  })

  describe('iMG-02: PNG to JPG Conversion Infrastructure', () => {
    it('detectAlpha is exported from @pz4l/tinyimg-core', async () => {
      // Import should succeed
      const { detectAlpha: importedDetectAlpha } = await import('@pz4l/tinyimg-core')
      expect(importedDetectAlpha).toBeDefined()
      expect(typeof importedDetectAlpha).toBe('function')
    })

    it('sharp can convert opaque PNG buffer to JPG', async () => {
      // Create opaque PNG
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer()

      // Convert to JPEG
      const jpgBuffer = await sharp(pngBuffer).jpeg().toBuffer()

      expect(jpgBuffer).toBeDefined()
      expect(jpgBuffer.length).toBeGreaterThan(0)
    })

    it('conversion respects quality parameter', async () => {
      // Create opaque PNG
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer()

      // Convert at different quality levels
      const lowQuality = await sharp(pngBuffer).jpeg({ quality: 10 }).toBuffer()
      const highQuality = await sharp(pngBuffer).jpeg({ quality: 100 }).toBuffer()

      // Higher quality should produce larger file
      expect(highQuality.length).toBeGreaterThan(lowQuality.length)
    })
  })

  describe('cLI-01/02: List Command Infrastructure', () => {
    it('listCommand is importable from commands/list', async () => {
      const listModule = await import(join(projectRoot, 'packages/tinyimg-cli/src/commands/list.ts'))
      const listCommand = listModule.listCommand
      expect(listCommand).toBeDefined()
      expect(typeof listCommand).toBe('function')
    })

    it('expandInputs is importable from utils/files', async () => {
      const filesModule = await import(filesUtilsPath)
      const expandInputs = filesModule.expandInputs
      expect(expandInputs).toBeDefined()
      expect(typeof expandInputs).toBe('function')
    })

    it('formatBytes is importable from utils/format', async () => {
      const formatModule = await import(join(projectRoot, 'packages/tinyimg-cli/src/utils/format.ts'))
      const formatBytes = formatModule.formatBytes
      expect(formatBytes).toBeDefined()
      expect(typeof formatBytes).toBe('function')
    })
  })

  describe('iNFRA-01: Pre-commit Hooks', () => {
    it('.husky/pre-commit file exists', () => {
      const preCommitPath = join(projectRoot, '.husky/pre-commit')
      expect(existsSync(preCommitPath)).toBe(true)
    })

    it('.lintstagedrc.json contains eslint config', () => {
      const lintStagedPath = join(projectRoot, '.lintstagedrc.json')
      expect(existsSync(lintStagedPath)).toBe(true)

      const content = readFileSync(lintStagedPath, 'utf-8')
      const config = JSON.parse(content)

      expect(config).toHaveProperty('*.{ts,tsx,js,jsx}')
      expect(config['*.{ts,tsx,js,jsx}']).toContain('eslint --fix')
    })

    it('husky prepare script exists in package.json', () => {
      const packageJsonPath = join(projectRoot, 'package.json')
      const content = readFileSync(packageJsonPath, 'utf-8')
      const pkg = JSON.parse(content)

      expect(pkg.scripts).toHaveProperty('prepare')
      expect(pkg.scripts.prepare).toContain('husky')
    })
  })

  describe('iNFRA-02: CI Test Matrix', () => {
    it('test-matrix.yml workflow file exists', () => {
      const workflowPath = join(projectRoot, '.github/workflows/test-matrix.yml')
      expect(existsSync(workflowPath)).toBe(true)
    })

    it('test matrix includes Node 20, 22', () => {
      const workflowPath = join(projectRoot, '.github/workflows/test-matrix.yml')
      const content = readFileSync(workflowPath, 'utf-8')

      expect(content).toContain('node-version: [20, 22]')
    })
  })

  describe('iNFRA-03: Publish Prevention', () => {
    it('.npmrc does not exist (prepublishOnly provides protection)', () => {
      const npmrcPath = join(projectRoot, '.npmrc')
      expect(existsSync(npmrcPath)).toBe(false)
    })

    it('prepublishOnly script exists in package.json', () => {
      const packageJsonPath = join(projectRoot, 'package.json')
      const content = readFileSync(packageJsonPath, 'utf-8')
      const pkg = JSON.parse(content)

      expect(pkg.scripts).toHaveProperty('prepublishOnly')
      expect(pkg.scripts.prepublishOnly).toContain('$CI')
    })
  })
})
