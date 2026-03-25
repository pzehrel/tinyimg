import https from 'node:https'
import FormData from 'form-data'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TinyPngWebCompressor } from '../web-compressor'
import { createMockClientRequest, createMockPngBuffer, resetHttpsMocks, SMALL_PNG } from './fixtures'

describe('tinyPngWebCompressor', () => {
  let compressor: TinyPngWebCompressor
  let requestSpy: ReturnType<typeof vi.spyOn>
  let getSpy: ReturnType<typeof vi.spyOn>
  let pipeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Reset all HTTPS mocks before each test
    resetHttpsMocks()
    compressor = new TinyPngWebCompressor()

    // Spy on https methods
    requestSpy = vi.spyOn(https, 'request')
    getSpy = vi.spyOn(https, 'get')
    pipeSpy = vi.spyOn(FormData.prototype, 'pipe')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('compress', () => {
    it('should upload to tinypng.com web interface and download compressed image', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponseBody = JSON.stringify({
        output: { url: 'https://tinypng.com/output/compressed.png' },
      })

      let uploadCallbackCalled = false
      let downloadCallbackCalled = false

      // Mock upload request
      requestSpy.mockImplementation((url, options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn(uploadResponseBody)
            }
            else if (event === 'end') {
              fn()
              uploadCallbackCalled = true
            }
          }),
        }

        callback(mockRes as any)

        return createMockClientRequest()
      })

      // Mock download request
      getSpy.mockImplementation((url, callback) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn(compressedBuffer)
            }
            else if (event === 'end') {
              fn()
              downloadCallbackCalled = true
            }
          }),
        }

        callback(mockRes as any)
        return mockRes as any
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Returns compressed buffer
      expect(result).toEqual(compressedBuffer)
      expect(result.byteLength).toBe(512)
      expect(uploadCallbackCalled).toBe(true)
      expect(downloadCallbackCalled).toBe(true)
      expect(pipeSpy).toHaveBeenCalled()
    })

    it('should handle multipart form-data upload', async () => {
      // Arrange: Mock to capture form-data headers
      let capturedHeaders: any = null
      const compressedBuffer = createMockPngBuffer(512)

      requestSpy.mockImplementation((url, options, callback) => {
        capturedHeaders = options.headers
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn(JSON.stringify({ output: { url: 'https://tinypng.com/output.png' } }))
            }
            else if (event === 'end') {
              fn()
            }
          }),
        }

        callback(mockRes as any)
        return createMockClientRequest()
      })

      getSpy.mockImplementation((url, callback) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn(compressedBuffer)
            }
            else if (event === 'end') {
              fn()
            }
          }),
        }

        callback(mockRes as any)
        return mockRes as any
      })

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: Uploads with multipart/form-data headers
      expect(capturedHeaders).toBeDefined()
      expect(capturedHeaders['content-type']).toMatch(/multipart\/form-data/)
      expect(pipeSpy).toHaveBeenCalled()
    })

    it('should retry on network errors', async () => {
      // Arrange: First 2 attempts fail, 3rd succeeds
      let attemptCount = 0

      requestSpy.mockImplementation(function (this: any, ...args: any[]) {
        attemptCount++
        if (attemptCount <= 2) {
          // First 2 attempts fail with network error
          const error = new Error('Connection reset')
          ;(error as any).code = 'ECONNRESET'

          const mockReq = createMockClientRequest()
          // Emit error on next tick to allow form.pipe() to set up handlers
          setImmediate(() => {
            mockReq.emit('error', error)
          })
          return mockReq
        }
        else {
          // Third attempt succeeds
          const mockRes = {
            statusCode: 200,
            on: vi.fn((event, fn) => {
              if (event === 'data') {
                fn(JSON.stringify({ output: { url: 'https://tinypng.com/output.png' } }))
              }
              else if (event === 'end') {
                fn()
              }
            }),
          }

          const callback = args[2] as (...args: any[]) => void
          callback(mockRes as any)

          return createMockClientRequest()
        }
      })

      getSpy.mockImplementation((url, callback) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn(createMockPngBuffer(512))
            }
            else if (event === 'end') {
              fn()
            }
          }),
        }

        callback(mockRes as any)
        return mockRes as any
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Retries and eventually succeeds
      expect(attemptCount).toBe(3)
      expect(result).toBeDefined()
    }, 30000)

    it('should parse compressed image from download response', async () => {
      // Arrange: Mock upload and download
      const compressedBuffer = createMockPngBuffer(512)

      requestSpy.mockImplementation((url, options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn(JSON.stringify({ output: { url: 'https://tinypng.com/output.png' } }))
            }
            else if (event === 'end') {
              fn()
            }
          }),
        }

        callback(mockRes as any)
        return createMockClientRequest()
      })

      getSpy.mockImplementation((url, callback) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn(compressedBuffer)
            }
            else if (event === 'end') {
              fn()
            }
          }),
        }

        callback(mockRes as any)
        return mockRes as any
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Returns compressed buffer
      expect(result).toEqual(compressedBuffer)
      expect(result.byteLength).toBe(512)
    })

    it('should handle HTTP errors with proper status codes', async () => {
      // Arrange: Mock HTTP 429 error
      requestSpy.mockImplementation((url, options, callback) => {
        const mockRes = {
          statusCode: 429,
          on: vi.fn((event, fn) => {
            if (event === 'data') {
              fn('Too Many Requests')
            }
            else if (event === 'end') {
              fn()
            }
          }),
        }

        callback(mockRes as any)
        return createMockClientRequest()
      })

      // Act & Assert: Should throw HTTP 429 error
      await expect(compressor.compress(SMALL_PNG)).rejects.toThrow('HTTP 429')
    })

    it('should respect maxRetries limit', async () => {
      // Arrange: All attempts fail
      let attemptCount = 0
      const maxRetries = 3

      requestSpy.mockImplementation(() => {
        attemptCount++
        const error = new Error('Connection reset')
        ;(error as any).code = 'ECONNRESET'

        const mockReq = createMockClientRequest()
        // Emit error on next tick to allow form.pipe() to set up handlers
        setImmediate(() => {
          mockReq.emit('error', error)
        })
        return mockReq
      })

      const limitedCompressor = new TinyPngWebCompressor(maxRetries)

      // Act & Assert: Should fail after max retries
      await expect(limitedCompressor.compress(SMALL_PNG)).rejects.toThrow()
      expect(attemptCount).toBe(maxRetries + 1) // initial + maxRetries retries
    }, 30000)
  })
})
