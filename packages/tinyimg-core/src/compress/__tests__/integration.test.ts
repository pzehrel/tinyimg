import https from 'node:https'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TinyPngApiCompressor } from '../api-compressor'
import { createMockClientRequest, createMockPngBuffer } from './fixtures'

describe('integration: TinyPngHttpClient → TinyPngApiCompressor → RetryManager', () => {
  let requestSpy: any

  beforeEach(() => {
    requestSpy = vi.spyOn(https, 'request')
  })

  describe('httpRequest integration', () => {
    it('should handle JSON response with generic type', async () => {
      // Arrange: Mock HTTPS with JSON response
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
            if (event === 'data') {
              process.nextTick(() => fn(JSON.stringify({ output: { url: 'https://example.com/output.png' } })))
            }
            else if (event === 'end') {
              process.nextTick(() => fn())
            }
            return mockRes
          }),
        }
        callback(mockRes)
        return createMockClientRequest()
      })

      // Act: Import and use httpRequest
      const { httpRequest } = await import('../../utils/http-request')
      const response = await httpRequest<{ output: { url: string } }>(
        'https://api.example.com/test',
        { method: 'POST' },
      )

      // Assert: Response parsed as JSON
      expect(response.statusCode).toBe(200)
      expect(response.data.output.url).toBe('https://example.com/output.png')
    })

    it('should handle Buffer response for image download', async () => {
      // Arrange: Mock HTTPS with Buffer response
      const mockBuffer = createMockPngBuffer(512)
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          headers: { 'content-type': 'image/png' },
          on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
            if (event === 'data') {
              process.nextTick(() => fn(mockBuffer))
            }
            else if (event === 'end') {
              process.nextTick(() => fn())
            }
            return mockRes
          }),
        }
        callback(mockRes)
        return createMockClientRequest()
      })

      // Act: Import and use httpRequest
      const { httpRequest } = await import('../../utils/http-request')
      const response = await httpRequest<Buffer>(
        'https://example.com/image.png',
        { method: 'GET' },
      )

      // Assert: Response is Buffer
      expect(response.statusCode).toBe(200)
      expect(response.data).toEqual(mockBuffer)
      expect(response.data.byteLength).toBe(512)
    })
  })

  describe('完整上传/下载流程', () => {
    it('should complete full upload/download flow', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let uploadCalled = false
      let downloadCalled = false

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
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
              if (!uploadCalled) {
                fn(JSON.stringify({ output: { url: mockOutputUrl } }))
                uploadCalled = true
              }
              else {
                fn(mockCompressedBuffer)
                downloadCalled = true
              }
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const mockKeyPool = {
        selectKey: async () => 'test-api-key',
        decrementQuota: () => {},
        getCurrentKey: () => 'test-api-key',
      }

      const compressor = new TinyPngApiCompressor(mockKeyPool, 8)
      const result = await compressor.compress(mockInputBuffer)

      expect(result).toEqual(mockCompressedBuffer)
      expect(uploadCalled).toBe(true)
      expect(downloadCalled).toBe(true)
      expect(compressor.getFailureCount()).toBe(0)
    })
  })

  describe('retry manager 重试逻辑', () => {
    it('should retry on 500 error and succeed on second attempt', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let attemptCount = 0
      let uploadCalled = false
      let downloadCalled = false

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
                fn('Internal Server Error')
              }
              else if (!uploadCalled) {
                fn(JSON.stringify({ output: { url: mockOutputUrl } }))
                uploadCalled = true
              }
              else {
                fn(mockCompressedBuffer)
                downloadCalled = true
              }
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const mockKeyPool = {
        selectKey: async () => 'test-api-key',
        decrementQuota: () => {},
        getCurrentKey: () => 'test-api-key',
      }

      const compressor = new TinyPngApiCompressor(mockKeyPool, 8)
      const result = await compressor.compress(mockInputBuffer)

      expect(result).toEqual(mockCompressedBuffer)
      expect(attemptCount).toBeGreaterThanOrEqual(2)
      expect(uploadCalled).toBe(true)
      expect(downloadCalled).toBe(true)
      // Note: failureCount is reset to 0 after successful compression
      expect(compressor.getFailureCount()).toBe(0)
    })

    it('should not retry on 401 unauthorized error', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 401,
          headers: {},
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Unauthorized')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const mockKeyPool = {
        selectKey: async () => 'invalid-api-key',
        decrementQuota: () => {},
        getCurrentKey: () => 'invalid-api-key',
      }

      const compressor = new TinyPngApiCompressor(mockKeyPool, 8)

      await expect(compressor.compress(mockInputBuffer)).rejects.toThrow('认证失败')
      expect(compressor.getFailureCount()).toBe(1)
    })

    it('should retry on 429 rate limit error', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let attemptCount = 0
      let uploadCalled = false
      let downloadCalled = false

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        attemptCount++

        const mockRes = {
          statusCode: attemptCount === 1 ? 429 : 200,
          headers: {},
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              if (attemptCount === 1) {
                fn('Too Many Requests')
              }
              else if (!uploadCalled) {
                fn(JSON.stringify({ output: { url: mockOutputUrl } }))
                uploadCalled = true
              }
              else {
                fn(mockCompressedBuffer)
                downloadCalled = true
              }
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const mockKeyPool = {
        selectKey: async () => 'test-api-key',
        decrementQuota: () => {},
        getCurrentKey: () => 'test-api-key',
      }

      const compressor = new TinyPngApiCompressor(mockKeyPool, 8)
      const result = await compressor.compress(mockInputBuffer)

      expect(result).toEqual(mockCompressedBuffer)
      expect(attemptCount).toBeGreaterThanOrEqual(2)
      expect(uploadCalled).toBe(true)
      expect(downloadCalled).toBe(true)
    })

    it('should retry on network error (ECONNRESET)', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let attemptCount = 0
      let uploadCalled = false
      let downloadCalled = false

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        attemptCount++

        const mockReq = createMockClientRequest()

        if (attemptCount === 1) {
          // First attempt: network error
          setTimeout(() => {
            mockReq.emit('error', Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }))
          }, 0)
        }
        else {
          // Second attempt: success
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
                if (!uploadCalled) {
                  fn(JSON.stringify({ output: { url: mockOutputUrl } }))
                  uploadCalled = true
                }
                else {
                  fn(mockCompressedBuffer)
                  downloadCalled = true
                }
              }
              else if (event === 'end') {
                fn()
              }
            })
          }, 0)
        }

        return mockReq
      })

      const mockKeyPool = {
        selectKey: async () => 'test-api-key',
        decrementQuota: () => {},
        getCurrentKey: () => 'test-api-key',
      }

      const compressor = new TinyPngApiCompressor(mockKeyPool, 8)
      const result = await compressor.compress(mockInputBuffer)

      expect(result).toEqual(mockCompressedBuffer)
      expect(attemptCount).toBeGreaterThanOrEqual(2)
      expect(uploadCalled).toBe(true)
      expect(downloadCalled).toBe(true)
    })

    it('should stop retrying after maxRetries attempts', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      let attemptCount = 0

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        attemptCount++

        const mockRes = {
          statusCode: 500,
          headers: {},
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Internal Server Error')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const mockKeyPool = {
        selectKey: async () => 'test-api-key',
        decrementQuota: () => {},
        getCurrentKey: () => 'test-api-key',
      }

      const compressor = new TinyPngApiCompressor(mockKeyPool, 3) // 设置 maxRetries = 3

      await expect(compressor.compress(mockInputBuffer)).rejects.toThrow('TinyPNG 服务器错误')
      expect(attemptCount).toBe(4) // 初始尝试 + 3 次重试
      expect(compressor.getFailureCount()).toBe(4)
    }, 10000) // Increase timeout to 10 seconds
  })

  describe('getFailureCount() 正确返回失败次数', () => {
    it('should return 0 for successful compression', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      let uploadCalled = false
      let downloadCalled = false

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
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
              if (!uploadCalled) {
                fn(JSON.stringify({ output: { url: mockOutputUrl } }))
                uploadCalled = true
              }
              else {
                fn(mockCompressedBuffer)
                downloadCalled = true
              }
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const mockKeyPool = {
        selectKey: async () => 'test-api-key',
        decrementQuota: () => {},
        getCurrentKey: () => 'test-api-key',
      }

      const compressor = new TinyPngApiCompressor(mockKeyPool, 8)
      await compressor.compress(mockInputBuffer)

      expect(uploadCalled).toBe(true)
      expect(downloadCalled).toBe(true)
      expect(compressor.getFailureCount()).toBe(0)
    })
  })

  describe('TinyPngHttpClient compressionCount integration', () => {
    it('should return compressionCount in compress result', async () => {
      // Arrange: Mock upload with compressionCount, download with buffer
      let requestCount = 0

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        requestCount++

        // Upload request
        if (requestCount === 1) {
          const mockRes = {
            statusCode: 200,
            on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
              if (event === 'data') {
                process.nextTick(() => fn(JSON.stringify({
                  output: { url: 'https://api.tinify.com/output/test.png' },
                  compressionCount: 123,
                })))
              }
              else if (event === 'end') {
                process.nextTick(() => fn())
              }
              return mockRes
            }),
          }
          callback(mockRes)
          return createMockClientRequest()
        }

        // Download request
        const mockRes = {
          statusCode: 200,
          on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
            if (event === 'data') {
              process.nextTick(() => fn(createMockPngBuffer(512)))
            }
            else if (event === 'end') {
              process.nextTick(() => fn())
            }
            return mockRes
          }),
        }
        callback(mockRes)
        return createMockClientRequest()
      })

      // Act: Compress image
      const { TinyPngHttpClient } = await import('../http-client')
      const client = new TinyPngHttpClient()
      const result = await client.compress('test-api-key', createMockPngBuffer(1024))

      // Assert: Result contains both buffer and compressionCount
      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.buffer.byteLength).toBe(512)
      expect(result.compressionCount).toBe(123)
    })

    it('should handle undefined compressionCount in API response', async () => {
      // Arrange: Mock upload without compressionCount field
      let requestCount = 0

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        requestCount++

        // Upload request (no compressionCount field)
        if (requestCount === 1) {
          const mockRes = {
            statusCode: 200,
            on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
              if (event === 'data') {
                process.nextTick(() => fn(JSON.stringify({
                  output: { url: 'https://api.tinify.com/output/test.png' },
                  // No compressionCount field
                })))
              }
              else if (event === 'end') {
                process.nextTick(() => fn())
              }
              return mockRes
            }),
          }
          callback(mockRes)
          return createMockClientRequest()
        }

        // Download request
        const mockRes = {
          statusCode: 200,
          on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
            if (event === 'data') {
              process.nextTick(() => fn(createMockPngBuffer(512)))
            }
            else if (event === 'end') {
              process.nextTick(() => fn())
            }
            return mockRes
          }),
        }
        callback(mockRes)
        return createMockClientRequest()
      })

      // Act: Compress image
      const { TinyPngHttpClient } = await import('../http-client')
      const client = new TinyPngHttpClient()
      const result = await client.compress('test-api-key', createMockPngBuffer(1024))

      // Assert: compressionCount defaults to 0 when not in response
      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.compressionCount).toBe(0)
    })
  })

  describe('TinyPngWebCompressor user-agents integration', () => {
    it('should compress image using user-agents generated headers', async () => {
      // Arrange: Mock HTTPS with success response
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
            if (event === 'data') {
              process.nextTick(() => fn(JSON.stringify({ output: { url: 'https://tinypng.com/output/test.png' } })))
            }
            else if (event === 'end') {
              process.nextTick(() => fn())
            }
            return mockRes
          }),
        }
        callback(mockRes)

        // Verify headers contain User-Agent and X-Forwarded-For
        expect(options.headers).toBeDefined()
        expect(options.headers['User-Agent']).toBeDefined()
        expect(options.headers['X-Forwarded-For']).toBeDefined()

        return createMockClientRequest()
      })

      // Act: Compress image
      const { TinyPngWebCompressor } = await import('../web-compressor')
      const compressor = new TinyPngWebCompressor()
      await compressor.compress(createMockPngBuffer(1024))

      // Assert: Headers were generated and used
      expect(requestSpy).toHaveBeenCalled()
    })
  })

  describe('compression-count cache integration', () => {
    beforeEach(async () => {
      // Clear cache before each test
      const { clearCompressionCountCache } = await import('../../keys/quota')
      clearCompressionCountCache()
    })

    it('should cache compression-count after queryQuota call', async () => {
      // Arrange: Mock HTTPS response
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
            if (event === 'data') {
              process.nextTick(() => fn(JSON.stringify({ compressionCount: 42 })))
            }
            else if (event === 'end') {
              process.nextTick(() => fn())
            }
            return mockRes
          }),
        }
        callback(mockRes)
        return createMockClientRequest()
      })

      // Act: First queryQuota call
      const { queryQuota, getCachedCompressionCount } = await import('../../keys/quota')
      const result1 = await queryQuota('test-api-key')

      // Assert: HTTP request sent, cache populated
      expect(requestSpy).toHaveBeenCalled()
      expect(result1).toBe(458) // 500 - 42
      expect(getCachedCompressionCount('test-api-key')).toBe(42)

      // Act: Second queryQuota call (should use cache)
      vi.clearAllMocks()
      const result2 = await queryQuota('test-api-key')

      // Assert: No HTTP request sent, cache hit
      expect(requestSpy).not.toHaveBeenCalled()
      expect(result2).toBe(458)
    })

    it('should update cache after compress operation', async () => {
      // Arrange: Setup mocks and compressor
      let requestCount = 0
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        requestCount++

        // Upload
        if (requestCount === 1) {
          const mockRes = {
            statusCode: 200,
            on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
              if (event === 'data') {
                process.nextTick(() => fn(JSON.stringify({
                  output: { url: 'https://api.tinify.com/output/test.png' },
                  compressionCount: 100,
                })))
              }
              else if (event === 'end') {
                process.nextTick(() => fn())
              }
              return mockRes
            }),
          }
          callback(mockRes)
          return createMockClientRequest()
        }

        // Download
        const mockRes = {
          statusCode: 200,
          on: vi.fn().mockImplementation((event: string, fn: (...args: any[]) => any) => {
            if (event === 'data') {
              process.nextTick(() => fn(createMockPngBuffer(512)))
            }
            else if (event === 'end') {
              process.nextTick(() => fn())
            }
            return mockRes
          }),
        }
        callback(mockRes)
        return createMockClientRequest()
      })

      // Act: Compress image
      const { TinyPngHttpClient } = await import('../http-client')
      const { getCachedCompressionCount } = await import('../../keys/quota')
      const client = new TinyPngHttpClient()
      await client.compress('test-api-key', createMockPngBuffer(1024))

      // Assert: Cache updated with new compressionCount
      expect(getCachedCompressionCount('test-api-key')).toBe(100)
    })
  })
})
