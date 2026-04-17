# tinyimg

基于 TinyPNG 的多端图片压缩工具

[![npm version](https://img.shields.io/npm/v/@pz4l/tinyimg-cli)](https://www.npmjs.com/package/@pz4l/tinyimg-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

[English](./README.md)

---

## 特性

- 多种压缩策略（仅 API、随机、API 优先回退、自动）
- 内置缓存（结果存储在 `node_modules/.tinyimg` 或 `~/.tinyimg`）
- 支持无透明通道 PNG 转 JPG
- 可配置并发数的并行压缩
- API 密钥管理与回退机制，支持用户级密钥存储

---

## 包一览

已发布的包：

- [`@pz4l/tinyimg-cli`](https://www.npmjs.com/package/@pz4l/tinyimg-cli) — CLI 工具
- [`@pz4l/tinyimg-vite`](https://www.npmjs.com/package/@pz4l/tinyimg-vite) — Vite 插件
- [`@pz4l/tinyimg-webpack`](https://www.npmjs.com/package/@pz4l/tinyimg-webpack) — Webpack 插件
- [`@pz4l/tinyimg-rsbuild`](https://www.npmjs.com/package/@pz4l/tinyimg-rsbuild) — Rsbuild 插件

---

## CLI

### 安装

```bash
npm i -g @pz4l/tinyimg-cli
```

### 全局选项

| 选项                        | 别名 | 说明                | 默认值  |
| --------------------------- | ---- | ------------------- | ------- |
| `-o, --output <dir>`        | —    | 输出目录            | —       |
| `-s, --strategy <strategy>` | —    | 压缩策略            | `AUTO`  |
| `--no-cache`                | —    | 禁用缓存            | `false` |
| `-k, --key <keys>`          | —    | 逗号分隔的 API 密钥 | —       |
| `-p, --parallel <number>`   | —    | 并行限制            | `3`     |

### 命令

#### 默认命令（压缩）

```bash
tinyimg src/assets/**
tinyimg src/assets/** -o dist/images
tinyimg src/assets/** -s API_FIRST -k YOUR_API_KEY
```

#### `tinyimg convert <paths>`

将无透明通道的 PNG 转换为 JPG。

- `--noRename` — 保留原始 `.png` 扩展名（仅更改编码）

```bash
tinyimg convert src/assets/**
tinyimg convert src/assets/** --noRename
```

#### `tinyimg keys <subcommand>`

管理 API 密钥。

- `tinyimg keys add <key>` — 添加并验证 API 密钥（支持同时添加多个）
- `tinyimg keys del <maskedKey>` — 删除已保存的密钥
- `tinyimg keys`（无子命令）— 列出所有密钥

```bash
tinyimg keys add your_api_key
tinyimg keys add key1 key2 key3
tinyimg keys del xxxx...xxxx
tinyimg keys
```

#### `tinyimg list <paths>`（别名 `ls`）

列出图片文件及其元数据。

- `--json` — 以 JSON 格式输出
- `--convert` 或 `-c` — 仅显示可转换的 PNG

```bash
tinyimg list src/assets/**
tinyimg ls src/assets/** -c
```

---

## 插件快速开始

### Vite

```bash
npm i -D @pz4l/tinyimg-vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import tinyimg from '@pz4l/tinyimg-vite';

export default defineConfig({
  plugins: [tinyimg()],
});
```

带配置：

```ts
plugins: [
  tinyimg({
    strategy: 'AUTO',
    parallel: 3,
  }),
]
```

### Webpack

```bash
npm i -D @pz4l/tinyimg-webpack
```

```ts
// webpack.config.ts
import TinyimgWebpackPlugin from '@pz4l/tinyimg-webpack';

export default {
  plugins: [new TinyimgWebpackPlugin()],
};
```

带配置：

```ts
plugins: [
  new TinyimgWebpackPlugin({
    strategy: 'AUTO',
    parallel: 3,
  }),
]
```

### Rsbuild

```bash
npm i -D @pz4l/tinyimg-rsbuild
```

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import tinyimg from '@pz4l/tinyimg-rsbuild';

export default defineConfig({
  plugins: [tinyimg()],
});
```

带配置：

```ts
plugins: [
  tinyimg({
    strategy: 'AUTO',
    parallel: 3,
  }),
]
```

---

## 配置项

所有插件通用以下配置项：

| 配置项            | 类型                                              | 默认值                   | 说明                            |
| ----------------- | ------------------------------------------------- | ------------------------ | ------------------------------- |
| `strategy`        | `'API_ONLY' \| 'RANDOM' \| 'API_FIRST' \| 'AUTO'` | `'AUTO'`                 | 压缩策略                        |
| `maxFileSize`     | `number`                                          | `5 * 1024 * 1024`（5MB） | 单个文件最大大小限制            |
| `convertPngToJpg` | `boolean`                                         | `false`                  | 是否将无透明通道的 PNG 转为 JPG |
| `parallel`        | `number`                                          | `3`                      | 并行压缩数量                    |

---

## 压缩策略说明

| 策略        | 说明                                                       |
| ----------- | ---------------------------------------------------------- |
| `API_ONLY`  | 始终使用 TinyPNG API。需要提供 API key。                   |
| `RANDOM`    | 随机在 API 和 Web 端点之间选择。                           |
| `API_FIRST` | 优先使用 API；当 API key 无效或触发限流时回退到 Web 端点。 |
| `AUTO`      | 有 API key 时等同于 `API_FIRST`，否则等同于 `RANDOM`。     |

---

## 环境变量 — CLI

CLI 从两个来源读取 API 密钥：

**项目级密钥** — CLI 启动时自动读取当前工作目录下的 `.env` 和 `.env.local`。支持的变量名：`TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS`（以及任何带前缀的变体，如 `VITE_TINYIMG_KEY` — 按后缀匹配）。

**用户级密钥** — 通过 `tinyimg keys add <key>` 存储在 `~/.tinyimg/keys.json` 中。当没有项目级密钥时作为回退使用。

`.env.local` 示例：

```bash
TINYIMG_KEY=your_api_key
```

---

## 环境变量 — 插件

插件本身不读取 `.env` 文件；由构建工具（Vite/Webpack/Rsbuild）加载。建议使用 `.env.local` 存放本地密钥（不提交到 git）。

支持的变量名：任何以 `TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS` 结尾的变量。

带框架前缀的示例：

```bash
VITE_TINYIMG_KEY=your_api_key
```

---

## 示例

可运行的示例项目位于：

- `examples/vite`
- `examples/webpack`
- `examples/rsbuild`

---

## 参与贡献

请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发环境搭建、提交规范和 PR 流程。

---

## 许可证

[MIT](https://opensource.org/licenses/MIT)
