import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import { compressCommand } from './compress.js'
import { compressImages, AllKeysExhaustedError, NoValidKeysError, AllCompressionFailedError } from 'tinyimg-core'

// Mock dependencies
vi.mock('tinyimg-core')
vi.mock('node:fs/promises')

describe('compress command', () => {
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

  it('exits with error when no inputs provided', async () => {
    await compressCommand([], {})
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No input files specified'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('exits with error when no image files found', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('not found'))

    await compressCommand(['nonexistent.txt'], {})
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No valid image files found'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('expands inputs to file list', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockResolvedValue([Buffer.from('compressed')])

    await compressCommand(['image.png'], {})

    expect(compressImages).toHaveBeenCalledWith(
      [Buffer.from('png')],
      expect.objectContaining({
        cache: true,
        concurrency: 8,
      })
    )
  })

  it('displays configuration (mode, parallel, cache, files)', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockResolvedValue([Buffer.from('compressed')])

    await compressCommand(['image.png'], { mode: 'random', parallel: '4', cache: true })

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration:'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Mode: random'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Parallel: 4'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cache: enabled'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Files: 1'))
  })

  it('reads all input files into buffers', async () => {
    const file1Buffer = Buffer.from('image1')
    const file2Buffer = Buffer.from('image2')

    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(file1Buffer)
      .mockResolvedValueOnce(file2Buffer)
    vi.mocked(compressImages).mockResolvedValue([Buffer.from('compressed1'), Buffer.from('compressed2')])

    await compressCommand(['image1.png', 'image2.jpg'], {})

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('image1.png'))
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('image2.jpg'))
  })

  it('calls compressImages with correct options', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockResolvedValue([Buffer.from('compressed')])

    await compressCommand(['image.png'], {
      mode: 'round-robin',
      parallel: '16',
      cache: false,
    })

    expect(compressImages).toHaveBeenCalledWith(
      [Buffer.from('png')],
      expect.objectContaining({
        cache: false,
        concurrency: 16,
        mode: 'round-robin',
      })
    )
  })

  it('writes compressed files to output locations', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('original'))
    vi.mocked(compressImages).mockResolvedValue([Buffer.from('compressed')])
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)

    await compressCommand(['image.png'], {})

    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('image.png'), Buffer.from('compressed'))
  })

  it('handles AllKeysExhaustedError', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockRejectedValue(new AllKeysExhaustedError('All keys exhausted'))

    await compressCommand(['image.png'], {})

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('All API keys have exhausted quota'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('handles NoValidKeysError', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockRejectedValue(new NoValidKeysError('No valid keys'))

    await compressCommand(['image.png'], {})

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No valid API keys configured'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('handles AllCompressionFailedError', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockRejectedValue(new AllCompressionFailedError('All failed'))

    await compressCommand(['image.png'], {})

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('All compression methods failed'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })

  it('handles generic errors', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockRejectedValue(new Error('Generic error'))

    await compressCommand(['image.png'], {})

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Generic error'))
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
