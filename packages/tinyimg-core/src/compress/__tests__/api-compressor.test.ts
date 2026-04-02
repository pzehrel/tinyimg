/* eslint-disable node/prefer-global/buffer */
import https from 'node:https'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TinyPngApiCompressor } from '../api-compressor'
import { createMockClientRequest, createMockPngBuffer, LARGE_PNG, SMALL_PNG } from './fixtures'

describe('tinyPngApiCompressor', () => {
  let compressor: TinyPngApiCompressor
  let mockKeyPool: any
  let requestSpy: any

  beforeEach(() => {
    requestSpy = vi.spyOn(https, 'request')

    // Create mock KeyPool
    mockKeyPool = {
      selectKey: async () => 'test-api-key',
      decrementQuota: () => {},
      getCurrentKey: () => 'test-api-key',
    }

    compressor = new TinyPngApiCompressor(mockKeyPool, 8)
  })

  describe('compress', () => {
    it('should compress image successfully', async () => {
      const mockInputBuffer = SMALL_PNG
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let requestCount = 0

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        requestCount++

        const mockRes = {
          statusCode: 200,
          headers: {},
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              if (requestCount === 1) {
                // Upload request - return JSON
                fn(Buffer.from(JSON.stringify({ output: { url: mockOutputUrl } })))
              }
              else {
                // Download request - return PNG buffer
                fn(mockCompressedBuffer)
              }
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await compressor.compress(mockInputBuffer)

      expect(result).toEqual(mockCompressedBuffer)
      expect(requestCount).toBe(2) // Upload + download
      expect(compressor.getFailureCount()).toBe(0)
    })

    it('should enforce 5MB file size limit', async () => {
      await expect(compressor.compress(LARGE_PNG)).rejects.toThrow('File size exceeds 5MB limit')
    })

    it('should call KeyPool methods on success', async () => {
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let selectKeyCalled = false
      let decrementQuotaCalled = false

      mockKeyPool.selectKey = async () => {
        selectKeyCalled = true
        return 'test-api-key'
      }
      mockKeyPool.decrementQuota = () => {
        decrementQuotaCalled = true
      }

      let requestCount = 0
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        requestCount++

        const mockRes = {
          statusCode: 200,
          headers: {},
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              if (requestCount === 1) {
                // Upload request - return JSON
                fn(Buffer.from(JSON.stringify({ output: { url: mockOutputUrl } })))
              }
              else {
                // Download request - return PNG buffer
                fn(mockCompressedBuffer)
              }
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      await compressor.compress(SMALL_PNG)

      expect(selectKeyCalled).toBe(true)
      expect(decrementQuotaCalled).toBe(true)
    })

    it('should retry on 500 error', async () => {
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let attemptCount = 0

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        attemptCount++

        const mockRes = {
          statusCode: attemptCount === 1 ? 500 : 200,
          headers: {},
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              if (attemptCount === 1) {
                // First attempt - server error
                fn(Buffer.from('Internal Server Error'))
              }
              else if (attemptCount === 2) {
                // Second attempt - upload success
                fn(Buffer.from(JSON.stringify({ output: { url: mockOutputUrl } })))
              }
              else {
                // Download request
                fn(mockCompressedBuffer)
              }
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await compressor.compress(SMALL_PNG)

      expect(result).toEqual(mockCompressedBuffer)
      expect(attemptCount).toBe(3) // Upload fail, upload success, download
    })

    it('should not retry on 401 error', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 401,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn(Buffer.from('Unauthorized'))
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      await expect(compressor.compress(SMALL_PNG)).rejects.toThrow()
    })

    it('should have getFailureCount method', () => {
      expect(typeof compressor.getFailureCount).toBe('function')
      expect(typeof compressor.getFailureCount()).toBe('number')
    })
  })
})
