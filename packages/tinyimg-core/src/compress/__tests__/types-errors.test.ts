import { describe, expect, it } from 'vitest'
import { AllCompressionFailedError } from '../../errors/types'

describe('allCompressionFailedError', () => {
  it('should create error instance with default message', () => {
    const error = new AllCompressionFailedError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AllCompressionFailedError')
    expect(error.message).toBe('All compression methods failed')
  })
})
