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
})
