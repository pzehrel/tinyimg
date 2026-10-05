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

插件按 Vite 实际的 `mode` 和 `envDir` 加载 `.env` 文件。建议使用 `.env.local` 存放本地密钥。

支持的变量名：任何以 `TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS` 结尾的变量。你也可以添加前缀，例如 `BUILD_TINYIMG_KEY`。

示例：

```bash
TINYIMG_KEY=your_api_key
```

## 示例

可运行的示例请参见仓库中的 [`examples/vite`](https://github.com/pzehrel/tinyimg/tree/main/examples/vite)。

## 许可证

[MIT](https://github.com/pzehrel/tinyimg/blob/main/LICENSE)

## 缓存和输出行为

已处理图片不会重复远程压缩，显式开启 PNG 转 JPG 时仅进行本地转换；`--no-cache`（CLI）或 `noCache: true`（插件）只关闭缓存读写。缓存清理保留保存的 API key。PNG 转 JPG 保留文件名，CLI 和插件均默认关闭；分别使用 `--convert` 和 `convertPngToJpg: true` 开启。插件失败时记录错误并保留原图继续构建。插件默认不使用用户保存的 key，`USE_USER_TINYIMG_KEYS=true` 才启用。

Vite processes emitted PNG/JPEG/WebP/AVIF assets in the bundle. Copied `public/` files and inline images are outside this scope.

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

## 宿主版本兼容

开发和示例使用最新稳定版宿主，保留现有兼容下限。详细范围、验证版本及 Node 要求见[宿主兼容说明](../../docs/host-compatibility.md)。
