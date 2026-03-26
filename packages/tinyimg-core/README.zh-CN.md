[English](README.md) | 简体中文

# tinyimg-core

基于 TinyPNG 的图片压缩核心库，支持智能缓存和多 API 密钥管理。

## 特性

- 多 API 密钥管理，支持智能轮换策略
- 基于 MD5 的两级永久缓存系统
- 带限流的并发压缩
- 缓存统计，便于监控和 CLI 展示

## 安装

```bash
npm install tinyimg-core
```

## 缓存系统

### 概述

TinyImg 使用基于 MD5 的永久缓存来存储压缩后的图片，包含两级缓存：

1. **项目缓存**（优先）：`node_modules/.tinyimg_cache/` - 相对于项目根目录
2. **全局缓存**（后备）：`~/.tinyimg/cache/` - 跨项目共享

缓存系统提供：

- 使用 MD5 内容哈希的自动缓存命中检测
- 原子写入，保证并发安全
- 优雅的损坏处理（静默重新压缩）
- 用于 CLI 展示的统计报告

### API 参考

#### calculateMD5

计算文件内容的 MD5 哈希值，用作缓存键来存储和检索压缩图片。

```typescript
import { calculateMD5 } from 'tinyimg-core'

const hash = await calculateMD5('/path/to/image.png')
console.log(hash) // 'a1b2c3d4e5f6...'
```

**参数**

- `imagePath: string` - 图片文件的绝对路径

**返回值** `Promise<string>` - 32 位十六进制 MD5 哈希

**说明** 相同内容无论文件名或位置如何都会产生相同的哈希。

#### getProjectCachePath

获取项目级缓存目录的路径。

```typescript
import { getProjectCachePath } from 'tinyimg-core'

const cachePath = getProjectCachePath('/Users/test/project')
// 返回: '/Users/test/project/node_modules/.tinyimg_cache'
```

**参数**

- `projectRoot: string` - 项目根目录的绝对路径

**返回值** `string` - 项目缓存目录路径

#### getGlobalCachePath

获取全局缓存目录的路径（跨项目共享）。

```typescript
import { getGlobalCachePath } from 'tinyimg-core'

const cachePath = getGlobalCachePath()
// 返回: '/Users/username/.tinyimg/cache'
```

**返回值** `string` - 全局缓存目录路径

#### readCache

按优先级顺序从缓存目录读取已缓存的压缩图片。

```typescript
import { readCache } from 'tinyimg-core'

const cached = await readCache('image.png', [
  getProjectCachePath('/project'),
  getGlobalCachePath()
])

if (cached) {
  console.log('缓存命中!')
}
else {
  console.log('缓存未命中')
}
```

**参数**

- `imagePath: string` - 源图片的绝对路径
- `cacheDirs: string[]` - 按优先级排列的缓存目录数组

**返回值** `Promise<Buffer | null>` - 缓存的压缩数据，未命中时返回 null

**行为**

- 按顺序遍历缓存目录
- 返回第一个成功的读取
- 所有缓存未命中或损坏时返回 null
- 静默失败 - 对缺失或损坏的缓存不抛出错误

#### writeCache

使用原子写入模式将压缩图片数据写入缓存。

```typescript
import { writeCache } from 'tinyimg-core'

const compressed = await compressImage(image)
await writeCache('image.png', compressed, getProjectCachePath('/project'))
```

**参数**

- `imagePath: string` - 源图片的绝对路径
- `data: Buffer` - 要缓存的压缩图片数据
- `cacheDir: string` - 要写入的缓存目录

**行为**

- 使用原子写入（临时文件 + 重命名）保证并发安全
- 自动创建缓存目录（如需要）
- 对多个进程的并发写入安全

#### CacheStorage 类

缓存操作的面向对象接口。

```typescript
import { CacheStorage } from 'tinyimg-core'

const storage = new CacheStorage('/path/to/cache')

// 获取图片的缓存文件路径
const cachePath = await storage.getCachePath('/path/to/image.png')

// 从缓存读取
const data = await storage.read('/path/to/image.png')

// 写入缓存
await storage.write('/path/to/image.png', compressedData)
```

**构造函数**

- `cacheDir: string` - 缓存目录路径

**方法**

- `async getCachePath(imagePath: string): Promise<string>` - 获取缓存文件路径
- `async read(imagePath: string): Promise<Buffer | null>` - 读取缓存数据
- `async write(imagePath: string, data: Buffer): Promise<void>` - 写入数据到缓存

