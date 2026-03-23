/* eslint-disable node/prefer-global/buffer */
import https from 'node:https'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockClientRequest } from '../../compress/__tests__/fixtures'
import { validateKey } from '../validator'

describe('validateKey', () => {
  let requestSpy: any

  beforeEach(() => {
    requestSpy = vi.spyOn(https, 'request')
  })

  it('should return true for valid API key', async () => {
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
            fn(Buffer.from('')) // Empty response for validation
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await validateKey('valid-api-key')
    expect(result).toBe(true)
  })

  it('should return false for invalid API key (401)', async () => {
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
            fn(Buffer.from('Unauthorized'))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await validateKey('invalid-api-key')
    expect(result).toBe(false)
  })

  it('should return false for invalid API key (403)', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 403,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(Buffer.from('Forbidden'))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await validateKey('forbidden-api-key')
    expect(result).toBe(false)
  })

  it('should return false for other 4xx errors', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 400,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(Buffer.from('Bad Request'))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    const result = await validateKey('test-api-key')
    expect(result).toBe(false)
  })

  it('should throw error on 500 server error', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
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
            fn(Buffer.from('Internal Server Error'))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    await expect(validateKey('test-api-key')).rejects.toThrow()
  })

  it('should throw error on 503 server error', async () => {
    requestSpy.mockImplementation((url: any, options: any, callback: any) => {
      const mockRes = {
        statusCode: 503,
        headers: {},
        on: vi.fn(),
      }

      callback(mockRes)

      setTimeout(() => {
        const listeners = mockRes.on.mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(Buffer.from('Service Unavailable'))
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)

      return createMockClientRequest()
    })

    await expect(validateKey('test-api-key')).rejects.toThrow()
  })

  it('should throw error on network errors', async () => {
    requestSpy.mockImplementation(() => {
      const mockReq = createMockClientRequest()
      setTimeout(() => {
        mockReq.emit('error', Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }))
      }, 0)
      return mockReq
    })

    await expect(validateKey('test-api-key')).rejects.toThrow('Connection reset')
  })

  it('should handle error with statusCode 401 from catch block', async () => {
    requestSpy.mockImplementation(() => {
      const mockReq = createMockClientRequest()
      setTimeout(() => {
        mockReq.emit('error', Object.assign(new Error('Unauthorized'), { statusCode: 401, errorCode: 'AUTH_FAILED' }))
      }, 0)
      return mockReq
    })

    const result = await validateKey('invalid-api-key')
    expect(result).toBe(false)
  })

  it('should handle error with statusCode 403 from catch block', async () => {
    requestSpy.mockImplementation(() => {
      const mockReq = createMockClientRequest()
      setTimeout(() => {
        mockReq.emit('error', Object.assign(new Error('Forbidden'), { statusCode: 403, errorCode: 'AUTH_FAILED' }))
      }, 0)
      return mockReq
    })

    const result = await validateKey('forbidden-api-key')
    expect(result).toBe(false)
  })

  it('should handle error with errorCode AUTH_FAILED from catch block', async () => {
    requestSpy.mockImplementation(() => {
      const mockReq = createMockClientRequest()
      setTimeout(() => {
        mockReq.emit('error', Object.assign(new Error('Auth failed'), { errorCode: 'AUTH_FAILED' }))
      }, 0)
      return mockReq
    })

    const result = await validateKey('invalid-api-key')
    expect(result).toBe(false)
  })

  it('should re-throw network errors without statusCode', async () => {
    requestSpy.mockImplementation(() => {
      const mockReq = createMockClientRequest()
      setTimeout(() => {
        mockReq.emit('error', Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }))
      }, 0)
      return mockReq
    })

    await expect(validateKey('test-api-key')).rejects.toThrow('ETIMEDOUT')
  })
})
