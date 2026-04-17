import { describe, expect, it } from 'vitest'
import tinyimgRsbuild from '../src/index'

describe('tinyimgRsbuild', () => {
  it('returns an Rsbuild plugin object', () => {
    const plugin = tinyimgRsbuild()
    expect(plugin.name).toBe('tinyimg-rsbuild')
    expect(typeof plugin.setup).toBe('function')
  })
})
