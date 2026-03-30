# TinyImg

## What This Is

TinyImg 是一个基于 TinyPNG 的图片压缩工具，提供核心库、CLI 工具和 unplugin 插件三个包。帮助开发者通过智能缓存、多 API key 策略和后备方案最大化节省 TinyPNG 的免费压缩额度（500 张/月）。

## Core Value

通过多 API key 管理、智能缓存和后备方案，最大化节省 TinyPNG API key 的免费额度，避免因额度超限导致压缩失败。

## Requirements

### Validated (v0.1.0)

- ✓ **Monorepo 工程化** — v0.1.0
  - pnpm workspace 管理三个包（tinyimg-core、tinyimg-cli、tinyimg-unplugin）
  - 统一版本号，Changesets 自动化版本管理
  - TypeScript 5.9 + tsdown 编译，自动生成 .d.ts
  - Vitest 4.1 测试框架，v8 coverage provider
  - ESLint 9.x + @antfu/eslint-config
  - GitHub Actions CI/CD（lint, test, build, release with OIDC）
  - Node.js 18+ 支持

- ✓ **API Key 管理** — v0.1.0
  - 多 key 管理（环境变量 TINYPNG_KEYS 优先，~/.tinyimg/keys.json 备用）
  - 实时额度查询（tinify.compressionCount + 本地计数器优化）
  - 三种策略：random（默认）、round-robin、priority
  - 懒加载验证（validateKey 仅在选择时调用）
  - 脱敏显示（前4位+****+后4位）

- ✓ **智能缓存系统** — v0.1.0
  - MD5 哈希（完整文件内容）
  - 两级缓存：项目缓存（优先）+ 全局缓存（备用）
  - 原子写入（临时文件 + rename）
  - 永久缓存，无 TTL

- ✓ **后备方案与并发控制** — v0.1.0
  - tinypng.com 在线压缩接口（form-data@4.0.5）
  - p-limit 并发控制（默认 8）
  - 指数退避重试（baseDelay * 2^attempt，最多 8 次）
  - 自动降级（API key 耗尽 → web interface）

- ✓ **CLI 工具** — v0.1.0
  - 文件/目录/glob 输入支持（fast-glob）
  - 选项：-o, -k, -m, -p, -c, -h
  - Key 管理命令：add, remove, list（@clack/prompts 交互式选择）
  - 进度显示（formatProgress, formatResult, formatBytes）
  - 双语文档（EN/ZH）

- ✓ **unplugin 插件** — v0.1.0
  - 支持 Vite/Webpack/Rolldown（createUnplugin）
  - 仅生产环境压缩（isProductionBuild 检测）
  - 仅从环境变量读取 key（TINYPNG_KEYS）
  - 仅项目级缓存（projectCacheOnly: true）
  - 文件过滤（PNG/JPG/JPEG，include/exclude glob）
  - 构建日志（verbose + summary 模式）

### Validated (v0.2.0)

- ✓ **包发布流程** — v0.2.0 (Phase 10)
  - .npmrc 严格模式，防止 workspace:* 泄漏到发布包
  - GitHub Actions 自动化安装测试 CI
  - 手动安装测试文档

- ✓ **文档修正** — v0.2.0 (Phase 11)
  - 移除 webpack.DefinePlugin 错误示例
  - 为 Vite/Webpack/Rolldown 添加正确的环境变量配置文档

- ✓ **Release 流程清理** — v0.2.0 (Phase 12)
  - 稳定版本标签正则过滤（排除 alpha/beta/rc/test）
  - Changesets 标准发布消息格式

- ✓ **CHANGELOG 集中管理** — v0.2.0 (Phase 13)
  - Changesets 虚拟根包 + fixed 模式
  - 删除三个子包 CHANGELOG.md
  - 统一根目录 CHANGELOG.md

- ✓ **测试资源清理** — v0.2.0 (Phase 14)
  - 删除 test-images 和 examples/test-install 目录

- ✓ **示例项目** — v0.2.0 (Phase 15)
  - Vite/Webpack/Rolldown 示例项目（含 .env.example + README）

