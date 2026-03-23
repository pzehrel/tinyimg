import type { RequestOptions } from '../http-request'
import { Buffer } from 'node:buffer'
import https from 'node:https'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpRequest } from '../http-request'

// Mock https.request
vi.mock('node:https', () => ({
  default: {
    request: vi.fn(),
  },
}))

describe('httpRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send POST request and return JSON response with output.url', async () => {
    const mockResponse = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      data: Buffer.from(JSON.stringify({ output: { url: 'https://example.com/compressed.png' } })),
    }

    vi.mocked(https.request).mockImplementationOnce((url, options, callback) => {
      // Simulate async response
      setTimeout(() => {
        const res = {
          statusCode: mockResponse.statusCode,
          headers: mockResponse.headers,
          on: vi.fn((event, cb) => {
            if (event === 'data') {
              cb(mockResponse.data)
            }
            else if (event === 'end') {
              cb()
            }
          }),
        }
        callback(res)
      }, 0)
      return {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      } as any
    })

    const options: RequestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.from('test data'),
    }

    const result = await httpRequest<any>('https://api.tinify.com/shrink', options)

    expect(result.statusCode).toBe(200)
    expect(result.data).toEqual({ output: { url: 'https://example.com/compressed.png' } })
  })

  it('should send GET request and return Buffer response (image data)', async () => {
    const imageData = Buffer.from([0x89, 0x50, 0x4E, 0x47]) // PNG signature

    const mockResponse = {
      statusCode: 200,
      headers: {
        'content-type': 'image/png',
      },
      data: imageData,
    }

    vi.mocked(https.request).mockImplementationOnce((url, options, callback) => {
      setTimeout(() => {
        const res = {
          statusCode: mockResponse.statusCode,
          headers: mockResponse.headers,
          on: vi.fn((event, cb) => {
            if (event === 'data') {
              cb(mockResponse.data)
            }
            else if (event === 'end') {
              cb()
            }
          }),
        }
        callback(res)
      }, 0)
      return {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      } as any
    })

    const options: RequestOptions = {
      method: 'GET',
      headers: {},
    }

    const result = await httpRequest<Buffer>('url', options)

    expect(result.statusCode).toBe(200)
    expect(result.data).toEqual(imageData)
  })

  it('should follow 302 redirects (up to 5 times)', async () => {
    let requestCount = 0

    vi.mocked(https.request).mockImplementation((url, options, callback) => {
      requestCount++

      setTimeout(() => {
        // First 3 requests return 302, last one returns 200
        if (requestCount <= 3) {
          const res = {
            statusCode: 302,
            headers: {
              location: `https://redirect-${requestCount}.example.com`,
            },
            on: vi.fn((event, cb) => {
              if (event === 'end') {
                cb()
              }
            }),
          }
          callback(res)
        }
        else {
          const res = {
            statusCode: 200,
            headers: {},
            on: vi.fn((event, cb) => {
              if (event === 'data') {
                cb(Buffer.from('final response'))
              }
              else if (event === 'end') {
                cb()
              }
            }),
          }
          callback(res)
        }
      }, 0)

      return {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      } as any
    })

    const options: RequestOptions = {
      method: 'GET',
    }

    const result = await httpRequest('https://example.com', options)

    expect(requestCount).toBe(4) // 3 redirects + 1 final
    expect(result.statusCode).toBe(200)
  })

  it('should throw error when exceeding 5 redirects', async () => {
    vi.mocked(https.request).mockImplementation((url, options, callback) => {
      setTimeout(() => {
        const res = {
          statusCode: 302,
          headers: {
            location: 'https://redirect.example.com',
          },
          on: vi.fn((event, cb) => {
            if (event === 'end') {
              cb()
            }
          }),
        }
        callback(res)
      }, 0)

      return {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      } as any
    })

    const options: RequestOptions = {
      method: 'GET',
    }

    await expect(httpRequest('https://example.com', options)).rejects.toThrow('Maximum redirects (5) exceeded')
  })

  it('should accept all 2xx status codes as success', async () => {
    const statusCodes = [200, 201, 204, 206]

    for (const statusCode of statusCodes) {
      vi.mocked(https.request).mockImplementationOnce((url, options, callback) => {
        setTimeout(() => {
          const res = {
            statusCode,
            headers: {},
            on: vi.fn((event, cb) => {
              if (event === 'data') {
                cb(Buffer.from('{"success":true}'))
              }
              else if (event === 'end') {
                cb()
              }
            }),
          }
          callback(res)
        }, 0)

        return {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
        } as any
      })

      const options: RequestOptions = {
        method: 'GET',
      }

      const result = await httpRequest('https://example.com', options)

      expect(result.statusCode).toBe(statusCode)
    }
  })

  it('should accept all 3xx status codes and follow redirects', async () => {
    const redirectCodes = [301, 302, 303, 307, 308]

    for (const code of redirectCodes) {
      let requestCount = 0

      vi.mocked(https.request).mockImplementation((url, options, callback) => {
        requestCount++

        setTimeout(() => {
          if (requestCount === 1) {
            const res = {
              statusCode: code,
              headers: {
                location: 'https://final.example.com',
              },
              on: vi.fn((event, cb) => {
                if (event === 'end') {
                  cb()
                }
              }),
            }
            callback(res)
          }
          else {
            const res = {
              statusCode: 200,
              headers: {},
              on: vi.fn((event, cb) => {
                if (event === 'data') {
                  cb(Buffer.from('success'))
                }
                else if (event === 'end') {
                  cb()
                }
              }),
            }
            callback(res)
          }
        }, 0)

        return {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
        } as any
      })

      const options: RequestOptions = {
        method: 'GET',
      }

      const result = await httpRequest('https://example.com', options)

      expect(requestCount).toBe(2)
      expect(result.statusCode).toBe(200)
    }
  })

  it('should handle 4xx errors and return response with statusCode', async () => {
    const clientErrors = [400, 401, 403, 404]

    for (const statusCode of clientErrors) {
      vi.mocked(https.request).mockImplementationOnce((url, options, callback) => {
        setTimeout(() => {
          const res = {
            statusCode,
            headers: {},
            on: vi.fn((event, cb) => {
              if (event === 'data') {
                cb(Buffer.from('error message'))
              }
              else if (event === 'end') {
                cb()
              }
            }),
          }
          callback(res)
        }, 0)

        return {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
        } as any
      })

      const options: RequestOptions = {
        method: 'GET',
      }

      const result = await httpRequest('https://example.com', options)
      expect(result.statusCode).toBe(statusCode)
      expect(result.data).toEqual(Buffer.from('error message'))
    }
  })

  it('should handle 5xx errors and return response with statusCode', async () => {
    const serverErrors = [500, 502, 503]

    for (const statusCode of serverErrors) {
      vi.mocked(https.request).mockImplementationOnce((url, options, callback) => {
        setTimeout(() => {
          const res = {
            statusCode,
            headers: {},
            on: vi.fn((event, cb) => {
              if (event === 'data') {
                cb(Buffer.from('server error'))
              }
              else if (event === 'end') {
                cb()
              }
            }),
          }
          callback(res)
        }, 0)

        return {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
        } as any
      })

      const options: RequestOptions = {
        method: 'GET',
      }

      const result = await httpRequest('https://example.com', options)
      expect(result.statusCode).toBe(statusCode)
      expect(result.data).toEqual(Buffer.from('server error'))
    }
  })

  it('should handle network errors and preserve error.code', async () => {
    const networkError = new Error('Network error')
    ;(networkError as any).code = 'ECONNREFUSED'

    vi.mocked(https.request).mockImplementationOnce((_url, _options, _callback) => {
      setTimeout(() => {
        // Simulate error on request
      }, 0)

      return {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn((event, cb) => {
          if (event === 'error') {
            setTimeout(cb, 0, networkError)
          }
        }),
      } as any
    })

    const options: RequestOptions = {
      method: 'GET',
    }

    await expect(httpRequest('https://example.com', options)).rejects.toMatchObject({
      code: 'ECONNREFUSED',
    })
  })

  it('should support custom headers', async () => {
    const capturedOptions: any[] = []

    vi.mocked(https.request).mockImplementationOnce((url, options, callback) => {
      capturedOptions.push(options)

      setTimeout(() => {
        const res = {
          statusCode: 200,
          headers: {},
          on: vi.fn((event, cb) => {
            if (event === 'data') {
              cb(Buffer.from('success'))
            }
            else if (event === 'end') {
              cb()
            }
          }),
        }
        callback(res)
      }, 0)

      return {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      } as any
    })

    const options: RequestOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Test-Agent',
        'X-Custom-Header': 'custom-value',
      },
    }

    await httpRequest('https://example.com', options)

    expect(capturedOptions[0].headers).toMatchObject({
      'User-Agent': 'Test-Agent',
      'X-Custom-Header': 'custom-value',
    })
  })
})
