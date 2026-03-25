import { describe, expect, test } from 'vitest'

describe('shouldProcessImage', () => {
  test('accepts .png files', async () => {
    const { shouldProcessImage } = await import('./filter')
    expect(shouldProcessImage('image.png')).toBe(true)
  })

  test('accepts .jpg and .jpeg files', async () => {
    const { shouldProcessImage } = await import('./filter')
    expect(shouldProcessImage('image.jpg')).toBe(true)
    expect(shouldProcessImage('image.jpeg')).toBe(true)
  })

  test('rejects .svg files', async () => {
    const { shouldProcessImage } = await import('./filter')
    expect(shouldProcessImage('image.svg')).toBe(false)
    expect(shouldProcessImage('image.webp')).toBe(false)
    expect(shouldProcessImage('image.avif')).toBe(false)
  })

  test('respects include glob pattern', async () => {
    const { shouldProcessImage } = await import('./filter')
    expect(shouldProcessImage('src/assets/image.png', { include: 'src/**' })).toBe(true)
    expect(shouldProcessImage('public/image.png', { include: 'src/**' })).toBe(false)
  })

  test.skip('respects exclude glob pattern', () => {
    expect(true).toBe(false)
  })

  test.skip('handles array of patterns', () => {
    expect(true).toBe(false)
  })

  test.skip('checks extension first (fast path)', () => {
    expect(true).toBe(false)
  })
})
