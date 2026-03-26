import { Buffer } from 'node:buffer'
import type { IncomingMessage } from 'node:http'
import * as https from 'node:https'
import tinify from 'tinify'
import { vi } from 'vitest'

/**
 * Create a mock PNG buffer with valid PNG magic bytes.
 *
 * PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
 *
 * @param size - Target size in bytes (minimum 8 bytes for magic bytes + minimal chunks)
 * @returns Buffer with PNG magic bytes followed by padding
 *
 * @example
 * ```ts
 * const png = createMockPngBuffer(1024) // 1KB PNG
 * const large = createMockPngBuffer(6 * 1024 * 1024) // 6MB PNG
 * ```
 */
export function createMockPngBuffer(size: number): Buffer {
  if (size < 8) {
    throw new Error('PNG buffer must be at least 8 bytes for magic bytes')
  }

  const buffer = Buffer.alloc(size)

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  buffer[0] = 0x89
  buffer[1] = 0x50
  buffer[2] = 0x4E
  buffer[3] = 0x47
  buffer[4] = 0x0D
  buffer[5] = 0x0A
  buffer[6] = 0x1A
  buffer[7] = 0x0A

  // Fill rest with zeros (valid but empty PNG chunks would be more complex)
  return buffer
}

/**
 * Create a mock JPG buffer with valid JPG magic bytes.
 *
 * JPG magic bytes: FF D8 FF
 *
 * @param size - Target size in bytes (minimum 3 bytes for magic bytes)
 * @returns Buffer with JPG magic bytes followed by padding
 *
 * @example
 * ```ts
 * const jpg = createMockJpgBuffer(2048) // 2KB JPG
 * ```
 */
export function createMockJpgBuffer(size: number): Buffer {
  if (size < 3) {
    throw new Error('JPG buffer must be at least 3 bytes for magic bytes')
  }

  const buffer = Buffer.alloc(size)

  // JPG magic bytes: FF D8 FF
  buffer[0] = 0xFF
  buffer[1] = 0xD8
  buffer[2] = 0xFF

  // Fill rest with zeros
  return buffer
}

/**
 * Small PNG buffer constant (1KB) for testing.
 */
export const SMALL_PNG = createMockPngBuffer(1024)

/**
 * Large PNG buffer constant (6MB) for testing file size limits.
 * Exceeds the 5MB limit for TinyPngApiCompressor.
 */
export const LARGE_PNG = createMockPngBuffer(6 * 1024 * 1024)

/**
 * Mock tinify API for successful compression.
 *
 * @param responseBuffer - The buffer to return from toBuffer()
 *
 * @example
 * ```ts
 * const mockTinify = mockTinifySuccess(compressedBuffer)
 * // tinify.fromBuffer().toBuffer() will return compressedBuffer
 * ```
 */
export function mockTinifySuccess(responseBuffer: Buffer): void {
  const mockSource = {
    toBuffer: vi.fn().mockResolvedValue(responseBuffer),
  }

  vi.spyOn(tinify, 'fromBuffer').mockReturnValue(mockSource as any)
}

/**
 * Mock tinify.compressionCount for quota testing.
 *
 * @param count - The compression count to return
 *
 * @example
 * ```ts
 * mockTinifyQuota(42)
 * console.log(tinify.compressionCount) // 42
 * ```
 */
export function mockTinifyQuota(count: number): void {
  Object.defineProperty(tinify, 'compressionCount', {
    value: count,
    writable: true,
    configurable: true,
  })
}

/**
 * Mock tinify API for validation errors.
 *
 * @param message - Error message to throw
 *
 * @example
 * ```ts
 * mockTinifyValidationError('Invalid API key')
 * // tinify.fromBuffer() will throw with message
 * ```
 */
export function mockTinifyValidationError(message: string): void {
  vi.spyOn(tinify, 'fromBuffer').mockImplementation(() => {
    throw new Error(message)
  })
}

/**
 * Reset all tinify mocks to their original behavior.
 *
 * @example
 * ```ts
 * afterEach(() => {
 *   resetTinifyMocks()
 * })
 * ```
 */
export function resetTinifyMocks(): void {
  vi.restoreAllMocks()
}

/**
 * Mock HTTPS request for successful tinypng.com web interface response.
 *
 * @param responseBuffer - The compressed image buffer to return
 *
 * @example
 * ```ts
 * const mockRequest = mockHttpsSuccess(compressedBuffer)
 * // https.request will call the callback with compressedBuffer
 * ```
 */
