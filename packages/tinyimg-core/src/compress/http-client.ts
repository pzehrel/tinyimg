import { Buffer } from 'node:buffer'
import { httpRequest } from '../utils/http-request'

const TINYPNG_API_URL = 'https://api.tinify.com/shrink'

export interface CompressResult {
  buffer: Buffer
  compressionCount: number
}

class TinyPngError extends Error {
  statusCode: number
  errorCode: string

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message)
    this.name = 'TinyPngError'
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

export class TinyPngHttpClient {
  /**
   * Compress an image by uploading to TinyPNG API and downloading the result.
   *
   * @param key - TinyPNG API key
   * @param buffer - Image buffer to compress
   * @returns Compressed image buffer and compression count
   */
  async compress(key: string, buffer: Buffer): Promise<CompressResult> {
    const { url, compressionCount } = await this.uploadImage(key, buffer)
    return this.downloadImage(url, key, compressionCount)
  }

  /**
   * Validate if an API key is valid.
   *
   * @param key - TinyPNG API key to validate
   * @returns true if key is valid, false otherwise
   */
  async validateKey(key: string): Promise<boolean> {
    const response = await httpRequest<{}>( // eslint-disable-line ts/no-empty-object-type
      TINYPNG_API_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': this.createAuthHeader(key),
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.alloc(0),
      },
    )

    // Success: 2xx status codes
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return true
    }

    // Auth failed: 401/403 return false
    if (response.statusCode === 401 || response.statusCode === 403) {
      return false
    }

    // Other 4xx errors return false
    if (response.statusCode >= 400 && response.statusCode < 500) {
      return false
    }

    // 5xx errors should be retried
    throw new Error(`TinyPNG 服务器错误: HTTP ${response.statusCode}`)
  }

  /**
   * Get the number of compressions used this month for a given API key.
   *
   * @param key - TinyPNG API key
   * @returns Number of compressions used this month
   */
  async getCompressionCount(key: string): Promise<number> {
    const response = await httpRequest<{ compressionCount?: number }>(
      TINYPNG_API_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': this.createAuthHeader(key),
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.alloc(0),
      },
    )

    // Success: 2xx status codes
    if (response.statusCode >= 200 && response.statusCode < 300) {
      // Handle undefined compressionCount (TinyPNG API may not return this field)
      return response.data.compressionCount ?? 0
    }

    // Auth failed: 401/403 return 0
    if (response.statusCode === 401 || response.statusCode === 403) {
      return 0
    }

    // Other 4xx errors return 0
    if (response.statusCode >= 400 && response.statusCode < 500) {
      return 0
    }

    // 5xx errors should be retried
    throw new Error(`TinyPNG 服务器错误: HTTP ${response.statusCode}`)
  }

  /**
   * Create Basic Auth header for TinyPNG API.
   *
   * @param key - TinyPNG API key
   * @returns Basic Auth header string
   */
  private createAuthHeader(key: string): string {
    const auth = Buffer.from(`api:${key}`).toString('base64')
    return `Basic ${auth}`
  }

  /**
   * Upload image to TinyPNG API and get the compressed image URL.
   *
   * @param key - TinyPNG API key
   * @param buffer - Image buffer to upload
   * @returns URL of compressed image and compression count
   */
  private async uploadImage(key: string, buffer: Buffer): Promise<{ url: string, compressionCount: number }> {
    const response = await httpRequest<{ output: { url: string }, compressionCount?: number }>(
      TINYPNG_API_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': this.createAuthHeader(key),
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(buffer.byteLength),
        },
        body: buffer,
      },
    )

    if (!response.data.output?.url) {
      // Determine error type based on statusCode
      if (response.statusCode >= 400 && response.statusCode < 500) {
        throw new TinyPngError(
          `TinyPNG 客户端错误: HTTP ${response.statusCode}`,
          response.statusCode,
          'CLIENT_ERROR',
        )
      }
      if (response.statusCode >= 500) {
        throw new TinyPngError(
          `TinyPNG 服务器错误: HTTP ${response.statusCode}`,
          response.statusCode,
          'SERVER_ERROR',
        )
      }
      throw new Error('No output URL in response')
    }

    // Handle undefined compressionCount (TinyPNG API may not return this field)
    const compressionCount = response.data.compressionCount ?? 0

    return {
      url: response.data.output.url,
      compressionCount,
    }
  }

  /**
   * Download compressed image from TinyPNG API.
   * Supports following redirects (handled by httpRequest utility).
   *
   * @param url - URL to download from
   * @param key - TinyPNG API key
   * @param compressionCount - Compression count from upload response
   * @returns Compressed image buffer and compression count
   */
  private async downloadImage(url: string, key: string, compressionCount: number): Promise<CompressResult> {
    const response = await httpRequest<Buffer>(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: this.createAuthHeader(key),
        },
      },
    )

    return {
      buffer: response.data,
      compressionCount,
    }
  }
}
