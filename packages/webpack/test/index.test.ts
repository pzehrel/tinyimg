import { describe, expect, it } from 'vitest'
import TinyimgWebpackPlugin from '../src/index'

describe('tinyimgWebpackPlugin', () => {
  it('is a constructor that creates a plugin instance', () => {
    const plugin = new TinyimgWebpackPlugin({ parallel: 5 })
    expect(plugin).toBeInstanceOf(TinyimgWebpackPlugin)
  })
})
