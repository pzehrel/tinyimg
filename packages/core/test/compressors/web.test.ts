import type { HttpClient } from '../../src/http-client'
import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { webCompress } from '../../src/compressors/web'
import { ClientError, ConnectionError, ServerError } from '../../src/errors'

function createMockClient(
  requestImpl: HttpClient['request'],
  downloadImpl?: HttpClient['download'],
): HttpClient {
  return {
    request: vi.fn(requestImpl),
    download: vi.fn(downloadImpl ?? (async () => Buffer.from('compressed'))),
  } as unknown as HttpClient
}

describe('webCompress', () => {
  it('returns compressed buffer and correct compressor name on success', async () => {
    const client = createMockClient(
      async () => ({
        status: 200,
        headers: {},
        data: Buffer.from(JSON.stringify({ output: { url: 'https://tinypng.com/output/123' } })),
      }),
      async () => Buffer.from('compressed-data'),
    )

    const result = await webCompress(Buffer.from('input'), client)
    expect(result.buffer.toString()).toBe('compressed-data')
    expect(result.compressor).toBe('WebCompressor')
  })

  it('throws ClientError when output url is missing', async () => {
    const client = createMockClient(
      async () => ({
        status: 200,
        headers: {},
        data: Buffer.from(JSON.stringify({ output: {} })),
      }),
    )

    await expect(webCompress(Buffer.from('input'), client)).rejects.toThrow(
      ClientError,
    )
  })

  it('throws ClientError for invalid JSON response', async () => {
    const client = createMockClient(
      async () => ({
        status: 200,
        headers: {},
        data: Buffer.from('not-json'),
      }),
    )

    await expect(webCompress(Buffer.from('input'), client)).rejects.toThrow(
      ClientError,
    )
  })

  it('maps 400 to ClientError and fails fast', async () => {
    const client = createMockClient(
      async () => ({
        status: 400,
        headers: {},
        data: Buffer.from(''),
      }),
    )

    await expect(webCompress(Buffer.from('input'), client)).rejects.toThrow(
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

    await expect(webCompress(Buffer.from('input'), client, 0)).rejects.toThrow(
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
          status: 200,
          headers: {},
          data: Buffer.from(JSON.stringify({ output: { url: 'https://tinypng.com/output/ok' } })),
        }
      },
      async () => Buffer.from('recovered'),
    )

    const result = await webCompress(Buffer.from('input'), client, 0)
    expect(result.buffer.toString()).toBe('recovered')
    expect(calls).toBe(2)
  })

  it('wraps network errors in ConnectionError and preserves cause', async () => {
    const client = createMockClient(async () => {
      throw new Error('ECONNREFUSED')
    })

    try {
      await webCompress(Buffer.from('input'), client)
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
        status: 200,
        headers: {},
        data: Buffer.from(JSON.stringify({ output: { url: 'https://tinypng.com/output/123' } })),
      }),
      async () => {
        throw new ClientError('download failed', 0)
      },
    )

    await expect(webCompress(Buffer.from('input'), client)).rejects.toThrow(
      ClientError,
    )
  })
})
