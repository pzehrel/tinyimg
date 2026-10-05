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

- `--rename` — 将 `.png` 改为 `.jpg`；默认保留文件名，仅改变编码

```bash
tinyimg convert src/assets/**
tinyimg convert src/assets/** --rename
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

**项目级密钥** — CLI 启动时自动读取当前工作目录下的 `.env` 和 `.env.local`。支持的变量名：`TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS`（以及任何带前缀的变体，如 `BUILD_TINYIMG_KEY` — 按后缀匹配）。

**用户级密钥** — 通过 `tinyimg keys add <key>` 存储在 `~/.tinyimg/keys.json` 中。当没有项目级密钥时作为回退使用。

`.env.local` 示例：

```bash
TINYIMG_KEY=your_api_key
```

---

## 环境变量 — 插件

Vite 插件按实际 `mode` 和 `envDir` 加载 `.env` 文件；Webpack/Rsbuild 插件读取 `process.env`，由宿主配置加载环境文件。建议使用 `.env.local` 存放本地密钥（不提交到 git）。

支持的变量名：任何以 `TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS` 结尾的变量。

构建专用密钥示例（不要使用 VITE\_ 前缀）：

```bash
TINYIMG_KEY=your_api_key
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

## 缓存和输出行为

已处理图片不会重复远程压缩，显式开启 PNG 转 JPG 时仅进行本地转换；`--no-cache`（CLI）或 `noCache: true`（插件）只关闭缓存读写。缓存清理保留保存的 API key。PNG 转 JPG 保留文件名，CLI 和插件均默认关闭；分别使用 `--convert` 和 `convertPngToJpg: true` 开启。插件失败时记录错误并保留原图继续构建。插件默认不使用用户保存的 key，`USE_USER_TINYIMG_KEYS=true` 才启用。

## 转换后的扩展名

插件默认 `renameConvertedFiles: false`，保留原文件名；设置 `convertPngToJpg: true` 和 `renameConvertedFiles: true` 后，不透明 PNG 转换为 JPEG 并将产物扩展名改为 `.jpg`，目录、基本名及 hash 部分保持不变，JS/CSS/HTML/构建清单引用同步更新。透明 PNG 和失败的压缩保持原文件名。目标名称已存在时构建报错，避免覆盖资源。重命名开关不改变压缩缓存身份，也不会自动开启格式转换。

```ts
tinyimg({
  convertPngToJpg: true,
  renameConvertedFiles: true,
})
```

## 压缩日志

CLI 和插件默认仅输出开始提示、一行汇总和必要的错误；检测到可转换的不透明 PNG 时，使用 info 提示 `--convert` 或 `convertPngToJpg: true`，不承诺一定更小。已开启转换时不重复提示。CLI 用 `--verbose`、插件用 `verbose: true` 开启按文件名排序的明细，显示大小变化、缓存和转换状态。空任务不输出构建日志。

插件使用宿主原生日志：Vite 的 `config.logger`、Webpack 的 `compiler.getInfrastructureLogger('tinyimg')`、Rsbuild 的 `api.logger`，遵守宿主日志级别。

## 宿主编译器版本

插件保留现有兼容下限，开发与示例已升级到 Vite 8.3.2、Webpack 5.111.1、Rsbuild 2.2.11。支持范围、实际验证版本与 Node 要求见[宿主兼容说明](docs/host-compatibility.md)。
