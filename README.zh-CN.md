# tinyimg

基于 TinyPNG 的多端图片压缩工具

[![npm version](https://img.shields.io/npm/v/@pzehrel/tinyimg-cli)](https://www.npmjs.com/package/@pzehrel/tinyimg-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

---

## 特性

- 多种压缩策略（仅 API、仅 Web、API 优先回退、随机、自动）
- 内置缓存（结果存储在 `node_modules/.tinyimg` 或 `~/.tinyimg`）
- 支持无透明通道 PNG 转 JPG
- 可配置并发数的并行压缩
- API 密钥管理与回退机制，支持用户级密钥存储

---

## 包一览

| 包名                       | 说明                   | 发布状态 |
| -------------------------- | ---------------------- | -------- |
| `@pzehrel/tinyimg-cli`     | 命令行压缩工具         | 已发布   |
| `@pzehrel/tinyimg-vite`    | Vite 插件              | 已发布   |
| `@pzehrel/tinyimg-webpack` | Webpack 插件           | 已发布   |
| `@pzehrel/tinyimg-rsbuild` | Rsbuild 插件           | 已发布   |
| `@pzehrel/tinyimg-core`    | 核心压缩逻辑（内部包） | 未发布   |
| `@pzehrel/tinyimg-locale`  | 国际化支持（内部包）   | 未发布   |

---

## CLI 快速开始

### 安装

```bash
npm i -g @pzehrel/tinyimg-cli
```

### 使用

```bash
# 压缩图片
tinyimg src/assets/**

# 带选项
tinyimg src/assets/** -s API_FIRST -k YOUR_API_KEY -o dist/images
```

### 子命令

- `tinyimg convert <paths>` — 转换图片格式
- `tinyimg keys add <key>` — 添加用户级 API 密钥
- `tinyimg keys del` — 删除用户级 API 密钥
- `tinyimg list <paths>`（别名 `ls`）— 列出图片信息

---

## 插件快速开始

### Vite

```bash
npm i -D @pzehrel/tinyimg-vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import tinyimg from '@pzehrel/tinyimg-vite';

export default defineConfig({
  plugins: [
    tinyimg({
      strategy: 'AUTO',
      parallel: 3,
    }),
  ],
});
```

### Webpack

```bash
npm i -D @pzehrel/tinyimg-webpack
```

```ts
// webpack.config.ts
import TinyimgWebpackPlugin from '@pzehrel/tinyimg-webpack';

export default {
  plugins: [
    new TinyimgWebpackPlugin({
      strategy: 'AUTO',
      parallel: 3,
    }),
  ],
};
```

### Rsbuild

```bash
npm i -D @pzehrel/tinyimg-rsbuild
```

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import tinyimg from '@pzehrel/tinyimg-rsbuild';

export default defineConfig({
  plugins: [
    tinyimg({
      strategy: 'AUTO',
      parallel: 3,
    }),
  ],
});
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

| 策略        | 说明                                                   |
| ----------- | ------------------------------------------------------ |
| `API_ONLY`  | 始终使用 TinyPNG API。需要提供 API key。               |
| `RANDOM`    | 随机在 API 和 Web 压缩器之间选择。                     |
| `API_FIRST` | 优先使用 API；遇到 401/429 时回退到 Web 压缩器。       |
| `AUTO`      | 有 API key 时等同于 `API_FIRST`，否则等同于 `RANDOM`。 |

---

## API 密钥设置

### 环境变量

运行前设置环境变量：

```bash
export TINYIMG_KEY=your_api_key
```

支持的环境变量名：`TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS`

### 用户级密钥

```bash
tinyimg keys add your_api_key
export USE_USER_TINYIMG_KEYS=true
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
