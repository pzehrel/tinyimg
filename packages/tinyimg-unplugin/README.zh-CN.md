[English](README.md) | 简体中文

# tinyimg-unplugin

基于 TinyPNG 的图片压缩 unplugin，支持 Vite、Webpack、Rolldown 等构建工具。

## 支持的工具

- Vite
- Webpack
- Rolldown

## 安装

```bash
npm install tinyimg-unplugin -D
```

## 环境设置

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
3. 每个邮箱每月可获得 500 张免费压缩额度
4. 使用多个 key 可以叠加免费额度

### 在项目中配置环境变量

**Vite 项目**（`.env` 文件）：

```bash
TINYPNG_KEYS=your_api_key_here
```

**Webpack 项目**（`webpack.config.js`）：

```javascript
const webpack = require('webpack')

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.TINYPNG_KEYS': JSON.stringify('your_api_key_here')
    })
  ]
}
```

## 使用方法

### Vite

```javascript
import tinyimg from 'tinyimg-unplugin/vite'
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
const tinyimg = require('tinyimg-unplugin/webpack')

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
import tinyimg from 'tinyimg-unplugin/rolldown'

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

## 选项

### mode

- **类型**: `'random' | 'round-robin' | 'priority'`
- **默认值**: `'random'`
- **说明**: API key 使用策略
  - `random`: 随机选择 key（默认）
  - `round-robin`: 轮询使用 key
  - `priority`: 优先使用额度充足的 key

### cache

- **类型**: `boolean`
- **默认值**: `true`
- **说明**: 是否启用缓存。启用后，已压缩过的图片（基于 MD5）不会重复压缩，节省 API 额度。

### parallel

- **类型**: `number`
- **默认值**: `8`
- **说明**: 并发压缩数量。数值越高压缩越快，但会更快消耗 API 额度。

### verbose

- **类型**: `boolean`
- **默认值**: `false`
- **说明**: 是否输出详细日志。启用后会显示每张图片的压缩信息。

### strict

- **类型**: `boolean`
- **默认值**: `false`
- **说明**: 严格模式。启用后，如果压缩失败会中断构建；关闭则使用原图继续构建。

### include

- **类型**: `string | string[]`
- **默认值**: `undefined`
- **说明**: 包含的文件匹配模式。支持 glob 模式，如 `'**/*.png'`。

### exclude

- **类型**: `string | string[]`
- **默认值**: `undefined`
- **说明**: 排除的文件匹配模式。支持 glob 模式，如 `'**/node_modules/**'`。

## 行为

### 仅在生产环境

插件仅在生产构建时生效（`NODE_ENV=production` 或 Vite 的 build 模式），开发模式下不会压缩图片。

### 支持的格式

仅支持 TinyPNG 支持的格式：

- PNG
- JPG / JPEG

其他格式（如 WebP、AVIF、SVG）会被忽略。

### 仅项目缓存

unplugin 仅使用项目级缓存（`.node_modules/.tinyimg_cache/`），不使用全局缓存。这确保每个项目的缓存相互隔离。

### 密钥管理

- 仅从 `TINYPNG_KEYS` 环境变量读取 API key
- 不支持 CLI 的 `-k` 选项
- 自动轮询多个 key，当某个 key 额度耗尽时自动切换到下一个

## 特性

- 构建期间自动压缩图片
- 多密钥管理优化额度使用
- 基于 MD5 的智能缓存
- 所有密钥耗尽时的后备压缩
- 并发压缩控制
- 使用 glob 模式过滤文件
- 仅在生产环境执行

## 相关包

- [tinyimg-core](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-core) - 核心压缩库
- [tinyimg-cli](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-cli) - 图片压缩 CLI 工具
