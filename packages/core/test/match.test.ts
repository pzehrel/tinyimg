import { describe, expect, it } from 'vitest'
import { matchFiles } from '../src/match'

describe('matchFiles', () => {
  it('should be a function', () => {
    expect(typeof matchFiles).toBe('function')
  })
})
