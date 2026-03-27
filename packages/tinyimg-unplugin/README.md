[English](README.md) | [简体中文](README.zh-CN.md)

# tinyimg-unplugin

基于 TinyPNG 的图片压缩 unplugin，支持 Vite、Webpack、Rolldown 等构建工具。

## Supported Tools

- Vite
- Webpack
- Rolldown

## Installation

```bash
npm install @pz4l/tinyimg-unplugin -D
```

### Testing Installation

To verify the package installs correctly without workspace dependency errors:

```bash
# Test in a clean directory outside the monorepo
cd /tmp
mkdir test-tinyimg && cd test-tinyimg
pnpm init
pnpm add @pz4l/tinyimg-unplugin@latest

# Verify installation
pnpm list @pz4l/tinyimg-unplugin @pz4l/tinyimg-core

# Check that dependencies are resolved (no workspace:* protocol)
cat node_modules/@pz4l/tinyimg-unplugin/package.json | grep dependencies
```

## Environment Setup

### TINYPNG_KEYS 环境变量

在使用插件之前，你需要设置 `TINYPNG_KEYS` 环境变量，包含一个或多个 TinyPNG API key（用逗号分隔）：

```bash
# 单个 key
export TINYPNG_KEYS=your_api_key_here

# 多个 key（用逗号分隔）
export TINYPNG_KEYS=key1,key2,key3
```

### 如何获取 API Key

1. 访问 [TinyPNG 开发者页面](https://tinypng.com/developers)
2. 使用邮箱注册获取 API key

### 在项目中配置环境变量

**Vite 项目**（`.env` 文件）：

```bash
TINYPNG_KEYS=your_api_key_here
```

Vite 会自动加载 `.env` 文件，无需额外配置。

## Usage

### Vite

```javascript
import tinyimg from '@pz4l/tinyimg-unplugin/vite'
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tinyimg({
      mode: 'random', // key 使用策略
      cache: true, // 启用缓存
      parallel: 8, // 并发数
      verbose: false, // 详细日志
      strict: false, // 严格模式
      include: ['**/*.png', '**/*.jpg'], // 包含的文件
      exclude: ['**/node_modules/**'] // 排除的文件
    })
  ]
})
```

### Webpack

```javascript
// webpack.config.js
const tinyimg = require('@pz4l/tinyimg-unplugin/webpack')

module.exports = {
  plugins: [
    tinyimg.default({
      mode: 'random',
      cache: true,
      parallel: 8,
      verbose: false,
      strict: false,
      include: ['**/*.png', '**/*.jpg'],
      exclude: ['**/node_modules/**']
    })
  ]
}
```

### Rolldown

```javascript
// rolldown.config.js
import tinyimg from '@pz4l/tinyimg-unplugin/rolldown'

export default {
  plugins: [
    tinyimg({
      mode: 'random',
      cache: true,
      parallel: 8,
      verbose: false,
      strict: false,
      include: ['**/*.png', '**/*.jpg'],
      exclude: ['**/node_modules/**']
    })
  ]
}
```

## Options

### mode

- **Type**: `'random' | 'round-robin' | 'priority'`
- **Default**: `'random'`
- **Description**: API key 使用策略
  - `random`: 随机选择 key（默认）
  - `round-robin`: 轮询使用 key
  - `priority`: 优先使用额度充足的 key

### cache

- **Type**: `boolean`
- **Default**: `true`
- **Description**: 是否启用缓存。启用后，已压缩过的图片（基于 MD5）不会重复压缩，节省 API 额度。

### parallel

- **Type**: `number`
- **Default**: `8`
- **Description**: 并发压缩数量。数值越高压缩越快，但会更快消耗 API 额度。

### verbose

- **Type**: `boolean`
- **Default**: `false`
- **Description**: 是否输出详细日志。启用后会显示每张图片的压缩信息。

### strict

- **Type**: `boolean`
- **Default**: `false`
- **Description**: 严格模式。启用后，如果压缩失败会中断构建；关闭则使用原图继续构建。

### include

- **Type**: `string | string[]`
- **Default**: `undefined`
- **Description**: 包含的文件匹配模式。支持 glob 模式，如 `'**/*.png'`。

### exclude

- **Type**: `string | string[]`
- **Default**: `undefined`
- **Description**: 排除的文件匹配模式。支持 glob 模式，如 `'**/node_modules/**'`。

## Behavior

### Production Only

插件仅在生产构建时生效（`NODE_ENV=production` 或 Vite 的 build 模式），开发模式下不会压缩图片。

### Supported Formats

仅支持 TinyPNG 支持的格式：

- PNG
- JPG / JPEG

其他格式（如 WebP、AVIF、SVG）会被忽略。

### Project Cache Only

unplugin 仅使用项目级缓存（`.node_modules/.tinyimg_cache/`），不使用全局缓存。这确保每个项目的缓存相互隔离。

### Key Management

- 仅从 `TINYPNG_KEYS` 环境变量读取 API key
- 不支持 CLI 的 `-k` 选项
- 自动轮询多个 key，当某个 key 额度耗尽时自动切换到下一个

## Features

- Automatic image compression during build
- Multi-key management for quota optimization
- Smart caching based on MD5
- Concurrent compression control
- File filtering with glob patterns
- Production-only execution

## Related Packages

- [@pz4l/tinyimg-core](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-core) - Core compression library
- [@pz4l/tinyimg-cli](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-cli) - CLI tool for image compression
