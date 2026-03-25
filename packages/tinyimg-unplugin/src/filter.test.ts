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

  test('respects exclude glob pattern', async () => {
    const { shouldProcessImage } = await import('./filter')
    expect(shouldProcessImage('node_modules/image.png', { exclude: 'node_modules/**' })).toBe(false)
    expect(shouldProcessImage('src/image.png', { exclude: 'node_modules/**' })).toBe(true)
  })

  test('handles array of patterns', async () => {
    const { shouldProcessImage } = await import('./filter')
    expect(shouldProcessImage('src/image.png', { include: ['src/**', 'public/**'] })).toBe(true)
    expect(shouldProcessImage('public/image.png', { include: ['src/**', 'public/**'] })).toBe(true)
    expect(shouldProcessImage('assets/image.png', { exclude: ['**/*.min.png', 'placeholder.png'] })).toBe(true)
    expect(shouldProcessImage('image.min.png', { exclude: ['**/*.min.png', 'placeholder.png'] })).toBe(false)
  })

  test('checks extension first (fast path)', async () => {
    const { shouldProcessImage, IMAGE_EXTENSIONS } = await import('./filter')
    // Verify IMAGE_EXTENSIONS is a Set for O(1) lookup
    expect(IMAGE_EXTENSIONS).toBeInstanceOf(Set)
    // Verify extension check rejects non-image files before glob matching
    expect(shouldProcessImage('document.svg', { include: '**/*' })).toBe(false)
    expect(shouldProcessImage('video.webp', { include: '**/*' })).toBe(false)
  })
})
