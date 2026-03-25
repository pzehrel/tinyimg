import { describe, expect, test, vi } from 'vitest'
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
  test('creates unplugin factory', () => {
    // The default export is the result of createUnplugin()
    // which returns an object with raw, vite, webpack as getter functions
    expect(tinyimgUnplugin).toBeDefined()
    expect(typeof tinyimgUnplugin.raw).toBe('function')
    expect(typeof tinyimgUnplugin.vite).toBe('function')
    expect(typeof tinyimgUnplugin.webpack).toBe('function')
  })

  test.skip('returns plugin with transform hook', () => {
    expect(true).toBe(false)
  })

  test.skip('skips non-image files', () => {
    expect(true).toBe(false)
  })

  test.skip('compresses PNG/JPG/JPEG files in production', () => {
    expect(true).toBe(false)
  })

  test.skip('skips compression in development', () => {
    expect(true).toBe(false)
  })

  test.skip('uses project-only cache', () => {
    expect(true).toBe(false)
  })
})
