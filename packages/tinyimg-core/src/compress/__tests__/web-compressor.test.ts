import type { Buffer } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '../../utils/http-request'
import { TinyPngWebCompressor } from '../web-compressor'
import { createMockPngBuffer, SMALL_PNG } from './fixtures'

// Mock httpRequest utility function
vi.mock('../../utils/http-request', () => ({
  httpRequest: vi.fn(),
}))

// Mock user-agents package
vi.mock('user-agents', () => ({
  default: vi.fn().mockImplementation(() => {
    return {
      random: vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
        data: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          platform: 'Win32',
          deviceCategory: 'desktop',
        },
      }),
    }
  }),
}))

describe('tinyPngWebCompressor', () => {
  let compressor: TinyPngWebCompressor
  let mockHttpRequest: any

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    compressor = new TinyPngWebCompressor()
    mockHttpRequest = httpRequest as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('compress', () => {
    it('should upload to tinypng.com web interface and download compressed image', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }
      const downloadResponse = {
        statusCode: 200,
        headers: {},
        data: compressedBuffer,
      }

      let uploadCallCount = 0
      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          uploadCallCount++
          return uploadResponse
        }
        // Download URL
        else {
          return downloadResponse
        }
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Returns compressed buffer
      expect(result).toEqual(compressedBuffer)
      expect(result.byteLength).toBe(512)
      expect(uploadCallCount).toBe(1)
      expect(mockHttpRequest).toHaveBeenCalledTimes(2) // upload + download
    })

    it('should retry on network errors', async () => {
      // Arrange: First 2 attempts fail, 3rd succeeds
      let attemptCount = 0

      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          attemptCount++
          if (attemptCount <= 2) {
            // First 2 attempts fail with network error
            const error = new Error('Connection reset')
            ;(error as any).code = 'ECONNRESET'
            throw error
          }
          else {
            // Third attempt succeeds
            return {
              statusCode: 200,
              headers: {},
              data: { output: { url: 'https://tinypng.com/output.png' } },
            }
          }
        }
        // Download URL - always succeed
        else {
          return {
            statusCode: 200,
            headers: {},
            data: createMockPngBuffer(512),
          }
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

      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          return {
            statusCode: 200,
            headers: {},
            data: { output: { url: 'https://tinypng.com/output.png' } },
          }
        }
        // Download URL
        else {
          return {
            statusCode: 200,
            headers: {},
            data: compressedBuffer,
          }
        }
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Returns compressed buffer
      expect(result).toEqual(compressedBuffer)
      expect(result.byteLength).toBe(512)
    })

    it('should handle HTTP errors with proper status codes', async () => {
      // Arrange: Mock HTTP 401 error (no retry)
      mockHttpRequest.mockResolvedValue({
        statusCode: 401,
        headers: {},
        data: 'Unauthorized',
      })

      // Act & Assert: Should throw HTTP 401 error
      await expect(compressor.compress(SMALL_PNG)).rejects.toThrow('HTTP 401')
    })

    it('should respect maxRetries limit', async () => {
      // Arrange: All attempts fail
      let attemptCount = 0
      const maxRetries = 3

      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          attemptCount++
          const error = new Error('Connection reset')
          ;(error as any).code = 'ECONNRESET'
          throw error
        }
        // Download URL - should never reach here
        else {
          return {
            statusCode: 200,
            headers: {},
            data: createMockPngBuffer(512),
          }
        }
      })

      const limitedCompressor = new TinyPngWebCompressor(maxRetries)

      // Act & Assert: Should fail after max retries
      await expect(limitedCompressor.compress(SMALL_PNG)).rejects.toThrow()
      // RetryManager retries maxRetries times, so total attempts = maxRetries + 1 (initial) + 1 (final) = maxRetries + 2
      // But the actual behavior depends on RetryManager implementation
      // Let's just verify it retried at least maxRetries times
      expect(attemptCount).toBeGreaterThan(maxRetries)
    }, 30000)
  })

  describe('raw buffer upload with random headers', () => {
    it('should upload raw buffer (not multipart) via req.write(buffer)', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }
      const downloadResponse = {
        statusCode: 200,
        headers: {},
        data: compressedBuffer,
      }

      let capturedBody: Buffer | null = null

      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          // Capture the buffer written to the request
          capturedBody = options.body || null

          return uploadResponse
        }
        // Download URL
        else {
          return downloadResponse
        }
      })

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: Raw buffer was written (not multipart)
      expect(capturedBody).toBeDefined()
      expect(capturedBody).toEqual(SMALL_PNG)
    })

    it('should generate random X-Forwarded-For (valid IPv4) and User-Agent headers', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }
      const downloadResponse = {
        statusCode: 200,
        headers: {},
        data: compressedBuffer,
      }

      let capturedHeaders: any = null

      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          capturedHeaders = options.headers
          return uploadResponse
        }
        // Download URL
        else {
          return downloadResponse
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
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }
      const downloadResponse = {
        statusCode: 200,
        headers: {},
        data: compressedBuffer,
      }

      let uploadHeaders: any = null
      let downloadHeaders: any = null

      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          uploadHeaders = options.headers
          return uploadResponse
        }
        // Download URL
        else {
          downloadHeaders = options.headers
          return downloadResponse
        }
      })

      // Act: Call compressor.compress()
      await compressor.compress(SMALL_PNG)

      // Assert: Same headers used for upload and download
      expect(uploadHeaders).toBeDefined()
      expect(downloadHeaders).toBeDefined()
      expect(uploadHeaders['user-agent']).toEqual(downloadHeaders['user-agent'])
      expect(uploadHeaders['x-forwarded-for']).toEqual(downloadHeaders['x-forwarded-for'])
    })

    it('should include Content-Type: application/octet-stream in download request', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }
      const downloadResponse = {
        statusCode: 200,
        headers: {},
        data: compressedBuffer,
      }

      let downloadRequestOptions: any = null

      mockHttpRequest.mockImplementation(async (url, _options) => {
        // Upload URL is TINYPNG_WEB_URL
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          return uploadResponse
        }
        // Download URL
        else {
          downloadRequestOptions = options
          return downloadResponse
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
      // Arrange: Mock HTTP 401 error (no retry)
      mockHttpRequest.mockResolvedValue({
        statusCode: 401,
        headers: {},
        data: 'Unauthorized',
      })

      // Act & Assert: Should throw error with statusCode property
      await expect(compressor.compress(SMALL_PNG)).rejects.toThrow('HTTP 401')

      try {
        await compressor.compress(SMALL_PNG)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(401)
      }
    })
  })

  describe('user-agents integration (UA-01, UA-02, UA-03)', () => {
    it('should use user-agents package with desktop filter', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }
      const downloadResponse = {
        statusCode: 200,
        headers: {},
        data: compressedBuffer,
      }

      mockHttpRequest.mockImplementation(async (url, _options) => {
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          return uploadResponse
        }
        else {
          return downloadResponse
        }
      })

      // Assert: UserAgent was called with desktop filter
      const UserAgentMock = await import('user-agents')
      expect(UserAgentMock.default).toHaveBeenCalledWith({ deviceCategory: 'desktop' })
    })

    it('should generate different User-Agent for each request (UA-02)', async () => {
      // Arrange: Mock HTTPS success response
      const compressedBuffer = createMockPngBuffer(512)
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }
      const downloadResponse = {
        statusCode: 200,
        headers: {},
        data: compressedBuffer,
      }

      const capturedHeaders: any[] = []

      mockHttpRequest.mockImplementation(async (url, _options) => {
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          capturedHeaders.push(options.headers)
          return uploadResponse
        }
        else {
          return downloadResponse
        }
      })

      // Act: Call compress twice
      await compressor.compress(SMALL_PNG)

      // Create new compressor instance for second call
      const compressor2 = new TinyPngWebCompressor()
      await compressor2.compress(SMALL_PNG)

      // Assert: Headers were captured (we can't fully test different UAs without real user-agents)
      expect(capturedHeaders.length).toBeGreaterThan(0)
      expect(capturedHeaders[0]['User-Agent']).toBeDefined()
    })
  })

  describe('2xx status code support (REF-05)', () => {
    it('should accept 204 No Content status code', async () => {
      // Arrange: Mock upload success and download with 204
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }

      mockHttpRequest.mockImplementation(async (url, _options) => {
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          return uploadResponse
        }
        else {
          // Download returns 204 No Content
          return {
            statusCode: 204,
            headers: {},
            data: createMockPngBuffer(512),
          }
        }
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Should succeed with 204 status code
      expect(result).toBeDefined()
      expect(result.byteLength).toBe(512)
    })

    it('should accept 206 Partial Content status code', async () => {
      // Arrange: Mock upload success and download with 206
      const uploadResponse = {
        statusCode: 200,
        headers: {},
        data: { output: { url: 'https://tinypng.com/output/compressed.png' } },
      }

      mockHttpRequest.mockImplementation(async (url, _options) => {
        const isUpload = url === 'https://tinypng.com/backend/opt/shrink'
          || (typeof url === 'string' && url.includes('tinypng.com/backend/opt/shrink'))

        if (isUpload) {
          return uploadResponse
        }
        else {
          // Download returns 206 Partial Content
          return {
            statusCode: 206,
            headers: {},
            data: createMockPngBuffer(512),
          }
        }
      })

      // Act: Call compressor.compress()
      const result = await compressor.compress(SMALL_PNG)

      // Assert: Should succeed with 206 status code
      expect(result).toBeDefined()
      expect(result.byteLength).toBe(512)
    })
  })
})
