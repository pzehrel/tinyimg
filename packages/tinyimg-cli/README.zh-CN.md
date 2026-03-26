[English](README.md) | 简体中文

# tinyimg-cli

基于 TinyPNG 的智能图片压缩 CLI 工具，支持多 API Key 管理、智能缓存和并发压缩。

## 特性

- **批量压缩** - 支持文件、目录和 glob 模式
- **多 API Key 管理** - 智能轮换策略最大化免费额度使用
- **智能缓存** - 基于 MD5 的永久缓存，避免重复压缩
- **并发控制** - 可配置的并行压缩任务数
- **多种 Key 策略** - random、round-robin、priority 三种模式

## 安装

### 全局安装（推荐）

```bash
# 使用 npm
npm install -g tinyimg-cli

# 使用 pnpm
pnpm add -g tinyimg-cli

# 使用 yarn
yarn global add tinyimg-cli
```

### 项目本地安装

```bash
# 使用 npm
npm install -D tinyimg-cli

# 使用 pnpm
pnpm add -D tinyimg-cli

# 使用 yarn
yarn add -D tinyimg-cli
```

## 快速开始

```bash
# 添加 API Key
tinyimg key add YOUR_TINYPNG_API_KEY

# 压缩当前目录所有图片
tinyimg *.png *.jpg

# 压缩指定目录
tinyimg ./images/
```

## 使用方法

### 基本压缩命令

```bash
tinyimg [options] <input...>
```

**输入参数支持：**

- 单个文件：`image.png`
- 多个文件：`image1.png image2.jpg`
- 目录：`./images/`
- Glob 模式：`./assets/**/*.png`

### 命令选项

| 选项                      | 说明                                                  | 默认值   |
| ------------------------- | ----------------------------------------------------- | -------- |
| `-o, --output <dir>`      | 指定输出目录                                          | 原地覆盖 |
| `-k, --key <key>`         | 指定 API Key（优先级高于环境变量）                    | -        |
| `-m, --mode <mode>`       | Key 使用策略：`random` \| `round-robin` \| `priority` | `random` |
| `-p, --parallel <number>` | 并发数限制                                            | `8`      |
| `-c, --cache`             | 启用缓存                                              | `true`   |
| `--no-cache`              | 禁用缓存                                              | -        |
| `-h, --help`              | 显示帮助信息                                          | -        |

### Key 管理命令

```bash
# 添加 API Key
tinyimg key add <key>

# 移除 API Key（交互式选择）
tinyimg key remove

# 移除指定 API Key
tinyimg key remove <key>

# 列出所有 API Key 及额度信息
tinyimg key
```

**Key 显示格式：** API Key 会以脱敏方式显示（前 4 位 + 后 4 位，如 `abcd****efgh`），方便识别同时保护敏感信息。

## 使用示例

### 压缩单个文件

```bash
tinyimg photo.png
```

### 压缩多个文件

```bash
tinyimg image1.png image2.jpg image3.jpeg
```

### 压缩整个目录

```bash
tinyimg ./assets/images/
```

### 使用 Glob 模式

```bash
# 压缩所有 PNG 文件
tinyimg "./src/**/*.png"

# 压缩多种格式
tinyimg "./assets/**/*.{png,jpg,jpeg}"
```

### 指定输出目录

```bash
# 压缩到 dist 目录，保持目录结构
tinyimg ./assets/ -o ./dist/

# 压缩到指定目录
tinyimg photo.png -o ./compressed/
```

### 使用特定 Key 策略

```bash
# 轮询模式（均匀分配额度）
tinyimg ./images/ -m round-robin

# 优先级模式（优先使用指定 key）
tinyimg ./images/ -m priority

# 随机模式（默认）
tinyimg ./images/ -m random
```

### 调整并发数

```bash
# 降低并发数（适合网络不稳定环境）
tinyimg ./images/ -p 4

# 提高并发数（适合高性能网络）
tinyimg ./images/ -p 16
```

### 禁用缓存

```bash
# 强制重新压缩所有图片
tinyimg ./images/ --no-cache
```

### 指定 API Key

```bash
# 使用特定 key 进行压缩（优先级最高）
tinyimg ./images/ -k YOUR_API_KEY
```

## 环境变量

```bash
# 设置 API Keys（多个 key 用逗号分隔）
export TINYPNG_KEYS="key1,key2,key3"

# 运行压缩命令
tinyimg ./images/
```

## 缓存系统

TinyImg 使用两级缓存系统：

1. **项目级缓存** - `node_modules/.tinyimg_cache/`（优先）
2. **全局缓存** - `~/.tinyimg/cache/`（后备）

缓存基于文件内容的 MD5 哈希，相同内容的文件无论位置如何都会命中缓存。

## 支持格式

- **PNG** - 包括透明 PNG
- **JPG/JPEG** - 所有 JPEG 变体

> 注意：TinyPNG 不支持 WebP、AVIF、SVG 等格式。

## 额度管理

TinyPNG 免费版每月提供 500 张压缩额度。TinyImg 通过以下方式最大化利用：

- **多 Key 管理** - 配置多个 key 自动轮换
- **智能缓存** - 避免重复压缩相同内容
- **额度监控** - 实时显示各 key 的剩余额度

## 错误处理

| 错误类型                    | 说明                   | 解决方案                              |
| --------------------------- | ---------------------- | ------------------------------------- |
| `NoValidKeysError`          | 没有配置有效的 API Key | 运行 `tinyimg key add <key>` 添加 key |
| `AllKeysExhaustedError`     | 所有 key 额度已用完    | 添加新 key 或等待下月额度重置         |
| `AllCompressionFailedError` | 所有压缩方式失败       | 检查网络连接和 API 状态               |

## 相关包

- [tinyimg-core](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-core) - 核心压缩库
- [tinyimg-unplugin](https://github.com/pzehrel/tinyimg/tree/main/packages/tinyimg-unplugin) - Vite/Webpack/Rolldown 插件

## License

MIT
