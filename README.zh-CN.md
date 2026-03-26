[English](README.md) | 简体中文

# TinyImg

基于 TinyPNG 的智能图片压缩工具，支持智能缓存和多 API 密钥管理。

## 特性

- **多 API 密钥管理** - 轮换多个密钥以最大化免费额度（每个密钥每月 500 张图片）
- **智能缓存** - 基于 MD5 的永久缓存避免重复压缩
- **后备策略** - 额度耗尽时自动降级到 tinypng.com
- **并发处理** - 可配置的并行压缩（默认：8）
- **多种工具** - CLI 工具和 Vite/Webpack/Rolldown 的 unplugin

## 快速开始

### CLI 工具

全局安装并压缩图片：

```bash
npm install -g tinyimg-cli
tinyimg *.png *.jpg
```

### 构建插件

添加到你的 Vite 项目：

```js
// vite.config.js
import tinyimg from 'tinyimg-unplugin/vite'

export default {
  plugins: [tinyimg()]
}
```

设置你的 API 密钥：

```bash
export TINYPNG_KEYS=your_api_key_here
```

## 包介绍

- **[tinyimg-core](packages/tinyimg-core/)** - 核心压缩库，支持缓存和密钥管理
- **[tinyimg-cli](packages/tinyimg-cli/)** - 批量压缩的命令行界面
- **[tinyimg-unplugin](packages/tinyimg-unplugin/)** - Vite/Webpack/Rolldown 构建工具插件

## 文档

- [核心 API 参考](packages/tinyimg-core/README.md)
- [CLI 使用指南](packages/tinyimg-cli/README.md)
- [插件集成](packages/tinyimg-unplugin/README.md)
- [贡献指南](CONTRIBUTING.md)
- [更新日志](CHANGELOG.md)

## License

MIT