### Validated (v0.3.0)

- ✓ **基础设施保障** — v0.3.0 (Phase 16)
  - Husky pre-commit hooks: lint-staged (eslint --fix + tsc --noEmit) + commitlint
  - GitHub Actions test-matrix workflow (Node 18/20/22)
  - 双层发布保护: .npmrc localhost 重定向 + prepublishOnly CI 检查

- ✓ **CLI list/ls 命令** — v0.3.0 (Phase 17)
  - `tinyimg list`/`tinyimg ls` 预览可压缩图片
  - 显示文件名、大小、总数和总大小
  - 纯本地运行，零 API 调用

- ✓ **PNG 透明通道检测** — v0.3.0 (Phase 18)
  - `detectAlpha()`/`detectAlphas()` 像素级 alpha 通道检测
  - 100x100 下采样优化，非 PNG 文件优雅返回 false
  - 批量检测支持并发控制

- ✓ **格式转换与多格式支持** — v0.3.0 (Phase 19)
  - `tinyimg convert` 命令：PNG→JPG 转换，透明检测自动跳过
  - AVIF/WebP 格式扩展支持（isImageFile + glob 匹配）
  - `--convert` 压缩后转换标志，`--delete-original` 选项

- ✓ **里程碑测试验证** — v0.3.0 (Phase 20)
  - 测试覆盖率从 83.52% 提升至 87.04%
  - 377 个测试（372 passing，5 skipped），零回归
  - E2E 测试 + 9 项需求自动化验证 + 手动验证全部通过

### Active

**当前里程碑：v0.3.0 功能增强与质量保障 — 全部阶段完成，验证通过**

### Out of Scope

- **SVG 压缩** — TinyPNG 不支持 SVG 格式
- **GUI 界面** — 纯命令行工具，不提供图形界面
- **付费 API key 管理** — 不涉及付费 key 的购买和管理
- **GIF/TIFF 格式** — TinyPNG 不支持，暂无计划

## Context

### Current State (v0.3.0 In Progress)

**Delivered:**
- ✅ v0.1.0 MVP: 9 phases, 46 plans, 114 tasks, ~7,000 LOC, 270+ tests
- ✅ v0.2.0 维护与修复: 6 phases (10-15), 12 plans
- ✅ Phase 16: Infrastructure Foundation — pre-commit hooks, test matrix CI, publish protection
- ✅ Phase 17: CLI list/ls command — dry-run image preview, zero API calls
- ✅ Phase 18: PNG transparency detection — alpha channel pixel-level scanning
- ✅ Phase 19: Format conversion expansion — PNG→JPG convert, AVIF/WebP support
- ✅ Phase 20: Milestone testing — 377 tests, 87.04% coverage, 9/9 requirements verified
- 148+ files changed across all milestones

**Package Structure:**
```
packages/
├── tinyimg-core/      # 核心库 (@pz4l/tinyimg-core)
├── tinyimg-cli/       # CLI 工具 (@pz4l/tinyimg-cli)
└── tinyimg-unplugin/  # unplugin 插件 (@pz4l/tinyimg-unplugin)
```

**Tech Stack:**
- Runtime: Node.js 18+
- Language: TypeScript 5.9
- Build: tsdown
- Test: Vitest 4.1
- Lint: ESLint 9.x + @antfu/eslint-config
- Package Manager: pnpm workspace
- CI/CD: GitHub Actions (OIDC trusted publishing)

**Next Milestone:** v0.4.0 (to be defined)

---

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

---

## Current Milestone: v0.3.0 功能增强与质量保障

**Goal:** 扩展图片格式支持，增强 CLI 功能，并强化代码质量保证机制

**Target features:**
- ✓ **需求调整:** glob 支持文件夹路径、AVIF/WebP 格式支持
- ✓ **新增功能:** JPG 转换、CLI list/ls 命令

---

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
*Last updated: 2026-03-30 after Phase 20 completion — v0.3.0 milestone complete*
