import { describe, expect, it } from 'vitest'
import { maskKey } from '../../src/utils/mask'

describe('maskKey', () => {
  it('should mask key as first4 + **** + last4 for long keys', () => {
    expect(maskKey('ABCDEFGHIJKLMNOP')).toBe('ABCD****MNOP')
  })

  it('should return **** for keys of length 4 or less', () => {
    expect(maskKey('abc')).toBe('****')
    expect(maskKey('ABCD')).toBe('****')
    expect(maskKey('')).toBe('****')
  })

  it('should mask keys of length 5–8 as first2 + **** + last2', () => {
    expect(maskKey('ABCDE')).toBe('AB****DE')
    expect(maskKey('ABCDEFGH')).toBe('AB****GH')
  })

  it('should mask keys of length 9+ as first4 + **** + last4', () => {
    expect(maskKey('ABCDEFGHI')).toBe('ABCD****FGHI')
  })
})
