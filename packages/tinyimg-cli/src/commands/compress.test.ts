import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import process from 'node:process'
import { AllCompressionFailedError, AllKeysExhaustedError, compressImages, readConfig } from '@pz4l/tinyimg-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compressCommand } from './compress'

// Mock dependencies
vi.mock('@pz4l/tinyimg-core')
vi.mock('node:fs/promises')
vi.mock('./convert', () => ({
  convertCommand: vi.fn(),
}))

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
    // Mock readConfig to return empty keys by default
    vi.mocked(readConfig).mockReturnValue({ keys: [], version: 1 } as any)
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
    vi.mocked(compressImages).mockResolvedValue([{
      buffer: Buffer.from('compressed'),
      meta: {
        cached: false,
        compressorName: 'TinyPngApiCompressor',
        originalSize: 3,
        compressedSize: 2,
      },
    }])

    await compressCommand(['image.png'], {})

    expect(compressImages).toHaveBeenCalledWith(
      [Buffer.from('png')],
      expect.objectContaining({
        cache: true,
        concurrency: 8,
      }),
    )
  })

  it('displays configuration (mode, parallel, cache, files)', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockResolvedValue([{
      buffer: Buffer.from('compressed'),
      meta: {
        cached: false,
        compressorName: 'TinyPngApiCompressor',
        originalSize: 3,
        compressedSize: 2,
      },
    }])

    await compressCommand(['image.png'], { mode: 'random', parallel: '4', cache: true })

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration'))
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
    vi.mocked(compressImages).mockResolvedValue([
      { buffer: Buffer.from('compressed1'), meta: { cached: false, compressorName: 'TinyPngApiCompressor', originalSize: 6, compressedSize: 4 } },
      { buffer: Buffer.from('compressed2'), meta: { cached: false, compressorName: 'TinyPngApiCompressor', originalSize: 6, compressedSize: 4 } },
    ])

    await compressCommand(['image1.png', 'image2.jpg'], {})

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('image1.png'))
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('image2.jpg'))
  })

  it('calls compressImages with correct options', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockResolvedValue([{
      buffer: Buffer.from('compressed'),
      meta: {
        cached: false,
        compressorName: 'TinyPngApiCompressor',
        originalSize: 3,
        compressedSize: 2,
      },
    }])

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
      }),
    )
  })

  it('writes compressed files to output locations', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('original'))
    vi.mocked(compressImages).mockResolvedValue([{
      buffer: Buffer.from('compressed'),
      meta: {
        cached: false,
        compressorName: 'TinyPngApiCompressor',
        originalSize: 8,
        compressedSize: 6,
      },
    }])
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

  it('calls convertCommand when --convert flag is set and PNGs are present', async () => {
    const { convertCommand } = await import('./convert')

    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockResolvedValue([{
      buffer: Buffer.from('compressed'),
      meta: {
        cached: false,
        compressorName: 'TinyPngApiCompressor',
        originalSize: 3,
        compressedSize: 2,
      },
    }])
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)

    await compressCommand(['image.png'], { convert: true })

    expect(convertCommand).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('image.png')]),
      { deleteOriginal: undefined, quality: 85 },
    )
  })

  it('does not call convertCommand when --convert flag is set but no PNGs present', async () => {
    const { convertCommand } = await import('./convert')

    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('jpg'))
    vi.mocked(compressImages).mockResolvedValue([{
      buffer: Buffer.from('compressed'),
      meta: {
        cached: false,
        compressorName: 'TinyPngApiCompressor',
        originalSize: 3,
        compressedSize: 2,
      },
    }])
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)

    await compressCommand(['image.jpg'], { convert: true })

    expect(convertCommand).not.toHaveBeenCalled()
  })

  it('does not call convertCommand when --convert flag is not set', async () => {
    const { convertCommand } = await import('./convert')

    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('png'))
    vi.mocked(compressImages).mockResolvedValue([{
      buffer: Buffer.from('compressed'),
      meta: {
        cached: false,
        compressorName: 'TinyPngApiCompressor',
        originalSize: 3,
        compressedSize: 2,
      },
    }])
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)

    await compressCommand(['image.png'], {})

    expect(convertCommand).not.toHaveBeenCalled()
  })

  it('calls convertCommand with multiple PNG files', async () => {
    const { convertCommand } = await import('./convert')

    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(Buffer.from('png1'))
      .mockResolvedValueOnce(Buffer.from('png2'))
    vi.mocked(compressImages).mockResolvedValue([
      { buffer: Buffer.from('compressed1'), meta: { cached: false, compressorName: 'TinyPngApiCompressor', originalSize: 4, compressedSize: 3 } },
      { buffer: Buffer.from('compressed2'), meta: { cached: false, compressorName: 'TinyPngApiCompressor', originalSize: 4, compressedSize: 3 } },
    ])
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)

    await compressCommand(['image1.png', 'image2.png'], { convert: true })

    expect(convertCommand).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining('image1.png'),
        expect.stringContaining('image2.png'),
      ]),
      { deleteOriginal: undefined, quality: 85 },
    )
    expect(convertCommand).toHaveBeenCalledTimes(1)
  })

  it('filters only PNG files when calling convertCommand', async () => {
    const { convertCommand } = await import('./convert')

    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as any)
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce(Buffer.from('png'))
      .mockResolvedValueOnce(Buffer.from('jpg'))
      .mockResolvedValueOnce(Buffer.from('webp'))
    vi.mocked(compressImages).mockResolvedValue([
      { buffer: Buffer.from('compressed1'), meta: { cached: false, compressorName: 'TinyPngApiCompressor', originalSize: 3, compressedSize: 2 } },
      { buffer: Buffer.from('compressed2'), meta: { cached: false, compressorName: 'TinyPngApiCompressor', originalSize: 3, compressedSize: 2 } },
      { buffer: Buffer.from('compressed3'), meta: { cached: false, compressorName: 'TinyPngApiCompressor', originalSize: 3, compressedSize: 2 } },
    ])
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)

    await compressCommand(['image.png', 'image.jpg', 'image.webp'], { convert: true })

    expect(convertCommand).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('image.png')]),
      { deleteOriginal: undefined, quality: 85 },
    )
    expect(convertCommand).toHaveBeenCalledTimes(1)
  })
})
