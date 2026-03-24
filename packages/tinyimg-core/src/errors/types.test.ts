import { describe, expect, it } from 'vitest'
import { AllKeysExhaustedError, NoValidKeysError } from './types'

describe('error Types', () => {
  describe('allKeysExhaustedError', () => {
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

  describe('noValidKeysError', () => {
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
