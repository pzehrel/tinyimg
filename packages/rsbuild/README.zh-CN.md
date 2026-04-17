# @pz4l/tinyimg-rsbuild

[![npm version](https://img.shields.io/npm/v/@pz4l/tinyimg-rsbuild)](https://www.npmjs.com/package/@pz4l/tinyimg-rsbuild)

Rsbuild 的 TinyPNG 图片压缩插件。

## 安装

```bash
npm i -D @pz4l/tinyimg-rsbuild
```

## 使用

零配置使用：

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core'
import tinyimg from '@pz4l/tinyimg-rsbuild'

export default defineConfig({
  plugins: [tinyimg()],
})
```

带配置：

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core'
import tinyimg from '@pz4l/tinyimg-rsbuild'

export default defineConfig({
  plugins: [
    tinyimg({
      strategy: 'AUTO',
      maxFileSize: 5 * 1024 * 1024,
      convertPngToJpg: false,
      parallel: 3,
    }),
  ],
})
```

## 配置项

| 配置项          | 类型                                              | 默认值                   | 说明                            |
| --------------- | ------------------------------------------------- | ------------------------ | ------------------------------- |
| strategy        | `'API_ONLY' \| 'RANDOM' \| 'API_FIRST' \| 'AUTO'` | `'AUTO'`                 | 压缩策略                        |
| maxFileSize     | `number`                                          | `5 * 1024 * 1024`（5MB） | 单个文件最大大小限制            |
| convertPngToJpg | `boolean`                                         | `false`                  | 是否将无透明通道的 PNG 转为 JPG |
| parallel        | `number`                                          | `3`                      | 并行压缩数量                    |

## 压缩策略说明

- `API_ONLY`：始终使用 TinyPNG API。需要提供 API key。
- `RANDOM`：随机在 API 和 Web 端点之间选择。
- `API_FIRST`：优先使用 API；当 API key 无效或触发限流时回退到 Web 端点。
- `AUTO`：有 API key 时等同于 `API_FIRST`，否则等同于 `RANDOM`。

## API Key 设置

插件本身不读取 `.env` 文件；由构建工具（Rsbuild）加载。建议使用 `.env.local` 存放本地密钥（不提交到 git）。

支持的变量名：任何以 `TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS` 结尾的变量。你也可以添加前缀，例如 `APP_TINYIMG_KEY`。

示例：

```bash
RSBUILD_TINYIMG_KEY=your_api_key
```

## 示例

参见仓库中的 [`examples/rsbuild`](https://github.com/pzehrel/tinyimg/tree/main/examples/rsbuild) 获取可运行的示例。

## 许可证

[MIT](https://github.com/pzehrel/tinyimg/blob/main/LICENSE)
