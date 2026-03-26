import { formatBytes } from '@pz4l/tinyimg-core'

export interface FileResult {
  path: string
  originalSize: number
  compressedSize?: number
  cached: boolean
  error?: string
}

export class CompressionStats {
  private compressedCount = 0
  private cachedCount = 0
  private originalSize = 0
  private compressedSize = 0
  private fileResults: FileResult[] = []

  recordCompressed(path: string, originalSize: number, compressedSize: number): void {
    this.compressedCount++
    this.originalSize += originalSize
    this.compressedSize += compressedSize
    this.fileResults.push({ path, originalSize, compressedSize, cached: false })
  }

  recordCached(path: string, size: number): void {
    this.cachedCount++
    this.originalSize += size
    this.compressedSize += size
    this.fileResults.push({ path, originalSize: size, compressedSize: size, cached: true })
  }

  recordError(path: string, error: string): void {
    this.fileResults.push({ path, originalSize: 0, cached: false, error })
  }

  getSummary() {
    return {
      compressedCount: this.compressedCount,
      cachedCount: this.cachedCount,
      originalSize: this.originalSize,
      compressedSize: this.compressedSize,
      bytesSaved: this.originalSize - this.compressedSize,
      fileCount: this.fileResults.length,
    }
  }

  formatSummary(): string[] {
    const summary = this.getSummary()
    const lines: string[] = []

    if (summary.compressedCount === 0 && summary.cachedCount > 0) {
      // All cached (D-11)
      lines.push(`[tinyimg] All images cached (0 compressed, ${summary.cachedCount} cached)`)
    }
    else {
      // Normal summary (D-09)
      lines.push(`✓ [tinyimg] Compressed ${summary.fileCount} images (${summary.cachedCount} cached, ${summary.compressedCount} compressed)`)
      lines.push(`✓ [tinyimg] Saved ${formatBytes(summary.bytesSaved)} (original: ${formatBytes(summary.originalSize)} → compressed: ${formatBytes(summary.compressedSize)})`)
    }

    return lines
  }

  getFileResults(): readonly FileResult[] {
    return this.fileResults
  }
}