export function mockHttpsSuccess(responseBuffer: Buffer): void {
  vi.spyOn(https, 'request').mockImplementation((
    _options: any,
    _callback?: any,
  ) => {
    const mockRes = {
      statusCode: 200,
      headers: {
        'content-type': 'image/png',
      },
      on: vi.fn(),
      data: Buffer.alloc(0),
      setEncoding: vi.fn(),
    }

    // Simulate end of response
    const onEnd = () => {
      // Call the callback with mock response
      const callback = _callback as ((res: IncomingMessage) => void) | undefined
      if (callback) {
        callback(mockRes as any)
      }

      // Emit data and end events
      setTimeout(() => {
        const listeners = (mockRes.on as any).mock.calls
        listeners.forEach(([event, fn]: [string, (...args: any[]) => any]) => {
          if (event === 'data') {
            fn(responseBuffer)
          }
          else if (event === 'end') {
            fn()
          }
        })
      }, 0)
    }

    // Return mock request object
    return {
      write: vi.fn(),
      end: vi.fn().mockImplementation(() => {
        onEnd()
      }),
      on: vi.fn(),
    } as any
  })
}

/**
 * Mock HTTPS request for HTTP errors.
 *
 * @param statusCode - HTTP status code (e.g., 400, 500, 503)
 * @param message - Error message
 *
 * @example
 * ```ts
 * mockHttpsFailure(429, 'Too Many Requests')
 * // https.request will return 429 status
 * ```
 */
export function mockHttpsFailure(statusCode: number, message: string): void {
  vi.spyOn(https, 'request').mockImplementation((
    _options: any,
    _callback?: any,
  ) => {
    const mockRes = {
      statusCode,
      headers: {
        'content-type': 'application/json',
      },
      on: vi.fn(),
      setEncoding: vi.fn(),
    }

    // Call callback with error response
    const callback = _callback as ((res: IncomingMessage) => void) | undefined
    if (callback) {
      callback(mockRes as any)
    }

    // Emit error event
    setTimeout(() => {
      const listeners = (mockRes.on as any).mock.calls
      listeners.forEach(([event, fn]: [string, (...args: any[]) => void]) => {
        if (event === 'error') {
          fn(new Error(message))
        }
        else if (event === 'data') {
          fn(Buffer.from(JSON.stringify({ error: message })))
        }
        else if (event === 'end') {
          fn()
        }
      })
    }, 0)

    return {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    } as any
  })
}

/**
 * Reset all HTTPS mocks to their original behavior.
 *
 * @example
 * ```ts
 * afterEach(() => {
 *   resetHttpsMocks()
 * })
 * ```
 */
export function resetHttpsMocks(): void {
  vi.restoreAllMocks()
}

/**
 * Create a mock HTTPS ClientRequest object with all required stream methods.
 *
 * This mock includes all methods required by FormData.pipe() and Node.js streams:
 * - removeListener, on, emit, once (event handling)
 * - write, end, destroy (stream control)
 * - eventNames, setMaxListeners, listenerCount (EventEmitter API)
 *
 * The emit() method is connected to the on() spy, so when you emit an event,
 * it will call any registered handlers.
 *
 * @returns Mock ClientRequest object
 *
 * @example
 * ```ts
 * const mockReq = createMockClientRequest()
 * mockReq.on('error', handler)
 * mockReq.emit('error', error) // Will call handler
 * ```
 */
export function createMockClientRequest(): any {
  const handlers: Map<string, Array<(...args: any[]) => void>> = new Map()

  const mockReq = {
    // Event methods (required by FormData.pipe())
    removeListener: vi.fn((event: string, fn: (...args: any[]) => void) => {
      const eventHandlers = handlers.get(event)
      if (eventHandlers) {
        const index = eventHandlers.indexOf(fn)
        if (index > -1) {
          eventHandlers.splice(index, 1)
        }
      }
      return mockReq
    }),
    on: vi.fn((event: string, fn: (...args: any[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, [])
      }
      handlers.get(event)!.push(fn)
      return mockReq
    }),
    emit: vi.fn((event: string, ...args: any[]) => {
      const eventHandlers = handlers.get(event)
      if (eventHandlers) {
        eventHandlers.forEach((fn) => {
          if (typeof fn === 'function') {
            fn(...args)
          }
        })
      }
      return true
    }),
    once: vi.fn((event: string, fn: (...args: any[]) => void) => {
      const onceWrapper = (...args: any[]) => {
        mockReq.removeListener(event, onceWrapper)
        fn(...args)
      }
      mockReq.on(event, onceWrapper)
      return mockReq
    }),
    // EventEmitter methods required by streams
    eventNames: vi.fn(() => {
      return Array.from(handlers.keys())
    }),
    setMaxListeners: vi.fn((_n: number) => {
      // No-op for mock
    }),
    listenerCount: vi.fn((event: string) => {
      return handlers.get(event)?.length || 0
    }),

    // Stream methods (required by FormData.pipe())
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),

    // Additional ClientRequest properties
    writable: true,
    aborted: false,
    method: 'POST',
    path: '/backend/opt/shrink',
    headers: {},
  }

  return mockReq
}
