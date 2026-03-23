# TinyImg

## What This Is

TinyImg 是一个基于 TinyPNG 的图片压缩工具，提供核心库、CLI 工具和 unplugin 插件三个包。帮助开发者通过智能缓存、多 API key 策略和后备方案最大化节省 TinyPNG 的免费压缩额度（500 张/月）。

## Core Value

通过多 API key 管理、智能缓存和后备方案，最大化节省 TinyPNG API key 的免费额度，避免因额度超限导致压缩失败。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **核心库 (tinyimg-core)**
  - [ ] 管理多个 TinyPNG API key，支持从环境变量（TINYPNG_KEYS）和全局配置（~/.tinyimg/keys.json）读取
  - [ ] 使用 tinify 官方包实时查询 API key 额度，额度用完自动切换到下一个 key
  - [ ] 提供三种 key 使用策略：random（默认）、round-robin、priority（优先用 key，key 不可用时降级到后备方案）
  - [ ] 基于 MD5 的永久缓存系统，避免重复压缩同一张图片
  - [ ] 后备方案使用 tinypng.com 的在线压缩接口，所有 key 耗尽时自动降级
  - [ ] 并发控制，默认并发数 8，通过 `-p, --parallel <number>` 配置
  - [ ] 错误处理：所有 key 耗尽且后备方案连续失败 8 次后停止执行

- [ ] **CLI 工具 (tinyimg-cli)**
  - [ ] 支持多文件/目录输入，支持 glob 模式：`tinyimg [options] <input...>`
  - [ ] 选项支持：
    - [ ] `-o, --output <dir>` - 指定输出目录
    - [ ] `-k, --key <key>` - 指定使用的 API key（优先级高于环境变量）
    - [ ] `-m, --mode <mode>` - 指定 key 使用策略（random/round-robin/priority）
    - [ ] `-p, --parallel <number>` - 指定并发数（默认 8）
    - [ ] `-c, --cache` - 启用缓存（默认开启）
    - [ ] `-h, --help` - 显示帮助信息
  - [ ] 全局 key 管理命令：
    - [ ] `tinyimg key add <key>` - 添加 API key
    - [ ] `tinyimg key remove [key]` - 移除 API key（不指定则选择）
    - [ ] `tinyimg key` - 列出所有 key 及使用情况（脱敏显示：前 4 位 + 后 4 位）
  - [ ] 缓存系统：项目级缓存（.node_modules/.tinyimg_cache/）和全局缓存（~/.tinyimg/cache/）
  - [ ] 执行时显示所有 API key 的使用情况（脱敏显示），方便用户了解额度状态
  - [ ] 支持 PNG 和 JPG/JPEG 格式（TinyPNG 支持的格式）

- [ ] **unplugin 插件 (tinyimg-unplugin)**
  - [ ] 支持 Vite、Webpack、Rolldown
  - [ ] 配置选项：
    - [ ] `mode` - key 使用策略
    - [ ] `cache` - 启用缓存（默认开启，仅项目级缓存）
    - [ ] `parallel` - 并发数（默认 8）
  - [ ] 仅从环境变量读取 API key，不支持 CLI 的 `-k` 选项
  - [ ] 仅使用项目级缓存（.node_modules/.tinyimg_cache/）

- [ ] **Monorepo 与工程化**
  - [ ] 使用 pnpm workspace 管理三个包：tinyimg-core、tinyimg-cli、tinyimg-unplugin
  - [ ] 统一版本号，发布时同时发布三个包
  - [ ] 使用 tsdown 编译 TypeScript，自动生成 .d.ts 类型定义文件
  - [ ] 使用 vitest 进行测试
  - [ ] 使用 eslint + @antfu/eslint-config（开启 stylistic，禁用 prettier）
  - [ ] 使用 @posva/prompts 处理命令行交互
  - [ ] 使用 kleur 进行命令行着色
  - [ ] 最低支持 Node.js 18
  - [ ] 使用 GitHub Actions 进行 CI/CD（自动化测试和发布）

### Out of Scope

- **SVG 压缩** — TinyPNG 不支持 SVG 格式，超出项目范围
- **其他图片格式** — 仅支持 TinyPNG 支持的格式（PNG、JPG/JPEG），不包括 WebP、AVIF 等
- **图片格式转换** — 工具专注于压缩，不进行格式转换
- **GUI 界面** — 纯命令行工具，不提供图形界面
- **付费 API key 管理** — 不涉及付费 key 的购买和管理，仅管理已有的 key

## Context

TinyPNG 提供每月 500 张的免费压缩额度，超过后需要付费。对于包含大量图片的项目，这个额度很快就会用完。团队协作和 CI/CD 场景下，每个开发者/环境配置自己的 API key，不共享 key。

后备方案使用 tinypng.com 的在线压缩接口，但有并发限制（短时间内约 10 张）。通过缓存系统（基于 MD5）避免重复压缩，可以最大程度节省额度。

## Constraints

- **技术栈**: TypeScript + pnpm + tsdown + vitest + tinify 官方包 — 现代化开发体验和类型安全
- **Node.js 版本**: 最低支持 Node.js 18 — 使用较新的 JS 特性
- **API key 配额**: TinyPNG 免费版每月 500 张 — 核心约束，所有功能围绕节省额度设计
- **后备方案并发**: 短时间内约 10 张图片 — 需要并发控制和错误处理
- **TinyPNG API**: 使用 tinify/tinify-nodejs 官方包 — 确保稳定性和官方支持
- **Monorepo**: 三个包统一版本号，同时发布 — 简化版本管理和依赖关系

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用 pnpm workspace | 高效的磁盘空间利用和依赖管理 | — Pending |
| 使用 tsdown 而非 tsc | 更快的编译速度和更好的 .d.ts 生成 | — Pending |
| 缓存基于 MD5 而非文件路径 | 避免相同内容的重复压缩，即使文件位置不同 | — Pending |
| 默认并发数设为 8 | 平衡压缩速度和后备方案的并发限制（约 10） | — Pending |
| API key 脱敏显示前 4 位 + 后 4 位 | 方便用户识别 key，同时保护敏感信息 | — Pending |
| 连续失败 8 次后停止 | 避免无限重试浪费时间和资源 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-23 after initialization*
