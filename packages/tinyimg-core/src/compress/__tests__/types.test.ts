import type { CompressionMode, CompressOptions, ICompressor } from '../types'
import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'

describe('compression types', () => {
  describe('iCompressor interface', () => {
    it('should have compress method signature', () => {
      // This test verifies the interface contract
      // Any class implementing ICompressor must have a compress method
      const compressor: ICompressor = {
        compress: async (buffer: Buffer) => buffer,
      }
      expect(typeof compressor.compress).toBe('function')
    })

    it('should accept Buffer and return Promise<Buffer>', async () => {
      const compressor: ICompressor = {
        compress: async (buffer: Buffer) => buffer,
      }
      const input = Buffer.from('test')
      const result = await compressor.compress(input)
      expect(Buffer.isBuffer(result)).toBe(true)
    })
  })

  describe('compressionMode type', () => {
    it('should accept "auto" mode', () => {
      const mode: CompressionMode = 'auto'
      expect(mode).toBe('auto')
    })

    it('should accept "api" mode', () => {
      const mode: CompressionMode = 'api'
      expect(mode).toBe('api')
    })

    it('should accept "web" mode', () => {
      const mode: CompressionMode = 'web'
      expect(mode).toBe('web')
    })

    it('should have exactly 3 valid modes', () => {
      const modes: CompressionMode[] = ['auto', 'api', 'web']
      expect(modes).toHaveLength(3)
    })
  })

  describe('compressOptions interface', () => {
    it('should accept empty options', () => {
      const options: CompressOptions = {}
      expect(options).toEqual({})
    })

    it('should accept mode option', () => {
      const options: CompressOptions = {
        mode: 'api',
      }
      expect(options.mode).toBe('api')
    })

    it('should accept maxRetries option', () => {
      const options: CompressOptions = {
        maxRetries: 5,
      }
      expect(options.maxRetries).toBe(5)
    })

    it('should accept compressors array', () => {
      const mockCompressor: ICompressor = {
        compress: async (buffer: Buffer) => buffer,
      }
      const options: CompressOptions = {
        compressors: [mockCompressor],
      }
      expect(options.compressors).toHaveLength(1)
    })

    it('should accept all options together', () => {
      const mockCompressor: ICompressor = {
        compress: async (buffer: Buffer) => buffer,
      }
      const options: CompressOptions = {
        compressors: [mockCompressor],
        mode: 'web',
        maxRetries: 10,
      }
      expect(options.compressors).toHaveLength(1)
      expect(options.mode).toBe('web')
      expect(options.maxRetries).toBe(10)
    })
  })
})
