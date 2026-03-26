[English](README.md) | [简体中文](README.zh-CN.md)

# TinyImg

Smart image compression tool powered by TinyPNG with intelligent caching and multi-API key management.

## Features

- **Multi-API Key Management** - Rotate multiple keys to maximize free quota (500 images/month per key)
- **Intelligent Caching** - MD5-based permanent cache avoids redundant compression
- **Concurrent Processing** - Configurable parallel compression (default: 8)
- **Multiple Tools** - CLI tool and unplugin for Vite/Webpack/Rolldown

## Quick Start

### CLI Tool

Install globally and compress images:

```bash
npm install -g tinyimg-cli
tinyimg *.png *.jpg
```

### Build Plugin

Add to your Vite project:

```js
// vite.config.js
import tinyimg from 'tinyimg-unplugin/vite'

export default {
  plugins: [tinyimg()]
}
```

Set your API key:

```bash
export TINYPNG_KEYS=your_api_key_here
```

## Packages

- **[tinyimg-core](packages/tinyimg-core/)** - Core compression library with caching and key management
- **[tinyimg-cli](packages/tinyimg-cli/)** - Command-line interface for batch compression
- **[tinyimg-unplugin](packages/tinyimg-unplugin/)** - Build tool plugin for Vite/Webpack/Rolldown

## Documentation

- [Core API Reference](packages/tinyimg-core/README.md)
- [CLI Usage Guide](packages/tinyimg-cli/README.md)
- [Plugin Integration](packages/tinyimg-unplugin/README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

MIT
