import { Buffer } from 'node:buffer'
import process from 'node:process'
import { compressImage, loadKeys } from '@pz4l/tinyimg-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import tinyimgUnplugin from './index'

// Mock the core modules
vi.mock('@pz4l/tinyimg-core', async () => {
  const actual = await vi.importActual('@pz4l/tinyimg-core')
  return {
    ...actual,
    compressImage: vi.fn(),
    loadKeys: vi.fn(() => [{ key: 'test-key-1' }, { key: 'test-key-2' }]),
  }
})

describe('tinyimg-unplugin', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(compressImage).mockReset()
    // Reset NODE_ENV
    delete process.env.NODE_ENV
  })

  it('creates unplugin factory', () => {
    // The default export is the result of createUnplugin()
    // which returns an object with raw, vite, webpack as getter functions
    expect(tinyimgUnplugin).toBeDefined()
    expect(typeof tinyimgUnplugin.raw).toBe('function')
    expect(typeof tinyimgUnplugin.vite).toBe('function')
    expect(typeof tinyimgUnplugin.webpack).toBe('function')
  })

  it('returns plugin with transform hook', () => {
    const plugin = tinyimgUnplugin.raw()

    expect(plugin).toBeDefined()
    expect(plugin.name).toBe('tinyimg-unplugin')
    expect(typeof plugin.transform).toBe('function')
    expect(typeof plugin.buildEnd).toBe('function')
  })

  it('skips non-image files', async () => {
    const plugin = tinyimgUnplugin.raw()
    const result = await plugin.transform('console.log("hello")', '/path/to/file')

    expect(result).toBeNull()
  })

  it('compresses PNG/JPG/JPEG files in production', async () => {
    const mockCompressedBuffer = Buffer.from('compressed-image-data')
    const mockResult = {
      buffer: mockCompressedBuffer,
      meta: {
        cached: false,
        compressorName: 'api',
        originalSize: Buffer.from('original-image-data').length,
        compressedSize: mockCompressedBuffer.length,
      },
    }

    vi.mocked(compressImage).mockResolvedValue(mockResult)

    const plugin = tinyimgUnplugin.raw()

    // Set NODE_ENV to production as fallback
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      // Call transform with proper 'this' context
      const result = await plugin.transform.call(
        { config: { isBuild: true } }, // Vite context
        Buffer.from('original-image-data'),
        '/path/to/image.png',
      )

      expect(compressImage).toHaveBeenCalledWith(
        Buffer.from('original-image-data'),
        expect.objectContaining({
          projectCacheOnly: true,
        }),
      )
      expect(result).toEqual({
        code: mockCompressedBuffer,
        map: null,
      })
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('skips compression in development', async () => {
    const plugin = tinyimgUnplugin.raw()

    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    try {
      const result = await plugin.transform.call(
        { config: { isBuild: false } }, // Vite development context
        Buffer.from('original-image-data'),
        '/path/to/image.png',
      )

      expect(compressImage).not.toHaveBeenCalled()
      expect(result).toBeNull()
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('uses project-only cache', async () => {
    const mockCompressedBuffer = Buffer.from('compressed-image-data')
    const mockResult = {
      buffer: mockCompressedBuffer,
      meta: {
        cached: false,
        compressorName: 'api',
        originalSize: Buffer.from('original-image-data').length,
        compressedSize: mockCompressedBuffer.length,
      },
    }

    vi.mocked(compressImage).mockResolvedValue(mockResult)

    const plugin = tinyimgUnplugin.raw()

    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      await plugin.transform.call(
        { config: { isBuild: true } },
        Buffer.from('original-image-data'),
        '/path/to/image.png',
      )

      // Verify compressImage was called with projectCacheOnly: true
      expect(compressImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          projectCacheOnly: true,
        }),
      )
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('validates TINYPNG_KEYS at initialization', () => {
    vi.mocked(loadKeys).mockReturnValueOnce([])

    expect(() => {
      tinyimgUnplugin.raw()
    }).toThrow('TINYPNG_KEYS environment variable is required')
  })

  it('handles errors in non-strict mode', async () => {
    const mockError = new Error('All keys exhausted')
    vi.mocked(compressImage).mockRejectedValue(mockError)

    // Create plugin with strict: false (default)
    const plugin = tinyimgUnplugin.raw({ strict: false })

    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      const result = await plugin.transform.call(
        { config: { isBuild: true } },
        Buffer.from('original-image-data'),
        '/path/to/image.png',
      )

      // In non-strict mode, should return null to use original file
      expect(result).toBeNull()
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('handles errors in strict mode', async () => {
    const mockError = new Error('All keys exhausted')
    vi.mocked(compressImage).mockRejectedValue(mockError)

    // Create plugin with strict: true
    const plugin = tinyimgUnplugin.raw({ strict: true })

    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      await expect(
        plugin.transform.call(
          { config: { isBuild: true } },
          Buffer.from('original-image-data'),
          '/path/to/image.png',
        ),
      ).rejects.toThrow('All keys exhausted')
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  describe('terminalLogger integration', () => {
    it('logs compression result in normal mode', async () => {
      const mockCompressedBuffer = Buffer.from('compressed-image-data')
      const mockResult = {
        buffer: mockCompressedBuffer,
        meta: {
          cached: false,
          compressorName: 'api',
          originalSize: 100,
          compressedSize: 50,
        },
      }

      vi.mocked(compressImage).mockResolvedValue(mockResult)

      const plugin = tinyimgUnplugin.raw()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        await plugin.transform.call(
          { config: { isBuild: true } },
          Buffer.from('original-image-data'),
          '/path/to/image.png',
        )

        expect(consoleSpy).toHaveBeenCalled()
        const calls = consoleSpy.mock.calls
        const successCall = calls.find(call => call[0]?.includes?.('✓'))
        expect(successCall).toBeDefined()
        expect(successCall![0]).toContain('image')
      }
      finally {
        process.env.NODE_ENV = originalEnv
        consoleSpy.mockRestore()
      }
    })

    it('logs cache hit when meta.cached is true', async () => {
      const mockCompressedBuffer = Buffer.from('compressed-image-data')
      const mockResult = {
        buffer: mockCompressedBuffer,
        meta: {
          cached: true,
          compressorName: null,
          originalSize: 100,
          compressedSize: 100,
        },
      }

      vi.mocked(compressImage).mockResolvedValue(mockResult)

      const plugin = tinyimgUnplugin.raw()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        await plugin.transform.call(
          { config: { isBuild: true } },
          Buffer.from('original-image-data'),
          '/path/to/cached.png',
        )

        expect(consoleSpy).toHaveBeenCalled()
        const calls = consoleSpy.mock.calls
        const cacheCall = calls.find(call => call[0]?.includes?.('cached'))
        expect(cacheCall).toBeDefined()
      }
      finally {
        process.env.NODE_ENV = originalEnv
        consoleSpy.mockRestore()
      }
    })

    it('logs error in normal mode on failure', async () => {
      const mockError = new Error('Compression failed')
      vi.mocked(compressImage).mockRejectedValue(mockError)

      const plugin = tinyimgUnplugin.raw({ strict: false })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        await plugin.transform.call(
          { config: { isBuild: true } },
          Buffer.from('original-image-data'),
          '/path/to/error.png',
        )

        expect(consoleSpy).toHaveBeenCalled()
        const calls = consoleSpy.mock.calls
        const errorCall = calls.find(call => call[0]?.includes?.('Compression failed'))
        expect(errorCall).toBeDefined()
      }
      finally {
        process.env.NODE_ENV = originalEnv
        consoleSpy.mockRestore()
      }
    })

    it('buildEnd logs summary', async () => {
      const mockCompressedBuffer = Buffer.from('compressed-image-data')
      const mockResult = {
        buffer: mockCompressedBuffer,
        meta: {
          cached: false,
          compressorName: 'api',
          originalSize: 100,
          compressedSize: 50,
        },
      }

      vi.mocked(compressImage).mockResolvedValue(mockResult)

      const plugin = tinyimgUnplugin.raw()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        // First do a compression to populate stats
        await plugin.transform.call(
          { config: { isBuild: true } },
          Buffer.from('original-image-data'),
          '/path/to/image.png',
        )

        // Reset spy to only capture buildEnd output
        consoleSpy.mockClear()

        // Call buildEnd
        plugin.buildEnd()

        expect(consoleSpy).toHaveBeenCalled()
        const calls = consoleSpy.mock.calls
        const summaryCall = calls.find(call => call[0]?.includes?.('Compression complete'))
        expect(summaryCall).toBeDefined()
      }
      finally {
        process.env.NODE_ENV = originalEnv
        consoleSpy.mockRestore()
      }
    })

    it('respects quiet level and suppresses success logs', async () => {
      const mockCompressedBuffer = Buffer.from('compressed-image-data')
      const mockResult = {
        buffer: mockCompressedBuffer,
        meta: {
          cached: false,
          compressorName: 'api',
          originalSize: 100,
          compressedSize: 50,
        },
      }

      vi.mocked(compressImage).mockResolvedValue(mockResult)

      // Create plugin with quiet level
      const plugin = tinyimgUnplugin.raw({ level: 'quiet' })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        await plugin.transform.call(
          { config: { isBuild: true } },
          Buffer.from('original-image-data'),
          '/path/to/image.png',
        )

        // In quiet mode, success logs should be suppressed
        const successCalls = consoleSpy.mock.calls.filter(call => call[0]?.includes?.('✓'))
        expect(successCalls.length).toBe(0)
      }
      finally {
        process.env.NODE_ENV = originalEnv
        consoleSpy.mockRestore()
      }
    })

    it('logs verbose info when level is verbose', async () => {
      const mockCompressedBuffer = Buffer.from('compressed-image-data')
      const mockResult = {
        buffer: mockCompressedBuffer,
        meta: {
          cached: false,
          compressorName: 'api',
          originalSize: 100,
          compressedSize: 50,
        },
      }

      vi.mocked(compressImage).mockResolvedValue(mockResult)

      // Create plugin with verbose level
      const plugin = tinyimgUnplugin.raw({ level: 'verbose' })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        await plugin.transform.call(
          { config: { isBuild: true } },
          Buffer.from('original-image-data'),
          '/path/to/image.png',
        )

        // In verbose mode, should log compressor name
        const verboseCalls = consoleSpy.mock.calls.filter(call =>
          call[0]?.includes?.('compressor:'),
        )
        expect(verboseCalls.length).toBeGreaterThan(0)
      }
      finally {
        process.env.NODE_ENV = originalEnv
        consoleSpy.mockRestore()
      }
    })
  })
})
