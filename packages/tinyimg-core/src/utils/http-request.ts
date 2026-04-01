import https from 'node:https'
import type { IncomingMessage } from 'node:http'
import type { Buffer } from 'node:buffer'

const MAX_REDIRECTS = 5

export interface RequestOptions {
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: Buffer
}

export interface HttpResponse<T = Buffer> {
  statusCode: number
  headers: Record<string, string | string[]>
  data: T
}

/**
 * Generic HTTPS request utility function.
 * Supports JSON and Buffer responses, follows redirects (up to 5), and handles errors.
 *
 * @param url - The URL to request
 * @param options - Request options (method, headers, body)
 * @param redirectCount - Internal counter for redirect following (default: 0)
 * @returns Promise<HttpResponse<T>> with status code, headers, and data
 */
export async function httpRequest<T = Buffer>(
  url: string,
  options: RequestOptions,
  redirectCount: number = 0,
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method,
        headers: options.headers,
      },
      (res: IncomingMessage) => {
        const statusCode = res.statusCode || 0

        // Handle redirects (3xx)
        if (statusCode >= 300 && statusCode < 400) {
          const redirectUrl = res.headers.location
          if (!redirectUrl) {
            return reject(new Error(`Redirect (${statusCode}) but no Location header`))
          }

          // Check redirect limit
          if (redirectCount >= MAX_REDIRECTS) {
            return reject(new Error(`Maximum redirects (${MAX_REDIRECTS}) exceeded`))
          }

          // Follow redirect recursively
          return httpRequest<T>(redirectUrl, options, redirectCount + 1).then(resolve).catch(reject)
        }

        // Handle success (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          const chunks: Buffer[] = []

          res.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
          })

          res.on('end', () => {
            const buffer = Buffer.concat(chunks)

            // Try to parse as JSON first
            try {
              const json = JSON.parse(buffer.toString()) as T
              resolve({
                statusCode,
                headers: res.headers as Record<string, string | string[]>,
                data: json,
              })
            }
            catch {
              // If JSON parse fails, return buffer
              resolve({
                statusCode,
                headers: res.headers as Record<string, string | string[]>,
                data: buffer as T,
              })
            }
          })

          res.on('error', (error: Error) => {
            reject(error)
          })

          return
        }

        // Handle errors (4xx/5xx)
        let data = ''
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString()
        })

        res.on('end', () => {
          const error = new Error(`HTTP ${statusCode}: ${data}`)
          ;(error as any).statusCode = statusCode
          reject(error)
        })
      },
    )

    req.on('error', (error: Error) => {
      // Network errors preserve error.code
      reject(error)
    })

    // Write body if provided
    if (options.body) {
      req.write(options.body)
    }

    req.end()
  })
}
