import type { HttpClient } from '../../src/http-client'
import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { apiCompress } from '../../src/compressors/api'
import { AccountError, ClientError, ConnectionError, ServerError } from '../../src/errors'

function createMockClient(
  requestImpl: HttpClient['request'],
  downloadImpl?: HttpClient['download'],
): HttpClient {
  return {
    request: vi.fn(requestImpl),
    download: vi.fn(downloadImpl ?? (async () => Buffer.from('compressed'))),
  } as unknown as HttpClient
}

describe('apiCompress', () => {
  it('returns compressed buffer and correct compressor name on success', async () => {
    const client = createMockClient(
      async () => ({
        status: 201,
        headers: { location: 'https://api.tinify.com/output/123' },
        data: Buffer.from(''),
      }),
      async () => Buffer.from('compressed-data'),
    )

    const result = await apiCompress(Buffer.from('input'), 'test-key', client)
    expect(result.buffer.toString()).toBe('compressed-data')
    expect(result.compressor).toBe('ApiCompressor')
  })

  it('handles array location header', async () => {
    const client = createMockClient(
      async () => ({
        status: 201,
        headers: { location: ['https://api.tinify.com/output/456'] },
        data: Buffer.from(''),
      }),
      async () => Buffer.from('compressed-array'),
    )

    const result = await apiCompress(Buffer.from('input'), 'test-key', client)
    expect(result.buffer.toString()).toBe('compressed-array')
  })

  it('throws ClientError when location header is missing', async () => {
    const client = createMockClient(
      async () => ({
        status: 201,
        headers: {},
        data: Buffer.from(''),
      }),
    )

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      ClientError,
    )
  })

  it('maps 401 to AccountError and fails fast', async () => {
    const client = createMockClient(
      async () => ({
        status: 401,
        headers: {},
        data: Buffer.from(''),
      }),
    )

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      AccountError,
    )
    expect(client.request).toHaveBeenCalledTimes(1)
  })

  it('maps 429 to AccountError and fails fast', async () => {
    const client = createMockClient(
      async () => ({
        status: 429,
        headers: {},
        data: Buffer.from(''),
      }),
    )

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      AccountError,
    )
    expect(client.request).toHaveBeenCalledTimes(1)
  })

  it('maps 400 to ClientError and fails fast', async () => {
    const client = createMockClient(
      async () => ({
        status: 400,
        headers: {},
        data: Buffer.from(''),
      }),
    )

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      ClientError,
    )
    expect(client.request).toHaveBeenCalledTimes(1)
  })

  it('maps unexpected 200 to ClientError and fails fast', async () => {
    const client = createMockClient(
      async () => ({
        status: 200,
        headers: {},
        data: Buffer.from(''),
      }),
    )

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      ClientError,
    )
    expect(client.request).toHaveBeenCalledTimes(1)
  })

  it('maps 500 to ServerError and retries up to 2 times', async () => {
    const client = createMockClient(
      async () => ({
        status: 500,
        headers: {},
        data: Buffer.from(''),
      }),
    )

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      ServerError,
    )
    expect(client.request).toHaveBeenCalledTimes(3)
  })

  it('recovers after a single 5xx error', async () => {
    let calls = 0
    const client = createMockClient(
      async () => {
        calls++
        if (calls === 1) {
          return { status: 503, headers: {}, data: Buffer.from('') }
        }
        return {
          status: 201,
          headers: { location: 'https://api.tinify.com/output/ok' },
          data: Buffer.from(''),
        }
      },
      async () => Buffer.from('recovered'),
    )

    const result = await apiCompress(Buffer.from('input'), 'test-key', client)
    expect(result.buffer.toString()).toBe('recovered')
    expect(calls).toBe(2)
  })

  it('wraps network errors in ConnectionError and preserves cause', async () => {
    const client = createMockClient(async () => {
      throw new Error('ECONNREFUSED')
    })

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      ConnectionError,
    )

    try {
      await apiCompress(Buffer.from('input'), 'test-key', client)
    }
    catch (err) {
      expect(err).toBeInstanceOf(ConnectionError)
      expect((err as ConnectionError).message).toBe('ECONNREFUSED')
      expect((err as ConnectionError).cause).toBeInstanceOf(Error)
      expect((err as ConnectionError).cause!.message).toBe('ECONNREFUSED')
    }
  })

  it('re-throws ClientError from download without wrapping', async () => {
    const client = createMockClient(
      async () => ({
        status: 201,
        headers: { location: 'https://api.tinify.com/output/123' },
        data: Buffer.from(''),
      }),
      async () => {
        throw new ClientError('download failed', 0)
      },
    )

    await expect(apiCompress(Buffer.from('input'), 'test-key', client)).rejects.toThrow(
      ClientError,
    )
  })
})
