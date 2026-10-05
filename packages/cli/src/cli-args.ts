const commands = new Set(['cache', 'convert', 'keys', 'list', 'ls', 'compress'])
const valueFlags = new Set(['-o', '--output', '-s', '--strategy', '-k', '--key', '-p', '--parallel'])

// Dispatch the default command without inserting an option terminator into its arguments.
export function routeCliArgs(args: string[]): string[] {
  if (!args.length)
    return ['compress']
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--')
      break
    if (valueFlags.has(arg)) {
      index++
      continue
    }
    if (!arg.startsWith('-'))
      return commands.has(arg) ? args : ['compress', ...args]
  }
  return args.includes('--help') || args.includes('-h') || args.includes('--version') ? args : ['compress', ...args]
}
