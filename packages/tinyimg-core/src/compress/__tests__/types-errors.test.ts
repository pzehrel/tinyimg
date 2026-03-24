import { describe, it, expect } from 'vitest'
import { AllCompressionFailedError } from '../../errors/types'

describe('AllCompressionFailedError', () => {
  it('should create error instance', () => {
    const error = new AllCompressionFailedError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AllCompressionFailedError')
  })

  it('should have default message', () => {
    const error = new AllCompressionFailedError()
    expect(error.message).toBe('All compression methods failed')
  })

  it('should accept custom message', () => {
    const error = new AllCompressionFailedError('Custom error message')
    expect(error.message).toBe('Custom error message')
  })

  it('should be throwable', () => {
    expect(() => {
      throw new AllCompressionFailedError('Test error')
    }).toThrowError('Test error')
  })
})
