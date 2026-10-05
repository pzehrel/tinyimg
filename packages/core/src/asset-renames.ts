import path from 'pathe'

export function convertedAssetName(name: string, outputExt: string, enabled: boolean): string {
  return enabled && outputExt === 'jpg' ? name.replace(/\.png$/i, '.jpg') : name
}

export function assertAssetRenames(names: Iterable<string>, renames: ReadonlyMap<string, string>): void {
  const occupied = new Set([...names].map(name => name.toLowerCase()))
  const targets = new Set<string>()
  for (const [from, to] of renames) {
    const target = to.toLowerCase()
    if ((from.toLowerCase() !== target && occupied.has(target)) || targets.has(target))
      throw new Error(`Cannot rename ${from} to ${to}: target asset already exists`)
    targets.add(target)
  }
}

export interface AssetReferenceEdit {
  start: number
  end: number
  value: string
}

// Match complete URL/path tokens, including query/hash suffixes. Do not rewrite
// external URLs unless they use this build's configured public path.
export function assetReferenceEdits(source: string, owner: string, renames: ReadonlyMap<string, string>, publicPath = ''): AssetReferenceEdit[] {
  const replacements = new Map<string, string>()
  for (const [from, to] of renames) {
    const relativeFrom = path.relative(path.dirname(owner), from)
    const relativeTo = path.relative(path.dirname(owner), to)
    const pairs = [[from, to], [relativeFrom, relativeTo], [`./${relativeFrom}`, `./${relativeTo}`]]
    if (publicPath && publicPath !== 'auto') {
      const prefix = publicPath.endsWith('/') ? publicPath : `${publicPath}/`
      pairs.push([`${prefix}${from}`, `${prefix}${to}`])
    }
    pairs.push([`/${from}`, `/${to}`])
    for (const [oldPath, newPath] of pairs) {
      replacements.set(oldPath, newPath)
      replacements.set(encodeURI(oldPath), encodeURI(newPath))
    }
  }
  const edits: AssetReferenceEdit[] = []
  // A quoted path can contain spaces; preserve its original quoting.
  for (const match of source.matchAll(/(["'])([^"'\\]*)\1/g)) {
    const token = match[2]
    const suffixIndex = token.search(/[?#]/)
    const pathname = suffixIndex < 0 ? token : token.slice(0, suffixIndex)
    const replacement = replacements.get(pathname)
    if (replacement)
      edits.push({ start: match.index! + 1, end: match.index! + 1 + pathname.length, value: replacement })
  }
  // Whitespace, JS/HTML quotes, CSS parentheses and srcset commas delimit paths.
  for (const match of source.matchAll(/[^\s"'`<>()[\]{},;=]+/g)) {
    const token = match[0]
    const suffixIndex = token.search(/[?#]/)
    const pathname = suffixIndex < 0 ? token : token.slice(0, suffixIndex)
    const replacement = replacements.get(pathname)
    if (replacement && !edits.some(edit => match.index! >= edit.start && match.index! < edit.end))
      edits.push({ start: match.index!, end: match.index! + pathname.length, value: replacement })
  }
  return edits.sort((a, b) => a.start - b.start)
}

export function rewriteAssetReferences(source: string, owner: string, renames: ReadonlyMap<string, string>, publicPath = ''): string {
  const edits = assetReferenceEdits(source, owner, renames, publicPath)
  for (const edit of edits.reverse())
    source = source.slice(0, edit.start) + edit.value + source.slice(edit.end)
  return source
}
