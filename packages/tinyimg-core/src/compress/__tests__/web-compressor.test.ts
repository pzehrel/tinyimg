import https from 'node:https'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TinyPngWebCompressor } from '../web-compressor'
import { createMockClientRequest, createMockPngBuffer, resetHttpsMocks, SMALL_PNG } from './fixtures'

describe('tinyPngWebCompressor', () => {
  let compressor: TinyPngWebCompressor
  let requestSpy: ReturnType<typeof vi.spyOn>
  let getSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Reset all HTTPS mocks before each test
    resetHttpsMocks()
    compressor = new TinyPngWebCompressor()

    // Spy on https methods
    requestSpy = vi.spyOn(https, 'request')
    getSpy = vi.spyOn(https, 'get')
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

      // Track whether we're mocking upload or download based on URL
      requestSpy.mockImplementation((url, options, callback) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
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
        }
        // Download URL
        else {
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

          const mockReq = createMockClientRequest()
          setImmediate(() => callback(mockRes as any))
          return mockReq
        }
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Returns compressed buffer
      expect(result).toEqual(compressedBuffer)
      expect(result.byteLength).toBe(512)
      expect(uploadCallbackCalled).toBe(true)
      expect(downloadCallbackCalled).toBe(true)
    })

    it('should retry on network errors', async () => {
      // Arrange: First 2 attempts fail, 3rd succeeds
      let attemptCount = 0

      requestSpy.mockImplementation((url, options, callback) => {
        // Upload URL is TINYPNG_WEB_URL
        if (url === 'https://tinypng.com/backend/opt/shrink' || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')) {
          attemptCount++
          if (attemptCount <= 2) {
            // First 2 attempts fail with network error
            const error = new Error('Connection reset')
            ;(error as any).code = 'ECONNRESET'

            const mockReq = createMockClientRequest()
            // Emit error on next tick to allow req.write() to set up handlers
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

            callback(mockRes as any)
            return createMockClientRequest()
          }
        }
        // Download URL - always succeed
        else {
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

          const mockReq = createMockClientRequest()
          setImmediate(() => callback(mockRes as any))
          return mockReq
        }
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
        // Upload URL is TINYPNG_WEB_URL
        if (url === 'https://tinypng.com/backend/opt/shrink' || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')) {
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
        }
        // Download URL
        else {
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

          const mockReq = createMockClientRequest()
          setImmediate(() => callback(mockRes as any))
          return mockReq
        }
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

      requestSpy.mockImplementation((url, options, callback) => {
        // Upload URL is TINYPNG_WEB_URL
        if (url === 'https://tinypng.com/backend/opt/shrink' || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')) {
          attemptCount++
          const error = new Error('Connection reset')
          ;(error as any).code = 'ECONNRESET'

          const mockReq = createMockClientRequest()
          // Emit error on next tick to allow req.write() to set up handlers
          setImmediate(() => {
            mockReq.emit('error', error)
          })
          return mockReq
        }
        // Download URL - should never reach here
        else {
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

          const mockReq = createMockClientRequest()
          setImmediate(() => callback(mockRes as any))
          return mockReq
        }
      })

      const limitedCompressor = new TinyPngWebCompressor(maxRetries)

      // Act & Assert: Should fail after max retries
      await expect(limitedCompressor.compress(SMALL_PNG)).rejects.toThrow()
      expect(attemptCount).toBe(maxRetries + 1) // initial + maxRetries retries
    }, 30000)
  })

  describe('raw buffer upload with random headers', () => {
    it('should upload raw buffer (not multipart) via req.write(buffer)', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponseBody = JSON.stringify({
        output: { url: 'https://tinypng.com/output/compressed.png' },
      })

      let capturedBuffer: Buffer | null = null

      // Track whether we're mocking upload or download based on URL
      requestSpy.mockImplementation((url, options, callback) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          const mockReq = createMockClientRequest()

          // Capture the buffer written to the request
          mockReq.write = vi.fn((buffer: Buffer) => {
            capturedBuffer = buffer
          })

          const mockRes = {
            statusCode: 200,
            on: vi.fn((event, fn) => {
              if (event === 'data') {
                fn(uploadResponseBody)
              }
              else if (event === 'end') {
                fn()
              }
            }),
          }

          callback(mockRes as any)
          return mockReq
        }
        // Download URL
        else {
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

          const mockReq = createMockClientRequest()
          setImmediate(() => callback(mockRes as any))
          return mockReq
        }
      })

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: Raw buffer was written (not multipart)
      expect(capturedBuffer).toBeDefined()
      expect(capturedBuffer).toEqual(SMALL_PNG)
    })

    it('should generate random X-Forwarded-For (valid IPv4) and User-Agent headers', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponseBody = JSON.stringify({
        output: { url: 'https://tinypng.com/output/compressed.png' },
      })

      let capturedHeaders: any = null

      // Track whether we're mocking upload or download based on URL
      requestSpy.mockImplementation((url, options, callback) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          capturedHeaders = options.headers

          const mockRes = {
            statusCode: 200,
            on: vi.fn((event, fn) => {
              if (event === 'data') {
                fn(uploadResponseBody)
              }
              else if (event === 'end') {
                fn()
              }
            }),
          }

          callback(mockRes as any)
          return createMockClientRequest()
        }
        // Download URL
        else {
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

          const mockReq = createMockClientRequest()
          setImmediate(() => callback(mockRes as any))
          return mockReq
        }
      })

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: Random headers generated
      expect(capturedHeaders).toBeDefined()
      expect(capturedHeaders['User-Agent']).toBeDefined()
      expect(capturedHeaders['User-Agent']).not.toBe('')
      expect(capturedHeaders['X-Forwarded-For']).toBeDefined()
      expect(capturedHeaders['X-Forwarded-For']).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    })

    it('should use same headers for upload and download within one compress() call', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponseBody = JSON.stringify({
        output: { url: 'https://tinypng.com/output/compressed.png' },
      })

      let uploadHeaders: any = null
      let downloadRequestOptions: any = null

      // Track whether we're mocking upload or download based on URL
      requestSpy.mockImplementation((url, options, callback) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          uploadHeaders = options.headers

          const mockRes = {
            statusCode: 200,
            on: vi.fn((event, fn) => {
              if (event === 'data') {
                fn(uploadResponseBody)
              }
              else if (event === 'end') {
                fn()
              }
            }),
          }

          callback(mockRes as any)
          return createMockClientRequest()
        }
        // Download URL
        else {
          downloadRequestOptions = options

          const mockReq = createMockClientRequest()

          // Simulate async response
          setImmediate(() => {
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
          })

          return mockReq
        }
      })

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: Same headers used for upload and download
      expect(uploadHeaders).toBeDefined()
      expect(downloadRequestOptions).toBeDefined()
      expect(downloadRequestOptions.headers).toBeDefined()
      expect(uploadHeaders['user-agent']).toEqual(downloadRequestOptions.headers['user-agent'])
      expect(uploadHeaders['x-forwarded-for']).toEqual(downloadRequestOptions.headers['x-forwarded-for'])
    })

    it('should include Content-Type: application/octet-stream in download request', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponseBody = JSON.stringify({
        output: { url: 'https://tinypng.com/output/compressed.png' },
      })

      let downloadRequestOptions: any = null

      // Track whether we're mocking upload or download based on URL
      requestSpy.mockImplementation((url, options, callback) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'object' && url.href === 'https://tinypng.com/backend/opt/shrink')
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          const mockRes = {
            statusCode: 200,
            on: vi.fn((event, fn) => {
              if (event === 'data') {
                fn(uploadResponseBody)
              }
              else if (event === 'end') {
                fn()
              }
            }),
          }

          callback(mockRes as any)
          return createMockClientRequest()
        }
        // Download URL
        else {
          downloadRequestOptions = options

          const mockReq = createMockClientRequest()

          // Simulate async response
          setImmediate(() => {
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
          })

          return mockReq
        }
      })

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: Download includes Content-Type: application/octet-stream
      expect(downloadRequestOptions).toBeDefined()
      expect(downloadRequestOptions.headers).toBeDefined()
      expect(downloadRequestOptions.headers['Content-Type']).toBe('application/octet-stream')
    })

    it('should throw errors with statusCode property for HTTP errors (status >= 400)', async () => {
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

      // Act & Assert: Should throw error with statusCode property
      await expect(compressor.compress(SMALL_PNG)).rejects.toThrow('HTTP 429')

      try {
        await compressor.compress(SMALL_PNG)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(429)
      }
    })
  })
})
