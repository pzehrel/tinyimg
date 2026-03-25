import { describe, expect, test, vi, beforeEach } from 'vitest'
import { compressImage } from 'tinyimg-core'
import { loadKeys } from 'tinyimg-core'
import tinyimgUnplugin from './index'

// Mock the core modules
vi.mock('tinyimg-core', async () => {
  const actual = await vi.importActual('tinyimg-core')
  return {
    ...actual,
    compressImage: vi.fn(),
    loadKeys: vi.fn(() => [{ key: 'test-key-1' }, { key: 'test-key-2' }])
  }
})

describe('tinyimg-unplugin', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(compressImage).mockReset()
    // Reset NODE_ENV
    delete process.env.NODE_ENV
  })
  test('creates unplugin factory', () => {
    // The default export is the result of createUnplugin()
    // which returns an object with raw, vite, webpack as getter functions
    expect(tinyimgUnplugin).toBeDefined()
    expect(typeof tinyimgUnplugin.raw).toBe('function')
    expect(typeof tinyimgUnplugin.vite).toBe('function')
    expect(typeof tinyimgUnplugin.webpack).toBe('function')
  })

  test('returns plugin with transform hook', () => {
    const plugin = tinyimgUnplugin.raw()

    expect(plugin).toBeDefined()
    expect(plugin.name).toBe('tinyimg-unplugin')
    expect(typeof plugin.transform).toBe('function')
    expect(typeof plugin.buildEnd).toBe('function')
  })

  test('skips non-image files', async () => {
    const plugin = tinyimgUnplugin.raw()
    const result = await plugin.transform('console.log("hello")', '/path/to/file.js')

    expect(result).toBeNull()
  })

  test('compresses PNG/JPG/JPEG files in production', async () => {
    const mockCompressedBuffer = Buffer.from('compressed-image-data')

    vi.mocked(compressImage).mockResolvedValue(mockCompressedBuffer)

    const plugin = tinyimgUnplugin.raw()

    // Set NODE_ENV to production as fallback
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      // Call transform with proper 'this' context
      const result = await plugin.transform.call(
        { config: { isBuild: true } }, // Vite context
        Buffer.from('original-image-data'),
        '/path/to/image.png'
      )

      console.log('compressImage calls:', vi.mocked(compressImage).mock.calls)
      console.log('result:', result)

      expect(compressImage).toHaveBeenCalledWith(
        Buffer.from('original-image-data'),
        expect.objectContaining({
          projectCacheOnly: true
        })
      )
      expect(result).toEqual({
        code: mockCompressedBuffer,
        map: null
      })
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  test('skips compression in development', async () => {
    const plugin = tinyimgUnplugin.raw()

    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    try {
      const result = await plugin.transform.call(
        { config: { isBuild: false } }, // Vite development context
        Buffer.from('original-image-data'),
        '/path/to/image.png'
      )

      expect(compressImage).not.toHaveBeenCalled()
      expect(result).toBeNull()
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  test('uses project-only cache', async () => {
    const mockCompressedBuffer = Buffer.from('compressed-image-data')

    vi.mocked(compressImage).mockResolvedValue(mockCompressedBuffer)

    const plugin = tinyimgUnplugin.raw()

    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    try {
      await plugin.transform.call(
        { config: { isBuild: true } },
        Buffer.from('original-image-data'),
        '/path/to/image.png'
      )

      // Verify compressImage was called with projectCacheOnly: true
      expect(compressImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          projectCacheOnly: true
        })
      )
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  test('validates TINYPNG_KEYS at initialization', () => {
    vi.mocked(loadKeys).mockReturnValueOnce([])

    expect(() => {
      tinyimgUnplugin.raw()
    }).toThrow('TINYPNG_KEYS environment variable is required')
  })

  test('handles errors in non-strict mode', async () => {
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
        '/path/to/image.png'
      )

      // In non-strict mode, should return null to use original file
      expect(result).toBeNull()
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  test('handles errors in strict mode', async () => {
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
          '/path/to/image.png'
        )
      ).rejects.toThrow('All keys exhausted')
    }
    finally {
      process.env.NODE_ENV = originalEnv
    }
  })
})
