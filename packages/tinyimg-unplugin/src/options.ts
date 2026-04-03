import type { FilterOptions } from './filter'

export interface TinyimgUnpluginOptions extends FilterOptions {
  mode?: 'random' | 'round-robin' | 'priority'
  cache?: boolean
  parallel?: number
  strict?: boolean
  level?: 'quiet' | 'normal' | 'verbose'
  /** @deprecated use `level: 'verbose'` instead */
  verbose?: boolean
}

export interface NormalizedOptions {
  mode: 'random' | 'round-robin' | 'priority'
  cache: boolean
  parallel: number
  strict: boolean
  level: 'quiet' | 'normal' | 'verbose'
  include?: string[]
  exclude?: string[]
}

const VALID_MODES = new Set(['random', 'round-robin', 'priority'])

export function normalizeOptions(options: TinyimgUnpluginOptions = {}): NormalizedOptions {
  // Validate mode
  if (options.mode !== undefined && !VALID_MODES.has(options.mode)) {
    throw new TypeError(`Invalid mode: "${options.mode}". Must be one of: random, round-robin, priority`)
  }

  // Validate parallel
  if (options.parallel !== undefined && options.parallel <= 0) {
    throw new RangeError(`Invalid parallel: ${options.parallel}. Must be a positive number`)
  }

  // 解析日志级别：优先使用 level，兼容旧版 verbose
  const level = options.level ?? (options.verbose === true ? 'verbose' : 'normal')

  return {
    mode: options.mode ?? 'random',
    cache: options.cache ?? true,
    parallel: options.parallel ?? 8,
    strict: options.strict ?? false,
    level,
    include: options.include ? (Array.isArray(options.include) ? options.include : [options.include]) : undefined,
    exclude: options.exclude ? (Array.isArray(options.exclude) ? options.exclude : [options.exclude]) : undefined,
  }
}
