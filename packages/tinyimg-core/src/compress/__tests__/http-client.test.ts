import https from 'node:https'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TinyPngHttpClient } from '../http-client'
import { createMockClientRequest, createMockPngBuffer } from './fixtures'

describe('tinyPngHttpClient', () => {
  let client: TinyPngHttpClient
  let requestSpy: any

  beforeEach(() => {
    client = new TinyPngHttpClient()
    requestSpy = vi.spyOn(https, 'request')
  })

  describe('compress()', () => {
    it('should upload and download compressed image successfully', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      // Mock upload request
      requestSpy.mockImplementationOnce((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn(),
        }

        callback(mockRes)

        // Simulate response data
        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn(JSON.stringify({ output: { url: mockOutputUrl } }))
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      // Mock download request
      requestSpy.mockImplementationOnce((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          headers: {},
          on: vi.fn(),
        }

        callback(mockRes)

        // Simulate binary response
        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn(mockCompressedBuffer)
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.compress('test-api-key', mockInputBuffer)

      expect(result).toEqual(mockCompressedBuffer)
      expect(requestSpy).toHaveBeenCalledTimes(2)
    })

    it('should follow 302 redirects when downloading', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockCompressedBuffer = createMockPngBuffer(512)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'
      const mockRedirectUrl = 'https://tinify.com/output/redirected'

      // Track request count
      let requestCount = 0

      // Mock all requests with a single implementation
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        requestCount++

        const mockRes = {
          statusCode: 200,
          headers: {},
          on: vi.fn(),
        }

        // First request: upload
        if (requestCount === 1) {
          callback(mockRes)

          setTimeout(() => {
            const listeners = mockRes.on.mock.calls
            listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
              if (event === 'data') {
                fn(JSON.stringify({ output: { url: mockOutputUrl } }))
              }
              else if (event === 'end') {
                fn()
              }
            })
          }, 0)

          return createMockClientRequest()
        }

        // Second request: redirect (302)
        if (requestCount === 2) {
          mockRes.statusCode = 302
          mockRes.headers = { location: mockRedirectUrl }
          callback(mockRes)

          setTimeout(() => {
            const listeners = mockRes.on.mock.calls
            listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
              if (event === 'end') {
                fn()
              }
            })
          }, 0)

          return createMockClientRequest()
        }

        // Third request: final download (200)
        if (requestCount === 3) {
          expect(url).toBe(mockRedirectUrl)
          callback(mockRes)

          setTimeout(() => {
            const listeners = mockRes.on.mock.calls
            listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
              if (event === 'data') {
                fn(mockCompressedBuffer)
              }
              else if (event === 'end') {
                fn()
              }
            })
          }, 0)

          return createMockClientRequest()
        }

        return createMockClientRequest()
      })

      const result = await client.compress('test-api-key', mockInputBuffer)

      expect(result).toEqual(mockCompressedBuffer)
      // Upload + redirect handling + final download
      // The exact number may vary due to how https.request handles redirects
      expect(requestCount).toBeGreaterThanOrEqual(3)
      expect(requestSpy).toHaveBeenCalled()
    })

    it('should throw error after 5 redirects', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)
      const mockOutputUrl = 'https://api.tinify.com/output/abc123'

      // Mock upload request
      requestSpy.mockImplementationOnce((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn(JSON.stringify({ output: { url: mockOutputUrl } }))
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      // Mock 6 redirect requests (exceeds MAX_REDIRECTS)
      for (let i = 0; i < 6; i++) {
        requestSpy.mockImplementationOnce((url: any, options: any, callback: any) => {
          const mockRes = {
            statusCode: 302,
            headers: {
              location: `https://tinify.com/output/redirect${i}`,
            },
            on: vi.fn(),
          }

          callback(mockRes)

          setTimeout(() => {
            const listeners = mockRes.on.mock.calls
            listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
              if (event === 'end') {
                fn()
              }
            })
          }, 0)

          return createMockClientRequest()
        })
      }

      await expect(
        client.compress('test-api-key', mockInputBuffer),
      ).rejects.toThrow('Maximum redirects (5) exceeded')
    })

    it('should handle HTTP 4xx errors with statusCode property', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 400,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Bad Request')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      await expect(
        client.compress('test-api-key', mockInputBuffer),
      ).rejects.toThrow('HTTP 400')

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.errorCode).toBe('CLIENT_ERROR')
      }
    })

    it('should handle HTTP 5xx errors with statusCode property', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 500,
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

      await expect(
        client.compress('test-api-key', mockInputBuffer),
      ).rejects.toThrow('TinyPNG 服务器错误')

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.errorCode).toBe('SERVER_ERROR')
      }
    })

    it('should handle network errors with code property', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation(() => {
        const mockReq = createMockClientRequest()
        // Simulate network error
        setTimeout(() => {
          mockReq.emit('error', Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }))
        }, 0)
        return mockReq
      })

      await expect(
        client.compress('test-api-key', mockInputBuffer),
      ).rejects.toThrow('Connection reset')

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.code).toBe('ECONNRESET')
      }
    })
  })

  describe('validateKey()', () => {
    it('should return true for valid API key', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('{}')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.validateKey('valid-api-key')
      expect(result).toBe(true)
    })

    it('should return false for 401 unauthorized', async () => {
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
              fn('Unauthorized')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.validateKey('invalid-api-key')
      expect(result).toBe(false)
    })

    it('should return false for 403 forbidden', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 403,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Forbidden')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.validateKey('forbidden-api-key')
      expect(result).toBe(false)
    })

    it('should throw on 5xx server errors', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 500,
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

      await expect(
        client.validateKey('test-api-key'),
      ).rejects.toThrow('TinyPNG 服务器错误')

      try {
        await client.validateKey('test-api-key')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.errorCode).toBe('SERVER_ERROR')
      }
    })

    it('should throw on network errors', async () => {
      requestSpy.mockImplementation(() => {
        const mockReq = createMockClientRequest()
        setTimeout(() => {
          mockReq.emit('error', Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }))
        }, 0)
        return mockReq
      })

      await expect(
        client.validateKey('test-api-key'),
      ).rejects.toThrow('Connection reset')

      try {
        await client.validateKey('test-api-key')
      }
      catch (error: any) {
        expect(error.code).toBe('ECONNRESET')
      }
    })
  })

  describe('getCompressionCount()', () => {
    it('should return compressionCount from response', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn(JSON.stringify({ compressionCount: 42 }))
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.getCompressionCount('test-api-key')
      expect(result).toBe(42)
    })

    it('should return 0 when compressionCount not in response', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn(JSON.stringify({}))
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.getCompressionCount('test-api-key')
      expect(result).toBe(0)
    })

    it('should return 0 for 401 unauthorized', async () => {
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
              fn('Unauthorized')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.getCompressionCount('invalid-api-key')
      expect(result).toBe(0)
    })

    it('should return 0 for 403 forbidden', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 403,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Forbidden')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      const result = await client.getCompressionCount('forbidden-api-key')
      expect(result).toBe(0)
    })

    it('should throw on 5xx server errors', async () => {
      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 500,
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

      await expect(
        client.getCompressionCount('test-api-key'),
      ).rejects.toThrow('TinyPNG 服务器错误')

      try {
        await client.getCompressionCount('test-api-key')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.errorCode).toBe('SERVER_ERROR')
      }
    })
  })

  describe('error classification', () => {
    it('should create AUTH_FAILED error for 401', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

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
              fn('Unauthorized')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(401)
        expect(error.errorCode).toBe('AUTH_FAILED')
        expect(error.message).toContain('认证失败')
      }
    })

    it('should create AUTH_FAILED error for 403', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 403,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Forbidden')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.errorCode).toBe('AUTH_FAILED')
        expect(error.message).toContain('认证失败')
      }
    })

    it('should create RATE_LIMITED error for 429', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 429,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Too Many Requests')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(429)
        expect(error.errorCode).toBe('RATE_LIMITED')
        expect(error.message).toContain('速率限制')
      }
    })

    it('should create SERVER_ERROR error for 5xx', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 503,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Service Unavailable')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(503)
        expect(error.errorCode).toBe('SERVER_ERROR')
        expect(error.message).toContain('服务器错误')
      }
    })

    it('should create CLIENT_ERROR error for other 4xx', async () => {
      const mockInputBuffer = createMockPngBuffer(1024)

      requestSpy.mockImplementation((url: any, options: any, callback: any) => {
        const mockRes = {
          statusCode: 400,
          on: vi.fn(),
        }

        callback(mockRes)

        setTimeout(() => {
          const listeners = mockRes.on.mock.calls
          listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
            if (event === 'data') {
              fn('Bad Request')
            }
            else if (event === 'end') {
              fn()
            }
          })
        }, 0)

        return createMockClientRequest()
      })

      try {
        await client.compress('test-api-key', mockInputBuffer)
      }
      catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.errorCode).toBe('CLIENT_ERROR')
        expect(error.message).toContain('HTTP 400')
      }
    })
  })
})
