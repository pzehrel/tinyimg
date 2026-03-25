import type { ICompressor } from './types'
import { Buffer } from 'node:buffer'
import https from 'node:https'
import FormData from 'form-data'
import { logInfo } from '../utils/logger'
import { RetryManager } from './retry'

const TINYPNG_WEB_URL = 'https://tinypng.com/backend/opt/shrink'

export class TinyPngWebCompressor implements ICompressor {
  private retryManager: RetryManager

  constructor(maxRetries: number = 8) {
    this.retryManager = new RetryManager(maxRetries)
  }

  async compress(buffer: Buffer): Promise<Buffer> {
    return this.retryManager.execute(async () => {
      // Step 1: Upload image to get compressed URL
      const uploadUrl = await this.uploadToTinyPngWeb(buffer)

      // Step 2: Download compressed image
      const compressedBuffer = await this.downloadCompressedImage(uploadUrl)

      const originalSize = buffer.byteLength
      const compressedSize = compressedBuffer.byteLength
      const saved = ((1 - compressedSize / originalSize) * 100).toFixed(1)

      logInfo(`Compressed with [TinyPngWebCompressor]: ${originalSize} → ${compressedSize} (saved ${saved}%)`)

      return compressedBuffer
    })
  }

  private async uploadToTinyPngWeb(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const form = new FormData()
      form.append('file', buffer, { filename: 'image.png' })

      const req = https.request(
        TINYPNG_WEB_URL,
        {
          method: 'POST',
          headers: form.getHeaders(),
        },
        (res) => {
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            if (res.statusCode !== 200) {
              const error = new Error(`HTTP ${res.statusCode}: ${data}`)
              ;(error as any).statusCode = res.statusCode
              return reject(error)
            }

            try {
              // Response contains JSON with output URL
              const response = JSON.parse(data)
              if (!response.output?.url) {
                return reject(new Error('No output URL in response'))
              }
              resolve(response.output.url)
            }
            catch (error: any) {
              reject(new Error(`Failed to parse response: ${error.message}`))
            }
          })
        },
      )

      req.on('error', (error) => {
        reject(error)
      })

      form.pipe(req)
    })
  }

  private async downloadCompressedImage(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          const error = new Error(`HTTP ${res.statusCode} downloading compressed image`)
          ;(error as any).statusCode = res.statusCode
          return reject(error)
        }

        const chunks: Buffer[] = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      }).on('error', reject)
    })
  }

  getFailureCount(): number {
    return this.retryManager.getFailureCount()
  }
}