#### getCacheStats

获取目录的缓存统计信息（文件数和总大小）。

```typescript
import { getCacheStats } from 'tinyimg-core'

const stats = await getCacheStats('/path/to/cache')
console.log(`文件: ${stats.count}, 大小: ${formatBytes(stats.size)}`)
```

**参数**

- `cacheDir: string` - 缓存目录路径

**返回值** `Promise<CacheStats>` - 包含 `count` 和 `size`（字节）的对象

**行为**

- 不存在的目录返回 `{ count: 0, size: 0 }`
- 优雅处理错误（不抛出异常）

#### getAllCacheStats

获取项目和全局缓存的统计信息。

```typescript
import { getAllCacheStats } from 'tinyimg-core'

// 获取项目和全局统计
const stats = await getAllCacheStats('/project/path')
console.log(`项目: ${stats.project?.count} 个文件`)
console.log(`全局: ${stats.global.count} 个文件`)

// 仅获取全局统计
const globalOnly = await getAllCacheStats()
console.log(`全局: ${globalOnly.global.count} 个文件`)
```

**参数**

- `projectRoot?: string` - 可选的项目根目录

**返回值** `Promise<{ project: CacheStats | null, global: CacheStats }>` - 统计信息对象

**行为**

- 未提供 `projectRoot` 时项目统计为 `null`
- 全局统计始终返回

#### formatBytes

将字节转换为人类可读格式，用于 CLI 展示。

```typescript
import { formatBytes } from 'tinyimg-core'

formatBytes(0) // "0 B"
formatBytes(512) // "512 B"
formatBytes(1024) // "1.00 KB"
formatBytes(1536) // "1.50 KB"
formatBytes(1048576) // "1.00 MB"
formatBytes(1073741824) // "1.00 GB"
```

**参数**

- `bytes: number` - 字节数

**返回值** `string` - 格式化字符串（如 "1.23 MB"、"456 KB"）

**单位** B、KB、MB、GB（使用 1024 作为阈值）

### 使用示例

展示缓存读/写模式的完整示例：

```typescript
import {
  formatBytes,
  getAllCacheStats,
  getGlobalCachePath,
  getProjectCachePath,
  readCache,
  writeCache
} from 'tinyimg-core'

async function compressWithCache(imagePath: string, projectRoot: string) {
  // 尝试从缓存读取（项目优先，然后全局）
  const cached = await readCache(imagePath, [
    getProjectCachePath(projectRoot),
    getGlobalCachePath()
  ])

  if (cached) {
    console.log('缓存命中！使用压缩后的图片。')
    return cached
  }

  // 缓存未命中 - 压缩图片
  console.log('缓存未命中。正在压缩图片...')
  const compressed = await compressImage(imagePath)

  // 写入项目缓存
  await writeCache(imagePath, compressed, getProjectCachePath(projectRoot))

  return compressed
}

async function showCacheStats(projectRoot: string) {
  const stats = await getAllCacheStats(projectRoot)

  console.log('缓存统计:')
  console.log(`项目: ${stats.project?.count || 0} 个文件, ${formatBytes(stats.project?.size || 0)}`)
  console.log(`全局: ${stats.global.count} 个文件, ${formatBytes(stats.global.size)}`)
}
```

### 缓存行为

**缓存键：**

- 原始图片内容的 MD5 哈希
- 相同内容 = 相同哈希，无论文件名/位置

**缓存文件：**

- 文件名：MD5 哈希（无扩展名）
- 内容：压缩图片数据（Buffer）

**缓存策略：**

- 无 TTL - 缓存永久保留，直到手动清理
- 损坏的缓存文件优雅处理（静默重新压缩）
- 原子写入防止并发写入损坏

**缓存优先级：**

1. 项目缓存优先检查（最快，项目特定）
2. 全局缓存次之（共享，后备）

**存储位置：**

- 项目：`<projectRoot>/node_modules/.tinyimg_cache/`
- 全局：`~/.tinyimg/cache/`

## API 密钥管理

Phase 2 文档中即将推出。

## 压缩 API

### 概述

压缩 API 提供对 TinyPNG 图片压缩的程序化访问，支持智能缓存和多密钥管理。

### compressImage

压缩单张图片，集成缓存和自动后备。

```typescript
import { compressImage } from 'tinyimg-core'

const imageBuffer = Buffer.from(/* 图片数据 */)
const compressed = await compressImage(imageBuffer, {
  mode: 'auto', // 'auto' | 'api' | 'web'
  cache: true, // 启用缓存（默认: true）
  maxRetries: 8, // 最大重试次数（默认: 8）
})
```

