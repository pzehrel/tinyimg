# @pz4l/tinyimg-cli

[![npm](https://img.shields.io/npm/v/@pz4l/tinyimg-cli)](https://www.npmjs.com/package/@pz4l/tinyimg-cli)

TinyPNG 图片压缩 CLI。

## 安装

```bash
npm i -g @pz4l/tinyimg-cli
```

或通过 `npx` 免安装使用：

```bash
npx @pz4l/tinyimg-cli src/assets/**
```

## 用法

### 全局选项

| 选项                        | 别名 | 说明                  | 默认值  |
| --------------------------- | ---- | --------------------- | ------- |
| `-o, --output <dir>`        | —    | 输出目录              | —       |
| `-s, --strategy <strategy>` | —    | 压缩策略              | `AUTO`  |
| `--no-cache`                | —    | 禁用缓存              | `false` |
| `-k, --key <keys>`          | —    | 逗号分隔的 API 密钥   | —       |
| `-p, --parallel <number>`   | —    | 并行限制              | `3`     |
| `--convert`                 | `-c` | 启用不透明 PNG 转 JPG | `false` |
| `--verbose`                 | —    | 显示逐张图片明细      | `false` |

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

示例：

```bash
tinyimg convert src/assets/**
tinyimg convert src/assets/** --rename
```

#### `tinyimg keys <subcommand>`

管理 API 密钥。

- `tinyimg keys add <key>` — 添加并验证 API 密钥（支持同时添加多个）
- `tinyimg keys del <maskedKey>` — 删除已保存的密钥
- `tinyimg keys`（无子命令）— 列出所有密钥

示例：

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

示例：

```bash
tinyimg list src/assets/**
tinyimg ls src/assets/** -c
```

## 压缩策略

- `API_ONLY`：始终使用 TinyPNG API。需要提供 API key。
- `RANDOM`：随机在 API 和 Web 端点之间选择。
- `API_FIRST`：优先使用 API；当 API key 无效或触发限流时回退到 Web 端点。
- `AUTO`：有 API key 时等同于 `API_FIRST`，否则等同于 `RANDOM`。

## API 密钥设置

### 项目级密钥

CLI 启动时自动读取当前工作目录下的 `.env` 和 `.env.local`。

支持的变量名：`TINYIMG_KEY`、`TINYIMG_KEYS`、`TINYPNG_KEY`、`TINYPNG_KEYS`（以及任何带前缀的变体，如 `BUILD_TINYIMG_KEY` — 按后缀匹配）。

`.env.local` 示例：

```bash
TINYIMG_KEY=your_api_key
```

### 用户级密钥

通过 `tinyimg keys add <key>` 存储在 `~/.tinyimg/keys.json` 中。当没有项目级密钥时作为回退使用。

## 许可证

[MIT](../../LICENSE)

## 缓存和输出行为

已处理图片不会重复远程压缩，显式开启 PNG 转 JPG 时仅进行本地转换；`--no-cache`（CLI）或 `noCache: true`（插件）只关闭缓存读写。缓存清理保留保存的 API key。PNG 转 JPG 保留文件名，CLI 和插件均默认关闭；分别使用 `--convert` 和 `convertPngToJpg: true` 开启。插件失败时记录错误并保留原图继续构建。插件默认不使用用户保存的 key，`USE_USER_TINYIMG_KEYS=true` 才启用。

## 压缩日志

CLI 和插件默认仅输出开始提示、一行汇总和必要的错误；检测到可转换的不透明 PNG 时，使用 info 提示 `--convert` 或 `convertPngToJpg: true`，不承诺一定更小。已开启转换时不重复提示。CLI 用 `--verbose`、插件用 `verbose: true` 开启按文件名排序的明细，显示大小变化、缓存和转换状态。空任务不输出构建日志。

插件使用宿主原生日志：Vite 的 `config.logger`、Webpack 的 `compiler.getInfrastructureLogger('tinyimg')`、Rsbuild 的 `api.logger`，遵守宿主日志级别。
