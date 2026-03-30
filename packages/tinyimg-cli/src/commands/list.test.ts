import fs from 'node:fs/promises'
import process from 'node:process'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listCommand } from './list'

// Mock dependencies
vi.mock('../utils/files', () => ({
  expandInputs: vi.fn(),
}))
vi.mock('node:fs/promises')
vi.mock('@pz4l/tinyimg-core', () => ({
  detectAlphas: vi.fn(),
}))

describe('list command', () => {
  let consoleErrorSpy: any
  let consoleLogSpy: any
  let processExitSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console and process.exit for each test
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to current directory when no inputs provided', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any)

    await listCommand([], {})

    expect(expandInputs).toHaveBeenCalledWith(['.'])
  })

  it('passes inputs to expandInputs', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue(['/path/to/image.png'])
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any)

    await listCommand(['./src'], {})

    expect(expandInputs).toHaveBeenCalledWith(['./src'])
  })

  it('exits with error when no image files found', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue([])

    await listCommand(['./src'], {})

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No valid image files found'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('displays each file with its size', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue(['/path/a.png', '/path/b.png'])
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ size: 1024 } as any)
      .mockResolvedValueOnce({ size: 2048 } as any)

    await listCommand(['./src'], {})

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('a.png'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('b.png'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1KB'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2KB'))
  })

  it('displays summary with file count and total size', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue(['/path/a.png', '/path/b.png'])
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ size: 1024 } as any)
      .mockResolvedValueOnce({ size: 2048 } as any)

    await listCommand(['./src'], {})

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2 files'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('3KB'))
  })

  it('sorts files by path alphabetically', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue(['/path/z.png', '/path/a.png'])
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ size: 1024 } as any)
      .mockResolvedValueOnce({ size: 2048 } as any)

    await listCommand(['./src'], {})

    const calls = consoleLogSpy.mock.calls
    const aIndex = calls.findIndex(call => call[0]?.includes('a.png'))
    const zIndex = calls.findIndex(call => call[0]?.includes('z.png'))
    expect(aIndex).toBeLessThan(zIndex)
  })

  it('handles stat errors gracefully', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue(['/path/a.png'])
    vi.mocked(fs.stat).mockRejectedValue(new Error('Stat failed'))

    await expect(listCommand(['./src'], {})).rejects.toThrow('Stat failed')
  })

  describe('relative path display', () => {
    it('displays relative path for files in subdirectories', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue(['/project/src/images/logo.png'])
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any)

      await listCommand(['./src'], {})

      // Should display the full relative path, not just the basename
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('src/images/logo.png -'))
      // Should NOT display just "logo.png -" (the basename format)
      const calls = consoleLogSpy.mock.calls.map(call => call[0])
      const hasBasenameOnly = calls.some(call => call.includes('logo.png -') && !call.includes('src/images/logo.png'))
      expect(hasBasenameOnly).toBe(false)

      cwdSpy.mockRestore()
    })

    it('displays just filename for files in root directory', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue(['/project/image.png'])
      vi.mocked(fs.stat).mockResolvedValue({ size: 2048 } as any)

      await listCommand(['.'], {})

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('image.png'))

      cwdSpy.mockRestore()
    })

    it('displays traversal paths for files outside cwd', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue(['/other/dir/image.png'])
      vi.mocked(fs.stat).mockResolvedValue({ size: 512 } as any)

      await listCommand(['.'], {})

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('../other/dir/image.png'))

      cwdSpy.mockRestore()
    })

    it('sorts files by relative path alphabetically', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue([
        '/project/z.png',
        '/project/src/images/a.png',
        '/project/src/b.png',
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any)
        .mockResolvedValueOnce({ size: 512 } as any)

      await listCommand(['.'], {})

      const calls = consoleLogSpy.mock.calls
      const srcBIndex = calls.findIndex(call => call[0]?.includes('src/b.png'))
      const srcImagesIndex = calls.findIndex(call => call[0]?.includes('src/images/a.png'))
      const zIndex = calls.findIndex(call => call[0]?.includes('z.png'))

      // Alphabetical order: src/b.png < src/images/a.png < z.png
      expect(srcBIndex).toBeLessThan(srcImagesIndex)
      expect(srcImagesIndex).toBeLessThan(zIndex)

      cwdSpy.mockRestore()
    })
  })

  describe('--convertible flag', () => {
    it('shows all files when --convertible is not set', async () => {
      const { expandInputs } = await import('../utils/files')
      const { detectAlphas } = await import('@pz4l/tinyimg-core')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue([
        '/project/image1.png',
        '/project/image2.jpg',
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any)
      vi.mocked(detectAlphas).mockResolvedValue(new Map())

      await listCommand(['./src'], {})

      // Should show both PNG and JPG files
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('image1.png'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('image2.jpg'))
      expect(detectAlphas).not.toHaveBeenCalled()

      cwdSpy.mockRestore()
    })

    it('filters to only non-alpha PNGs when --convertible is set', async () => {
      const { expandInputs } = await import('../utils/files')
      const { detectAlphas } = await import('@pz4l/tinyimg-core')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue([
        '/project/with-alpha.png',
        '/project/without-alpha.png',
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any)
      vi.mocked(detectAlphas).mockResolvedValue(
        new Map([
          ['/project/with-alpha.png', true], // has alpha
          ['/project/without-alpha.png', false], // no alpha
        ]),
      )

      await listCommand(['./src'], { convertible: true })

      // Should only show PNG without alpha
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('without-alpha.png'))
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('with-alpha.png'))
      expect(detectAlphas).toHaveBeenCalledWith(
        ['/project/with-alpha.png', '/project/without-alpha.png'],
        { concurrency: 8 },
      )

      cwdSpy.mockRestore()
    })

    it('excludes non-PNG files when --convertible is set', async () => {
      const { expandInputs } = await import('../utils/files')
      const { detectAlphas } = await import('@pz4l/tinyimg-core')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue([
        '/project/image.png',
        '/project/image.jpg',
        '/project/image.jpeg',
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any)
        .mockResolvedValueOnce({ size: 512 } as any)
      vi.mocked(detectAlphas).mockResolvedValue(
        new Map([['/project/image.png', false]]),
      )

      await listCommand(['./src'], { convertible: true })

      // Should only show PNG, not JPG/JPEG
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('image.png'))
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('image.jpg'))
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('image.jpeg'))
      // detectAlphas should only be called for PNG files
      expect(detectAlphas).toHaveBeenCalledWith(
        ['/project/image.png'],
        { concurrency: 8 },
      )

      cwdSpy.mockRestore()
    })

    it('shows message when no convertible PNGs found', async () => {
      const { expandInputs } = await import('../utils/files')
      const { detectAlphas } = await import('@pz4l/tinyimg-core')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue([
        '/project/with-alpha1.png',
        '/project/with-alpha2.png',
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any)
      vi.mocked(detectAlphas).mockResolvedValue(
        new Map([
          ['/project/with-alpha1.png', true],
          ['/project/with-alpha2.png', true],
        ]),
      )

      await listCommand(['./src'], { convertible: true })

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No convertible PNG files found'))

      cwdSpy.mockRestore()
    })

    it('shows message when no PNG files found with --convertible', async () => {
      const { expandInputs } = await import('../utils/files')
      const { detectAlphas } = await import('@pz4l/tinyimg-core')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue([
        '/project/image1.jpg',
        '/project/image2.jpeg',
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any)
      vi.mocked(detectAlphas).mockResolvedValue(new Map())

      await listCommand(['./src'], { convertible: true })

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No PNG files found'))

      cwdSpy.mockRestore()
    })
  })
})