**签名：**

```typescript
async function compressImage(
  buffer: Buffer,
  options?: CompressServiceOptions
): Promise<Buffer>
```

**参数：**

- `buffer: Buffer` - 原始图片数据，Node.js Buffer 格式
- `options?: CompressServiceOptions` - 压缩选项（见下文）

**返回：** `Promise<Buffer>` - 压缩后的图片数据

**行为：**

- 首先检查缓存（项目缓存，然后全局缓存）
- 使用 API 密钥压缩，自动轮换
- 所有密钥耗尽后降级到 web 压缩器
- 将结果写入项目缓存以供将来使用
- 优雅处理缓存错误（继续压缩）

### compressImages

压缩多张图片，支持并发控制。

```typescript
import { compressImages } from 'tinyimg-core'

const images = [buffer1, buffer2, buffer3]
const compressed = await compressImages(images, {
  concurrency: 8, // 最大并行压缩数（默认: 8）
  mode: 'auto',
  cache: true,
})
```

**签名：**

```typescript
async function compressImages(
  buffers: Buffer[],
  options?: CompressServiceOptions
): Promise<Buffer[]>
```

**参数：**

- `buffers: Buffer[]` - 要压缩的图片缓冲区数组
- `options?: CompressServiceOptions` - 压缩选项

**返回：** `Promise<Buffer[]>` - 压缩后的图片缓冲区数组（顺序与输入相同）

**行为：**

- 使用可配置的并发限制处理图片
- 每张图片经过与 `compressImage` 相同的流程
- 保持结果顺序与输入顺序匹配
- 压缩失败将抛出异常（使用 try/catch 进行单独处理）

### KeyPool

管理多个 API 密钥，支持自动轮换和额度跟踪。

```typescript
import { KeyPool } from 'tinyimg-core'

// 创建随机策略的池（默认）
const pool = new KeyPool('random')

// 创建轮询策略的池
const pool = new KeyPool('round-robin')

// 创建优先级策略的池
const pool = new KeyPool('priority')
```

**构造函数：**

```typescript
new KeyPool(strategy?: KeyStrategy)
```

**参数：**

- `strategy: KeyStrategy` - 密钥选择策略：`'random'` | `'round-robin'` | `'priority'`
  - `random`（默认）：随机选择可用密钥
  - `round-robin`：按顺序循环使用密钥
  - `priority`：优先使用 API 密钥，后备到 web 压缩器

**方法：**

- `async selectKey(): Promise<string>` - 选择并返回一个可用的 API 密钥
- `decrementQuota(): void` - 将当前密钥的额度标记为已使用
- `getCurrentKey(): string | null` - 获取当前选择的密钥

**抛出：**

- `NoValidKeysError` - 未配置 API 密钥时
- `AllKeysExhaustedError` - 所有密钥额度耗尽时

### 类型定义

#### CompressServiceOptions

压缩操作的选项。

```typescript
interface CompressServiceOptions {
  /** 压缩模式（默认: 'auto'） */
  mode?: 'auto' | 'api' | 'web'

  /** 启用缓存（默认: true） */
  cache?: boolean

  /** 仅使用项目缓存，忽略全局缓存（默认: false） */
  projectCacheOnly?: boolean

  /** 批量操作的并发限制（默认: 8） */
  concurrency?: number

  /** 最大重试次数（默认: 8） */
  maxRetries?: number

  /** 自定义 KeyPool 实例，用于高级用法 */
  keyPool?: KeyPool
}
```

#### CompressOptions

基础压缩选项（内部使用）。

```typescript
interface CompressOptions {
  /** 压缩模式（默认: 'auto'） */
  mode?: 'auto' | 'api' | 'web'

  /** 自定义压缩器数组，用于后备链 */
  compressors?: ICompressor[]

  /** 最大重试次数（默认: 3） */
  maxRetries?: number
}
```

#### CompressionMode

压缩模式选择的类型。

```typescript
type CompressionMode = 'auto' | 'api' | 'web'
```

#### KeyStrategy

密钥池策略选择的类型。

```typescript
type KeyStrategy = 'random' | 'round-robin' | 'priority'
```

### 错误类型

#### AllKeysExhaustedError

所有 API 密钥额度耗尽时抛出。

