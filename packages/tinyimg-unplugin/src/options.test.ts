import { describe, expect, it } from 'vitest'

describe('normalizeOptions', () => {
  it('applies default values', async () => {
    const { normalizeOptions } = await import('./options')
    const result = normalizeOptions({})
    expect(result).toEqual({
      mode: 'random',
      cache: true,
      parallel: 8,
      strict: false,
      verbose: false,
      include: undefined,
      exclude: undefined,
    })
  })

  it('validates mode enum', async () => {
    const { normalizeOptions } = await import('./options')
    // Valid modes
    expect(normalizeOptions({ mode: 'random' }).mode).toBe('random')
    expect(normalizeOptions({ mode: 'round-robin' }).mode).toBe('round-robin')
    expect(normalizeOptions({ mode: 'priority' }).mode).toBe('priority')

    // Invalid mode
    expect(() => normalizeOptions({ mode: 'invalid' as any })).toThrow(TypeError)
    expect(() => normalizeOptions({ mode: 'invalid' as any })).toThrow('Invalid mode: "invalid". Must be one of: random, round-robin, priority')
  })

  it('converts string include to array', async () => {
    const { normalizeOptions } = await import('./options')
    const result1 = normalizeOptions({ include: 'src/**' })
    expect(result1.include).toEqual(['src/**'])

    const result2 = normalizeOptions({ include: ['src/**', 'public/**'] })
    expect(result2.include).toEqual(['src/**', 'public/**'])
  })

  it('converts string exclude to array', async () => {
    const { normalizeOptions } = await import('./options')
    const result1 = normalizeOptions({ exclude: 'node_modules/**' })
    expect(result1.exclude).toEqual(['node_modules/**'])

    const result2 = normalizeOptions({ exclude: ['**/*.min.png', 'placeholder.png'] })
    expect(result2.exclude).toEqual(['**/*.min.png', 'placeholder.png'])
  })

  it('validates parallel is positive number', async () => {
    const { normalizeOptions } = await import('./options')
    // Valid parallel values
    expect(normalizeOptions({ parallel: 1 }).parallel).toBe(1)
    expect(normalizeOptions({ parallel: 16 }).parallel).toBe(16)

    // Invalid parallel values
    expect(() => normalizeOptions({ parallel: -1 })).toThrow(RangeError)
    expect(() => normalizeOptions({ parallel: -1 })).toThrow('Invalid parallel: -1. Must be a positive number')
    expect(() => normalizeOptions({ parallel: 0 })).toThrow(RangeError)
    expect(() => normalizeOptions({ parallel: 0 })).toThrow('Invalid parallel: 0. Must be a positive number')
  })
})
