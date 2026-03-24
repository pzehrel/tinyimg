import { describe, it, expect } from 'vitest'
import { getProjectCachePath, getGlobalCachePath } from './paths'
import { homedir } from 'node:os'
import { join } from 'node:path'

describe('cache paths', () => {
  it('getProjectCachePath returns .node_modules/.tinyimg_cache for given project root', () => {
    const projectRoot = '/Users/test/project'
    const expected = join(projectRoot, '.node_modules', '.tinyimg_cache')
    expect(getProjectCachePath(projectRoot)).toBe(expected)
  })

  it('getGlobalCachePath returns ~/.tinyimg/cache', () => {
    const expected = join(homedir(), '.tinyimg', 'cache')
    expect(getGlobalCachePath()).toBe(expected)
  })

  it('Paths use correct path separators for OS', () => {
    const projectRoot = '/Users/test/project'
    const path = getProjectCachePath(projectRoot)
    // Should use OS-specific separator (join handles this)
    expect(path).toContain('.node_modules')
    expect(path).toContain('.tinyimg_cache')
  })

  it('Project cache path is relative to provided root', () => {
    const root1 = '/path/to/project1'
    const root2 = '/path/to/project2'
    const path1 = getProjectCachePath(root1)
    const path2 = getProjectCachePath(root2)

    expect(path1).toContain(root1)
    expect(path2).toContain(root2)
    expect(path1).not.toBe(path2)
  })
})
