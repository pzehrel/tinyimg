import { describe, expect, it } from 'vitest'
import tinyimgVite from '../src/index'

describe('tinyimgVite', () => {
  it('returns a Vite plugin object', () => {
    const plugin = tinyimgVite()
    expect(plugin.name).toBe('tinyimg')
    expect(plugin.apply).toBe('build')
    expect(typeof plugin.generateBundle).toBe('function')
  })

  it('accepts custom options', () => {
    const plugin = tinyimgVite({ strategy: 'API_ONLY', parallel: 5 })
    expect(plugin.name).toBe('tinyimg')
  })
})
