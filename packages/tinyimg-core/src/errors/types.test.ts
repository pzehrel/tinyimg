import { describe, it, expect } from 'vitest'
import { AllKeysExhaustedError, NoValidKeysError } from '../types'

describe('Error Types', () => {
  describe('AllKeysExhaustedError', () => {
    it('should extend Error', () => {
      const error = new AllKeysExhaustedError()
      expect(error).toBeInstanceOf(Error)
    })

    it('should have correct name and message', () => {
      const error = new AllKeysExhaustedError()
      expect(error.name).toBe('AllKeysExhaustedError')
      expect(error.message).toBe('All API keys have exhausted quota')
    })

    it('should allow custom message', () => {
      const error = new AllKeysExhaustedError('Custom message')
      expect(error.message).toBe('Custom message')
    })
  })

  describe('NoValidKeysError', () => {
    it('should extend Error', () => {
      const error = new NoValidKeysError()
      expect(error).toBeInstanceOf(Error)
    })

    it('should have correct name and message', () => {
      const error = new NoValidKeysError()
      expect(error.name).toBe('NoValidKeysError')
      expect(error.message).toBe('No valid API keys available')
    })

    it('should allow custom message', () => {
      const error = new NoValidKeysError('Custom message')
      expect(error.message).toBe('Custom message')
    })
  })
})