```typescript
import { AllKeysExhaustedError } from 'tinyimg-core'

try {
  await compressImage(buffer)
}
catch (error) {
  if (error instanceof AllKeysExhaustedError) {
    console.log('所有 API 密钥已耗尽，降级到 web 压缩器')
  }
}
```

#### NoValidKeysError

未配置 API 密钥时抛出。

```typescript
import { NoValidKeysError } from 'tinyimg-core'

try {
  const pool = new KeyPool('random')
}
catch (error) {
  if (error instanceof NoValidKeysError) {
    console.log('请通过 TINYPNG_KEYS 环境变量配置 API 密钥')
  }
}
```

#### AllCompressionFailedError

所有压缩方法（API 和 web）失败时抛出。

```typescript
import { AllCompressionFailedError } from 'tinyimg-core'

try {
  await compressImage(buffer)
}
catch (error) {
  if (error instanceof AllCompressionFailedError) {
    console.log('压缩失败 - 图片可能损坏或不支持')
  }
}
```

### 完整使用示例

展示压缩、缓存和错误处理的完整工作流程示例：

```typescript
import { readFile, writeFile } from 'node:fs/promises'
import {
  AllCompressionFailedError,
  AllKeysExhaustedError,
  compressImage,
  compressImages,
  formatBytes,
  getAllCacheStats,
  getGlobalCachePath,
  getProjectCachePath,
  KeyPool,
  NoValidKeysError,
} from 'tinyimg-core'

// 单张图片压缩
async function compressSingleImage(inputPath: string, outputPath: string) {
  try {
    const imageBuffer = await readFile(inputPath)

    const compressed = await compressImage(imageBuffer, {
      mode: 'auto', // 优先尝试 API，后备到 web
      cache: true, // 启用缓存
      maxRetries: 8, // 瞬态故障时重试
    })

    await writeFile(outputPath, compressed)

    const savings = ((1 - compressed.length / imageBuffer.length) * 100).toFixed(1)
    console.log(`压缩完成: ${savings}% 的压缩率`)

    return compressed
  }
  catch (error) {
    if (error instanceof AllCompressionFailedError) {
      console.error('压缩失败: 所有方法都已耗尽')
    }
    else if (error instanceof NoValidKeysError) {
      console.error('未配置 API 密钥。请设置 TINYPNG_KEYS 环境变量。')
    }
    else {
      console.error('意外错误:', error)
    }
    throw error
  }
}

// 批量压缩，支持并发
async function compressBatch(inputPaths: string[], outputDir: string) {
  const images = await Promise.all(
    inputPaths.map(path => readFile(path))
  )

  const compressed = await compressImages(images, {
    concurrency: 8, // 并行处理 8 张图片
    mode: 'auto',
    cache: true,
  })

  // 保存结果
  await Promise.all(
    compressed.map((data, i) =>
      writeFile(`${outputDir}/compressed-${i}.png`, data)
    )
  )

  // 计算总节省
  const originalSize = images.reduce((sum, buf) => sum + buf.length, 0)
  const compressedSize = compressed.reduce((sum, buf) => sum + buf.length, 0)
  const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1)

  console.log(`批量完成: ${savings}% 总压缩率`)
  return compressed
}

// 显示缓存统计
async function showStats(projectRoot: string) {
  const stats = await getAllCacheStats(projectRoot)

  console.log('缓存统计:')
  console.log(`  项目: ${stats.project?.count || 0} 个文件 (${formatBytes(stats.project?.size || 0)})`)
  console.log(`  全局: ${stats.global.count} 个文件 (${formatBytes(stats.global.size)})`)
}

// 手动 KeyPool 用法（高级）
async function manualKeyManagement() {
  try {
    const pool = new KeyPool('round-robin')

    // 获取密钥用于手动 API 调用
    const key = await pool.selectKey()
    console.log(`使用密钥: ${key.substring(0, 4)}****${key.slice(-4)}`)

    // 压缩后标记额度已使用
    pool.decrementQuota()
  }
  catch (error) {
    if (error instanceof AllKeysExhaustedError) {
      console.log('所有密钥已耗尽 - 使用 web 后备')
    }
  }
}

// 运行示例
async function main() {
  await compressSingleImage('input.png', 'output.png')
  await showStats(process.cwd())
}

main().catch(console.error)
```

## 错误处理

缓存系统设计为优雅失败：

- 缺少缓存目录 → 返回 null（缓存未命中）
- 损坏的缓存文件 → 返回 null（触发重新压缩）
- 并发写入 → 原子写入模式防止损坏
- 权限错误 → 静默失败（记录警告）

## License

MIT
