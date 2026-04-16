import { describe, expect, it } from 'vitest'
import { compressFile } from '../src/compress-file'

describe('compressFile', () => {
  it('should be a function', () => {
    expect(typeof compressFile).toBe('function')
  })
})
