import type { FilterOptions } from './filter'

export interface TinyimgUnpluginOptions extends FilterOptions {
  mode?: 'random' | 'round-robin' | 'priority'
  cache?: boolean
  parallel?: number
  strict?: boolean
  verbose?: boolean
}

export interface NormalizedOptions {
  mode: 'random' | 'round-robin' | 'priority'
  cache: boolean
  parallel: number
  strict: boolean
  verbose: boolean
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

  return {
    mode: options.mode ?? 'random',
    cache: options.cache ?? true,
    parallel: options.parallel ?? 8,
    strict: options.strict ?? false,
    verbose: options.verbose ?? false,
    include: options.include ? (Array.isArray(options.include) ? options.include : [options.include]) : undefined,
    exclude: options.exclude ? (Array.isArray(options.exclude) ? options.exclude : [options.exclude]) : undefined,
  }
}
