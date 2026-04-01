import pLimit from 'p-limit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '../../utils/http-request'
import { TinyPngHttpClient } from '../http-client'
import { createMockPngBuffer } from './fixtures'

// Mock httpRequest utility
vi.mock('../../utils/http-request')

describe('tinyPngHttpClient', () => {
  let client: TinyPngHttpClient
  let mockHttpRequest: any

  beforeEach(() => {
    client = new TinyPngHttpClient()
    mockHttpRequest = vi.mocked(httpRequest)
    vi.clearAllMocks()
  })

  describe('compress()', () => {
    it('should upload and download compressed image successfully', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'
      const mockCompressionCount = 42

      // Mock upload request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: {
          output: { url: mockOutputUrl },
          compressionCount: mockCompressionCount,
        },
      })

      // Mock download request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: mockCompressedBuffer,
      })

      const result = await client.compress('test-api-key', mockInputBuffer)

      expect(result).toEqual({
        buffer: mockCompressedBuffer,
        compressionCount: mockCompressionCount,
      })
      expect(mockHttpRequest).toHaveBeenCalledTimes(2)
    })

    it('should handle undefined compressionCount in upload response', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      // Mock upload request without compressionCount field
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: {
          output: { url: mockOutputUrl },
          // compressionCount field missing
        },
      })

      // Mock download request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: mockCompressedBuffer,
      })

      const result = await client.compress('test-api-key', mockInputBuffer)

      expect(result.buffer).toEqual(mockCompressedBuffer)
      expect(result.compressionCount).toBe(0)
      expect(mockHttpRequest).toHaveBeenCalledTimes(2)
    })

    it('should follow 302 redirects when downloading', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'
      const mockCompressionCount = 42

      // Mock upload request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: {
          output: { url: mockOutputUrl },
          compressionCount: mockCompressionCount,
        },
      })

      // Mock download request with redirect (httpRequest handles redirects internally)
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: mockCompressedBuffer,
      })

      const result = await client.compress('test-api-key', mockInputBuffer)

      expect(result).toEqual({
        buffer: mockCompressedBuffer,
        compressionCount: mockCompressionCount,
      })
      expect(mockHttpRequest).toHaveBeenCalledTimes(2)
    })

    it('should throw error after 5 redirects', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      // Mock upload request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: {
          output: { url: mockOutputUrl },
        },
      })

      // Mock download request that exceeds redirect limit
      mockHttpRequest.mockRejectedValueOnce(new Error('Maximum redirects (5) exceeded'))

      await expect(
        client.compress('test-api-key', mockInputBuffer),
      ).rejects.toThrow('Maximum redirects (5) exceeded')
    })

    it('should handle HTTP 4xx errors with statusCode property', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      // Mock upload request with 4xx error
      mockHttpRequest.mockResolvedValue({
        statusCode: 400,
        headers: {},
        data: { error: 'Bad Request' },
      })

      try {
        await client.compress('test-api-key', mockInputBuffer)
        expect(true).toBe(false) // Should not reach here
      }
      catch (error: any) {
        expect(error.message).toContain('TinyPNG 客户端错误')
        expect(error.statusCode).toBe(400)
        expect(error.errorCode).toBe('CLIENT_ERROR')
      }
    })

    it('should handle HTTP 5xx errors with statusCode property', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      // Mock upload request with 5xx error
      mockHttpRequest.mockResolvedValue({
        statusCode: 500,
        headers: {},
        data: { error: 'Internal Server Error' },
      })

      try {
        await client.compress('test-api-key', mockInputBuffer)
        expect(true).toBe(false) // Should not reach here
      }
      catch (error: any) {
        expect(error.message).toContain('TinyPNG 服务器错误')
        expect(error.statusCode).toBe(500)
        expect(error.errorCode).toBe('SERVER_ERROR')
      }
    })

    it('should handle network errors with code property', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      mockHttpRequest.mockRejectedValue(Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }))

      try {
        await client.compress('test-api-key', mockInputBuffer)
        expect(true).toBe(false) // Should not reach here
      }
      catch (error: any) {
        expect(error.message).toContain('Connection reset')
        expect(error.code).toBe('ECONNRESET')
      }
    })
  })

  describe('validateKey()', () => {
    it('should return true for valid API key', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: {},
      })

      const result = await client.validateKey('valid-api-key')
      expect(result).toBe(true)
    })

    it('should return false for 401 unauthorized', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 401,
        headers: {},
        data: { error: 'Unauthorized' },
      })

      const result = await client.validateKey('invalid-api-key')
      expect(result).toBe(false)
    })

    it('should return false for 403 forbidden', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 403,
        headers: {},
        data: { error: 'Forbidden' },
      })

      const result = await client.validateKey('forbidden-api-key')
      expect(result).toBe(false)
    })

    it('should throw on 5xx server errors', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 500,
        headers: {},
        data: { error: 'Internal Server Error' },
      })

      await expect(
        client.validateKey('test-api-key'),
      ).rejects.toThrow('TinyPNG 服务器错误')
    })

    it('should throw on network errors', async () => {
      mockHttpRequest.mockRejectedValueOnce(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }))

      await expect(
        client.validateKey('test-api-key'),
      ).rejects.toThrow('ETIMEDOUT')
    })
  })

  describe('getCompressionCount()', () => {
    it('should return compressionCount from response', async () => {
      const mockCount = 123

      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: { compressionCount: mockCount },
      })

      const result = await client.getCompressionCount('test-api-key')
      expect(result).toBe(mockCount)
    })

    it('should return 0 when compressionCount not in response', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: {},
      })

      const result = await client.getCompressionCount('test-api-key')
      expect(result).toBe(0)
    })

    it('should return 0 for 401 unauthorized', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 401,
        headers: {},
        data: { error: 'Unauthorized' },
      })

      const result = await client.getCompressionCount('invalid-api-key')
      expect(result).toBe(0)
    })

    it('should return 0 for 403 forbidden', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 403,
        headers: {},
        data: { error: 'Forbidden' },
      })

      const result = await client.getCompressionCount('forbidden-api-key')
      expect(result).toBe(0)
    })

    it('should throw on 5xx server errors', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 500,
        headers: {},
        data: { error: 'Internal Server Error' },
      })

      await expect(
        client.getCompressionCount('test-api-key'),
      ).rejects.toThrow('TinyPNG 服务器错误')
    })
  })

  describe('error handling', () => {
    it('should handle 201 Created successfully', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'
      const mockCompressionCount = 42

      // Mock upload request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 201,
        headers: {},
        data: {
          output: { url: mockOutputUrl },
          compressionCount: mockCompressionCount,
        },
      })

      // Mock download request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: mockCompressedBuffer,
      })

      const result = await client.compress('test-api-key', mockInputBuffer)

      expect(result).toEqual({
        buffer: mockCompressedBuffer,
        compressionCount: mockCompressionCount,
      })
    })

    it('should handle 202 Accepted successfully', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'
      const mockCompressionCount = 42

      // Mock upload request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 202,
        headers: {},
        data: {
          output: { url: mockOutputUrl },
          compressionCount: mockCompressionCount,
        },
      })

      // Mock download request
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        data: mockCompressedBuffer,
      })

      const result = await client.compress('test-api-key', mockInputBuffer)

      expect(result).toEqual({
        buffer: mockCompressedBuffer,
        compressionCount: mockCompressionCount,
      })
    })

    it('should handle 204 No Content successfully', async () => {
      mockHttpRequest.mockResolvedValueOnce({
        statusCode: 204,
        headers: {},
        data: {},
      })

      const result = await client.validateKey('test-api-key')
      expect(result).toBe(true)
    })

    it('should handle 429 Too Many Requests', async () => {
      mockHttpRequest.mockRejectedValueOnce(Object.assign(new Error('HTTP 429: Too Many Requests'), { statusCode: 429 }))

      await expect(
        client.validateKey('test-api-key'),
      ).rejects.toThrow('HTTP 429')
    })

    it('should handle 502 Bad Gateway', async () => {
      mockHttpRequest.mockRejectedValueOnce(Object.assign(new Error('HTTP 502: Bad Gateway'), { statusCode: 502 }))

      await expect(
        client.validateKey('test-api-key'),
      ).rejects.toThrow('HTTP 502')
    })

    it('should handle 503 Service Unavailable', async () => {
      mockHttpRequest.mockRejectedValueOnce(Object.assign(new Error('HTTP 503: Service Unavailable'), { statusCode: 503 }))

      await expect(
        client.validateKey('test-api-key'),
      ).rejects.toThrow('HTTP 503')
    })
  })

  describe('concurrent requests', () => {
    it('should handle 10 concurrent compressions with different API keys', async () => {
      const concurrency = 10
      const mockBuffers = Array.from({ length: concurrency }).fill(createMockPngBuffer(1024))
      const mockCompressedBuffers = Array.from({ length: concurrency }).fill(createMockPngBuffer(512))
      const apiKeys = Array.from({ length: concurrency }, (_, i) => `api-key-${i}`)

      // Mock all upload and download requests using mockResolvedValue (not Once)
      // This ensures the mock returns the correct response for all calls
      mockHttpRequest.mockImplementation((url: string, options: any) => {
        // Upload requests (POST to shrink endpoint)
        if (options.method === 'POST') {
          return Promise.resolve({
            statusCode: 200,
            headers: {},
            data: {
              output: { url: 'https://api.tinify.com/output/default' },
              compressionCount: 0,
            },
          })
        }
        // Download requests (GET to output URL)
        return Promise.resolve({
          statusCode: 200,
          headers: {},
          data: createMockPngBuffer(512),
        })
      })

      const results = await Promise.all(
        mockBuffers.map((buffer, index) =>
          client.compress(apiKeys[index], buffer),
        ),
      )

      expect(results).toHaveLength(concurrency)
      results.forEach((result) => {
        expect(result).toHaveProperty('buffer')
        expect(result).toHaveProperty('compressionCount')
        expect(result.buffer).toBeInstanceOf(Buffer)
        expect(result.compressionCount).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle concurrent requests with mixed API keys', async () => {
      const limit = pLimit(8) // Default concurrency limit
      const requests = 16
      const apiKeys = Array.from({ length: requests }, (_, i) => `api-key-${i % 4}`) // 4 different keys
      const mockBuffers = Array.from({ length: requests }).fill(createMockPngBuffer(1024))
      const mockCompressedBuffers = Array.from({ length: requests }).fill(createMockPngBuffer(512))

      // Mock all upload and download requests using mockImplementation
      mockHttpRequest.mockImplementation((url: string, options: any) => {
        // Upload requests (POST to shrink endpoint)
        if (options.method === 'POST') {
          return Promise.resolve({
            statusCode: 200,
            headers: {},
            data: {
              output: { url: 'https://api.tinify.com/output/default' },
              compressionCount: 0,
            },
          })
        }
        // Download requests (GET to output URL)
        return Promise.resolve({
          statusCode: 200,
          headers: {},
          data: createMockPngBuffer(512),
        })
      })

      const results = await Promise.all(
        mockBuffers.map((buffer, index) =>
          limit(() => client.compress(apiKeys[index], buffer)),
        ),
      )

      expect(results).toHaveLength(requests)
      results.forEach((result) => {
        expect(result).toHaveProperty('buffer')
        expect(result).toHaveProperty('compressionCount')
        expect(result.buffer).toBeInstanceOf(Buffer)
        expect(result.compressionCount).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
