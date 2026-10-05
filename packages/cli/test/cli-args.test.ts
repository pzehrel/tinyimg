import { parseArgs } from 'citty'
import { describe, expect, it } from 'vitest'
import { routeCliArgs } from '../src/cli-args'
import { registerCompress } from '../src/commands/compress'

const command = registerCompress(key => key)
function parse(args: string[]) {
  const routed = routeCliArgs(args)
  expect(routed[0]).toBe('compress')
  return parseArgs(routed.slice(1), command.args!)
}
describe('default command arguments', () => {
  it('accepts output and strategy flags after a filename', () => {
    const args = parse(['image.png', '-o', 'dist', '-s', 'API_ONLY'])
    expect(args.output).toBe('dist')
    expect(args.strategy).toBe('API_ONLY')
    expect(args._).toEqual(['image.png'])
  })
  it('does not mistake a flag value for a command', () => {
    const args = parse(['-s', 'API_ONLY', '-o', 'keys', 'image.png'])
    expect(args.strategy).toBe('API_ONLY')
    expect(args.output).toBe('keys')
    expect(args._).toEqual(['image.png'])
  })
  it('implements the documented --no-cache and --no-convert flags', () => {
    const args = parse(['image.png', '--no-cache', '--no-convert'])
    expect(args.cache).toBe(false)
    expect(args.convert).toBe(false)
  })
  it('retains multiple inputs and explicit option termination', () => {
    expect(parse(['--', '-image.png', 'other.png'])._).toEqual(['-image.png', 'other.png'])
  })
  it('retains management subcommands', () => {
    expect(routeCliArgs(['cache', 'clear', '--global'])).toEqual(['cache', 'clear', '--global'])
    expect(routeCliArgs(['keys', 'add', 'fake-key'])).toEqual(['keys', 'add', 'fake-key'])
  })
  it('rejects unknown compression strategies', () => {
    expect(() => parse(['image.png', '-s', 'typo'])).toThrow('Invalid value')
  })
})

it('keeps PNG conversion and detailed logging off unless explicitly requested', () => {
  const defaults = parse(['image.png'])
  expect(defaults.convert).toBe(false)
  expect(defaults.verbose).toBe(false)
  expect(parse(['image.png', '--convert']).convert).toBe(true)
  expect(parse(['image.png', '-c']).convert).toBe(true)
  expect(parse(['image.png', '--verbose']).verbose).toBe(true)
})
