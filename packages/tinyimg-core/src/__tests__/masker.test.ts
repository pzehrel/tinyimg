import { describe, expect, it } from 'vitest'
import { maskKey } from '../keys/masker'

describe('key Masking', () => {
  it('returns **** for keys shorter than 8 chars', () => {
    expect(maskKey('1234')).toBe('****')
    expect(maskKey('1234567')).toBe('****')
  })

  it('masks normal keys correctly', () => {
    expect(maskKey('abcd1234efgh5678')).toBe('abcd****5678')
    expect(maskKey('12345678abcdefgh')).toBe('1234****efgh')
  })

  it('handles exactly 8 char keys', () => {
    expect(maskKey('12345678')).toBe('1234****5678')
  })

  it('handles very long keys', () => {
    expect(maskKey('123456789012345678901234567890')).toBe('1234****7890')
  })
})
