import fs from 'node:fs/promises'
import process from 'node:process'
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
vi.mock('../utils/logger', () => ({
  logger: {
    setLevel: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
    listItem: vi.fn(),
  },
}))

describe('list command', () => {
  let processExitSpy: any
  let logger: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset fs.stat mock to clear any previous mockResolvedValueOnce calls
    vi.mocked(fs.stat).mockReset()
    // Mock process.exit for each test
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    // Get mocked logger
    const loggerModule = await import('../utils/logger')
    logger = loggerModule.logger
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

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No valid image files found'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('displays each file with its size', async () => {
    const { expandInputs } = await import('../utils/files')
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

    vi.mocked(expandInputs).mockResolvedValue(['/project/src/a.png', '/project/src/b.png'])
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ size: 1024 } as any)
      .mockResolvedValueOnce({ size: 2048 } as any)

    await listCommand(['./src'], {})

    expect(logger.listItem).toHaveBeenCalledWith('src/a.png', 1024)
    expect(logger.listItem).toHaveBeenCalledWith('src/b.png', 2048)

    cwdSpy.mockRestore()
  })

  it('displays summary with file count and total size', async () => {
    const { expandInputs } = await import('../utils/files')
    vi.mocked(expandInputs).mockResolvedValue(['/path/a.png', '/path/b.png'])
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ size: 1024 } as any)
      .mockResolvedValueOnce({ size: 2048 } as any)

    await listCommand(['./src'], {})

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Compressible images'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('2 files'))
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('3KB'))
  })

  it('sorts files by path alphabetically', async () => {
    const { expandInputs } = await import('../utils/files')
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

    vi.mocked(expandInputs).mockResolvedValue(['/project/z.png', '/project/a.png'])
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ size: 1024 } as any)
      .mockResolvedValueOnce({ size: 2048 } as any)

    await listCommand(['./src'], {})

    // Verify listItem is called with files in alphabetical order
    const calls = logger.listItem.mock.calls
    expect(calls[0][0]).toBe('a.png')
    expect(calls[1][0]).toBe('z.png')

    cwdSpy.mockRestore()
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

      // Should display the full relative path using listItem
      expect(logger.listItem).toHaveBeenCalledWith('src/images/logo.png', 1024)

      cwdSpy.mockRestore()
    })

    it('displays just filename for files in root directory', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue(['/project/image.png'])
      vi.mocked(fs.stat).mockResolvedValue({ size: 2048 } as any)

      await listCommand(['.'], {})

      expect(logger.listItem).toHaveBeenCalledWith('image.png', 2048)

      cwdSpy.mockRestore()
    })

    it('displays traversal paths for files outside cwd', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue(['/other/dir/image.png'])
      vi.mocked(fs.stat).mockResolvedValue({ size: 512 } as any)

      await listCommand(['.'], {})

      expect(logger.listItem).toHaveBeenCalledWith('../other/dir/image.png', 512)

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

      const calls = logger.listItem.mock.calls

      // Alphabetical order: src/b.png < src/images/a.png < z.png
      expect(calls[0][0]).toBe('src/b.png')
      expect(calls[1][0]).toBe('src/images/a.png')
      expect(calls[2][0]).toBe('z.png')

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

      // Should show both PNG and JPG files using listItem
      expect(logger.listItem).toHaveBeenCalledWith('image1.png', 1024)
      expect(logger.listItem).toHaveBeenCalledWith('image2.jpg', 2048)
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
      // Note: fs.stat is called for files that pass the alpha filter
      // Only without-alpha.png will have stat called since with-alpha.png is filtered out
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 2048 } as any)
      vi.mocked(detectAlphas).mockResolvedValue(
        new Map([
          ['/project/with-alpha.png', true], // has alpha
          ['/project/without-alpha.png', false], // no alpha
        ]),
      )

      await listCommand(['./src'], { convertible: true })

      // Should only show PNG without alpha using listItem
      expect(logger.listItem).toHaveBeenCalledWith('without-alpha.png', 2048)
      expect(logger.listItem).not.toHaveBeenCalledWith('with-alpha.png', expect.any(Number))
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

      // Should only show PNG using listItem, not JPG/JPEG
      expect(logger.listItem).toHaveBeenCalledWith('image.png', 1024)
      expect(logger.listItem).not.toHaveBeenCalledWith('image.jpg', expect.any(Number))
      expect(logger.listItem).not.toHaveBeenCalledWith('image.jpeg', expect.any(Number))
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

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No convertible PNG files found'))

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

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No PNG files found'))

      cwdSpy.mockRestore()
    })
  })

  describe('logger integration', () => {
    it('uses logger.listItem for each file with size-based coloring', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      vi.mocked(expandInputs).mockResolvedValue([
        '/project/small.png',
        '/project/medium.png',
        '/project/large.png',
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 100 * 1024 } as any) // 100KB - green
        .mockResolvedValueOnce({ size: 500 * 1024 } as any) // 500KB - cyan
        .mockResolvedValueOnce({ size: 2 * 1024 * 1024 } as any) // 2MB - red

      await listCommand(['./src'], {})

      // Verify listItem is called for each file with correct size
      expect(logger.listItem).toHaveBeenCalledTimes(3)
      expect(logger.listItem).toHaveBeenCalledWith('small.png', 100 * 1024)
      expect(logger.listItem).toHaveBeenCalledWith('medium.png', 500 * 1024)
      expect(logger.listItem).toHaveBeenCalledWith('large.png', 2 * 1024 * 1024)

      cwdSpy.mockRestore()
    })

    it('calls listItem with correct size for color threshold testing', async () => {
      const { expandInputs } = await import('../utils/files')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/project')

      // Test all 5 color thresholds
      vi.mocked(expandInputs).mockResolvedValue([
        '/project/t1.png', // <300KB - green
        '/project/t2.png', // 300-600KB - cyan
        '/project/t3.png', // 600KB-1MB - yellow
        '/project/t4.png', // 1-1.5MB - magenta
        '/project/t5.png', // >1.5MB - red
      ])
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 200 * 1024 } as any)
        .mockResolvedValueOnce({ size: 400 * 1024 } as any)
        .mockResolvedValueOnce({ size: 800 * 1024 } as any)
        .mockResolvedValueOnce({ size: 1.2 * 1024 * 1024 } as any)
        .mockResolvedValueOnce({ size: 2 * 1024 * 1024 } as any)

      await listCommand(['./src'], {})

      // Verify all sizes are passed correctly to listItem
      expect(logger.listItem).toHaveBeenCalledWith('t1.png', 200 * 1024)
      expect(logger.listItem).toHaveBeenCalledWith('t2.png', 400 * 1024)
      expect(logger.listItem).toHaveBeenCalledWith('t3.png', 800 * 1024)
      expect(logger.listItem).toHaveBeenCalledWith('t4.png', 1.2 * 1024 * 1024)
      expect(logger.listItem).toHaveBeenCalledWith('t5.png', 2 * 1024 * 1024)

      cwdSpy.mockRestore()
    })

    it('uses logger.info for title and summary', async () => {
      const { expandInputs } = await import('../utils/files')
      vi.mocked(expandInputs).mockResolvedValue(['/path/a.png'])
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any)

      await listCommand(['./src'], {})

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Compressible images'))
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Total:'))
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1 files'))
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1KB'))
    })

    it('uses logger.warn when no files found', async () => {
      const { expandInputs } = await import('../utils/files')
      vi.mocked(expandInputs).mockResolvedValue([])

      await listCommand(['./src'], {})

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No valid image files found'))
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Supported formats'))
    })
  })
})
