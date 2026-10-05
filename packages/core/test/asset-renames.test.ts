import { describe, expect, it } from 'vitest'
import { assertAssetRenames, convertedAssetName, rewriteAssetReferences } from '../src/asset-renames'

describe('converted asset filenames', () => {
  it('retains names by default and only changes the PNG extension for JPEG output', () => {
    expect(convertedAssetName('assets/image-hash.png', 'jpg', false)).toBe('assets/image-hash.png')
    expect(convertedAssetName('assets/image-hash.PNG', 'jpg', true)).toBe('assets/image-hash.jpg')
    expect(convertedAssetName('transparent.png', 'png', true)).toBe('transparent.png')
  })
  it('rejects existing and case-insensitive target collisions', () => {
    expect(() => assertAssetRenames(['a.png', 'a.JPG'], new Map([['a.png', 'a.jpg']]))).toThrow('already exists')
  })
  it('rewrites URL tokens and preserves suffixes, remote URLs and unrelated names', () => {
    const map = new Map([['assets/image.png', 'assets/image.jpg']])
    const source = 'url(./image.png?q=1#x) "assets/image.png" "/app/assets/image.png" "https://other.test/assets/image.png" "other-image.png"'
    expect(rewriteAssetReferences(source, 'assets/style.css', map, '/app/')).toBe('url(./image.jpg?q=1#x) "assets/image.jpg" "/app/assets/image.jpg" "https://other.test/assets/image.png" "other-image.png"')
  })
})

it('rewrites raw quoted paths with spaces and their percent-encoded versions', () => {
  const renames = new Map([['assets/my image.png', 'assets/my image.jpg']])
  expect(rewriteAssetReferences('"./my image.png?q=1" url(my%20image.png)', 'assets/style.css', renames)).toBe('"./my image.jpg?q=1" url(my%20image.jpg)')
})
