import type { Buffer } from 'node:buffer'
import type { ICompressor } from './types'
import UserAgent from 'user-agents'
import { httpRequest } from '../utils/http-request'
import { RetryManager } from './retry'

const TINYPNG_WEB_URL = 'https://tinypng.com/backend/opt/shrink'

export class TinyPngWebCompressor implements ICompressor {
  private retryManager: RetryManager
  private requestHeaders?: Record<string, string>
  private userAgentGenerator: UserAgent

  constructor(maxRetries: number = 8) {
    this.retryManager = new RetryManager(maxRetries)
    // Initialize user-agents with desktop filter (UA-03)
    this.userAgentGenerator = new UserAgent({ deviceCategory: 'desktop' })
  }

  async compress(buffer: Buffer): Promise<Buffer> {
    return this.retryManager.execute(async () => {
      // Step 1: Upload image to get compressed URL
      const uploadUrl = await this.uploadToTinyPngWeb(buffer)

      // Step 2: Download compressed image
      const compressedBuffer = await this.downloadCompressedImage(uploadUrl)

      return compressedBuffer
    })
  }

  private getRandomHeaders(): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      'X-Forwarded-For': this.getRandomIPv4(),
    }
  }

  private getRandomUserAgent(): string {
    // Generate new random user agent for each request (UA-02)
    const userAgent = this.userAgentGenerator.random()
    return userAgent.toString()
  }

  private getRandomIPv4(): string {
    const octet = () => Math.floor(Math.random() * 256)
    return `${octet()}.${octet()}.${octet()}.${octet()}`
  }

  private async uploadToTinyPngWeb(buffer: Buffer): Promise<string> {
    // Generate random headers for this request
    this.requestHeaders = this.getRandomHeaders()

    const response = await httpRequest<{ output: { url: string } }>(
      TINYPNG_WEB_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(buffer.byteLength),
          ...this.requestHeaders,
        },
        body: buffer,
      },
    )

    // Check for HTTP errors (4xx/5xx)
    if (response.statusCode >= 400) {
      const error = new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`)
      ;(error as any).statusCode = response.statusCode
      throw error
    }

    if (!response.data.output?.url) {
      throw new Error('No output URL in response')
    }

    return response.data.output.url
  }

  private async downloadCompressedImage(url: string): Promise<Buffer> {
    const response = await httpRequest<Buffer>(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...this.requestHeaders,
        },
      },
    )

    // Check for HTTP errors (4xx/5xx)
    if (response.statusCode >= 400) {
      const error = new Error(`HTTP ${response.statusCode} downloading compressed image`)
      ;(error as any).statusCode = response.statusCode
      throw error
    }

    return response.data
  }

  getFailureCount(): number {
    return this.retryManager.getFailureCount()
  }
}
