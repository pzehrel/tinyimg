---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: 功能增强与质量保障
status: executing
last_updated: "2026-03-30T03:12:05.187Z"
last_activity: 2026-03-30
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 9
  completed_plans: 9
---

# TinyImg Project State

**Project Status**: Planning
**Last Updated**: 2026-03-29
**Current Milestone**: v0.3.0 功能增强与质量保障

Last activity: 2026-03-30

## Project Overview

TinyImg 是一个基于 TinyPNG 的图片压缩工具，提供核心库、CLI 工具和 unplugin 插件三个包。通过智能缓存、多 API key 策略和后备方案最大化节省 TinyPNG 的免费压缩额度（500 张/月）。

## Key Context

- **目标用户**: 个人开发者优化项目图片（开源工具）
- **核心痛点**: TinyPNG 免费版每月 500 张配额限制
- **解决方案**: 多 key 管理 + 智能缓存 + 后备方案 + 并发控制

## Technical Stack

- **Runtime**: Node.js >= 18
- **Language**: TypeScript 5.9
- **Package Manager**: pnpm workspace
- **Compiler**: tsdown
- **Testing**: vitest 4.1
- **Linting**: eslint 9.x + @antfu/eslint-config
- **CLI Utils**: @posva/prompts, kleur
- **API**: tinify/tinify-nodejs (官方包)

## Package Structure

```
tinyimg/
├── packages/
│   ├── tinyimg-core/      # 核心库
│   ├── tinyimg-cli/       # CLI 工具
│   └── tinyimg-unplugin/  # unplugin 插件
├── examples/              # Vite/Webpack/Rolldown 示例
└── package.json           # 根 package.json (workspace 配置)
```

## Current Position

Phase: 20
Plan: Not started
Status: Ready to execute
Last activity: 2026-03-30

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** 通过多 API key 管理、智能缓存和后备方案，最大化节省 TinyPNG API key 的免费额度
**Current focus:** Phase 20 — milestone-testing

## Roadmap Evolution

- Phase 20 added: 测试当前里程碑的调整

## Accumulated Context

**v0.1.0 MVP 已完成的工作：**
✅ Phase 1-9: 完整 MVP（9 phases, 46 plans, 114 tasks）

**v0.2.0 维护与修复已完成：**
✅ Phase 10-15: 包发布修复、文档修正、Release 清理、CHANGELOG 优化、资源清理、示例创建

**v0.3.0 功能增强与质量保障（进行中）：**
🚧 Phase 16: Infrastructure Foundation — Not started
🚧 Phase 17: CLI List Command — Not started
🚧 Phase 18: PNG Transparency Detection — Not started
🚧 Phase 19: Format Conversion & Expansion — Not started

**关键决策记录：**

- .npmrc 严格模式防止 workspace:* 泄漏
- Changesets 虚拟根包集中管理 CHANGELOG
- Release 工作流正则过滤稳定版本标签
- 示例项目使用已发布包（非 workspace:*）

## Performance Metrics

### Milestone v0.1.0

| Metric | Value |
|--------|-------|
| Timeline | 4 days (2026-03-24 → 2026-03-26) |
| Phases | 9 phases |
| Plans | 46 plans |
| Tasks | 114 tasks |
| LOC | ~7,000 lines TypeScript |
| Tests | 270+ passing tests |
| Phase 16-infrastructure-foundation P02 | PT5M | 2 tasks | 1 files |
| Phase 16-infrastructure-foundation P03 | 33 | 3 tasks | 3 files |
| Phase 16-infrastructure-foundation P01 | 2min | 5 tasks | 4 files |
| Phase 17 P01 | 2 minutes | 2 tasks | 5 files |
| Phase 18 P01 | 162 | 1 tasks | 6 files |
| Phase 19 P01 | 5min | 4 tasks | 6 files |
| Phase 20-milestone-testing P01 | 332 | 3 tasks | 3 files |
| Phase 20-milestone-testing P02 | 487 | 2 tasks | 2 files |

### Milestone v0.2.0

| Metric | Value |
|--------|-------|
| Timeline | 3 days (2026-03-27 → 2026-03-29) |
| Phases | 6 phases (Phase 10-15) |
| Plans | 12 plans |
| Status | ✅ Completed & Archived |

### Milestone v0.3.0 (In Progress)

| Metric | Value |
|--------|-------|
| Timeline | Started 2026-03-29 |
| Phases | 4 phases (Phase 16-19) |
| Plans | TBD |
| Requirements | 9 total (0/9 complete) |

## v0.3.0 Requirements

### Infrastructure (INFRA)

- INFRA-01: Pre-commit hooks (husky + lint-staged)
- INFRA-02: GitHub Actions test workflow
- INFRA-03: Prevent local npm publish

### Format Support (FMT)

- FMT-01: AVIF/WebP format support
- FMT-02: Multiple input paths/patterns

### Image Processing (IMG)

- IMG-01: PNG transparency detection
- IMG-02: PNG→JPG conversion with convert command

### CLI Experience (CLI)

- CLI-01: CLI list/ls command (dry-run)
- CLI-02: List output with file count and stats

## v0.3.0 Phase Structure

### Phase 16: Infrastructure Foundation

**Goal**: Quality gates and safety mechanisms prevent broken code and accidental releases
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria**:

  1. Developer cannot commit code that fails lint or typecheck (pre-commit hook blocks)
  2. All tests run automatically across multiple Node.js versions on every push/PR
  3. Developer cannot publish packages to npm from local machine (CI-only publishing enforced)

### Phase 17: CLI List Command

**Goal**: Users can preview compressible images before using API quota
**Requirements**: CLI-01, CLI-02
**Success Criteria**:

  1. User can run `tinyimg list` or `tinyimg ls` to see all compressible images in current directory
  2. User can see file count, total size, and estimated savings for each file
  3. List command runs without making any API calls (dry-run mode)

### Phase 18: PNG Transparency Detection

**Goal**: System can detect PNG transparency to enable intelligent format conversion
**Requirements**: IMG-01
**Success Criteria**:

  1. System can accurately detect if PNG has alpha channel transparency
  2. Detection uses pixel sampling (not just metadata) to avoid false positives
  3. Detection completes in under 2 seconds for 5MB PNG files

### Phase 19: Format Conversion & Expansion

**Goal**: Users can convert opaque PNGs to JPG and compress modern image formats
**Requirements**: IMG-02, FMT-01, FMT-02
**Success Criteria**:

  1. User can run `tinyimg convert ./src/*` to convert opaque PNGs to JPG with before/after paths logged
  2. User can compress AVIF and WebP images via glob matching (e.g., `tinyimg "./**/*.webp"`)
  3. User can pass multiple input paths/patterns (e.g., `tinyimg ./src/images/* ./src/assets/*`)

## Coverage Validation

✅ All 9 v0.3.0 requirements mapped to phases
✅ No orphaned requirements
✅ No duplicate mappings

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 16 | Pending |
| INFRA-02 | Phase 16 | Pending |
| INFRA-03 | Phase 16 | Pending |
| CLI-01 | Phase 17 | Pending |
| CLI-02 | Phase 17 | Pending |
| IMG-01 | Phase 18 | Pending |
| IMG-02 | Phase 19 | Pending |
| FMT-01 | Phase 19 | Pending |
| FMT-02 | Phase 19 | Pending |

---
*State initialized: 2026-03-23*
*Last updated: 2026-03-29 — Roadmap created for v0.3.0*
