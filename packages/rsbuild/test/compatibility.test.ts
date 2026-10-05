import { expect, it } from 'vitest'
import { runHostFixture } from '../../core/test/host-fixture'

for (const host of ['rsbuild-previous', '@rsbuild/core']) {
  it(`published Rsbuild plugin builds and renames assets on ${host}`, async () => {
    expect(await runHostFixture('rsbuild', host)).toBe('compatible')
  }, 40000)
}
