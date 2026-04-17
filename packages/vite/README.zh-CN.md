# @pz4l/tinyimg-vite

[![npm version](https://img.shields.io/npm/v/@pz4l/tinyimg-vite)](https://www.npmjs.com/package/@pz4l/tinyimg-vite)

TinyPNG 图片压缩 Vite 插件。

## 安装

```bash
npm i -D @pz4l/tinyimg-vite
```

## 使用

零配置使用：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tinyimg from '@pz4l/tinyimg-vite'

export default defineConfig({
  plugins: [tinyimg()],
})
```

带配置使用：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tinyimg from '@pz4l/tinyimg-vite'

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

| 配置项          | 类型                                              | 默认值            | 说明                               |
| --------------- | ------------------------------------------------- | ----------------- | ---------------------------------- |
| strategy        | `'API_ONLY' \| 'RANDOM' \| 'API_FIRST' \| 'AUTO'` | `'AUTO'`          | 压缩策略                           |
| maxFileSize     | `number`                                          | `5 * 1024 * 1024` | 本地预压缩前的最大文件大小（字节） |
| convertPngToJpg | `boolean`                                         | `false`           | 是否将无透明通道的 PNG 转为 JPG    |
| parallel        | `number`                                          | `3`               | 最大并行压缩数量                   |

## 压缩策略说明

- `API_ONLY`：始终使用 TinyPNG API。需要提供 API key。
- `RANDOM`：随机在 API 和 Web 端点之间选择。
- `API_FIRST`：优先使用 TinyPNG API；当 API key 无效或触发限流时回退到 Web 端点。
- `AUTO`：有 API key 时等同于 `API_FIRST`，否则等同于 `RANDOM`。

## API Key 设置

插件本身不读取 `.env` 文件；由构建工具（Vite）加载。建议使用 `.env.local` 存放本地密钥。

支持的变量名：任何以 `TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS` 结尾的变量。你也可以添加前缀，例如 `VITE_TINYIMG_KEY`。

示例：

```bash
VITE_TINYIMG_KEY=your_api_key
```

## 示例

可运行的示例请参见仓库中的 [`examples/vite`](https://github.com/pzehrel/tinyimg/tree/main/examples/vite)。

## 许可证

[MIT](https://github.com/pzehrel/tinyimg/blob/main/LICENSE)
