# TinyImg Roadmap

## Milestone 1: MVP (Minimum Viable Product)

**目标**: 完成核心功能，可以正常压缩图片并发布到 npm

**完成标准**:
- [ ] 三个包 (core/cli/unplugin) 可以正常编译和发布
- [ ] CLI 工具可以压缩图片
- [ ] unplugin 插件可以在构建过程中压缩图片
- [ ] 缓存系统工作正常
- [ ] 基本测试覆盖

---

## Phase 1: 项目初始化和基础设施

**优先级**: P0
**预估时间**: 1-2 天

**目标**: 搭建 monorepo 结构，配置开发工具和 CI/CD

**输出**:
- 可以正常编译的 monorepo 结构
- CI/CD 自动化流程

**Plans:**
- [ ] 01-01-PLAN.md — Workspace setup and package structure creation
- [ ] 01-02-PLAN.md — TypeScript, ESLint, and commitlint configuration
- [ ] 01-03-PLAN.md — Vitest testing framework setup
- [ ] 01-04-PLAN.md — GitHub Actions CI/CD workflows
- [ ] 01-05-PLAN.md — Changesets version management configuration

---

## Phase 2: 核心 API Key 管理

**优先级**: P0
**预估时间**: 2-3 天

**目标**: 实现核心库的 API key 管理功能

**任务**:
- [ ] 实现 API key 读取逻辑（环境变量、全局配置文件）
- [ ] 集成 tinify 官方包，实现额度查询
- [ ] 实现三种 key 使用策略 (random, round-robin, priority)
- [ ] 实现 API key 脱敏显示功能
- [ ] 实现额度用完后自动切换 key 的逻辑
- [ ] 编写单元测试

**依赖**: Phase 1

**输出**:
- tinyimg-core 包的基础功能
- API key 管理模块

---

## Phase 3: 智能缓存系统

**优先级**: P0
**预估时间**: 2-3 天

**目标**: 实现基于 MD5 的缓存系统

**任务**:
- [ ] 实现 MD5 计算模块
- [ ] 实现缓存读写逻辑
- [ ] 实现项目级和全局缓存层级
- [ ] 实现缓存命中检测
- [ ] 实现缓存文件管理（创建、读取、更新）
- [ ] 编写单元测试

**依赖**: Phase 2

**输出**:
- 缓存管理模块
- 支持项目级和全局缓存

---

## Phase 4: 后备方案和并发控制

**优先级**: P0
**预估时间**: 2-3 天

**目标**: 实现后备方案和并发控制机制

**任务**:
- [ ] 实现后备方案（tinypng.com 在线压缩接口）
- [ ] 实现并发控制（p-limit 或类似库）
- [ ] 实现错误重试机制（最多 8 次）
- [ ] 实现降级逻辑（所有 key 耗尽时使用后备方案）
- [ ] 实现友好的错误提示
- [ ] 编写单元测试

**依赖**: Phase 2, Phase 3

**输出**:
- 后备方案模块
- 并发控制和错误处理机制

---

## Phase 5: CLI 工具

**优先级**: P0
**预估时间**: 3-4 天

**目标**: 实现完整的 CLI 工具

**任务**:
- [ ] 实现基础命令 (`tinyimg [options] <input...>`)
- [ ] 实现所有选项 (output, key, mode, parallel, cache, help)
- [ ] 实现文件、目录、glob 模式输入支持
- [ ] 实现全局 key 管理命令 (add, remove, list)
- [ ] 集成 @posva/prompts 处理交互
- [ ] 集成 kleur 进行命令行着色
- [ ] 实现执行信息输出（进度、状态）
- [ ] 编写集成测试

**依赖**: Phase 2, Phase 3, Phase 4

**输出**:
- 完整的 CLI 工具
- 用户文档 (README)

---

## Phase 6: unplugin 插件

**优先级**: P0
**预估时间**: 2-3 天

**目标**: 实现 unplugin 插件，支持 Vite/Webpack/Rolldown

**任务**:
- [ ] 实现 unplugin 基础结构
- [ ] 实现图片文件处理逻辑
- [ ] 实现配置选项 (mode, cache, parallel)
- [ ] 支持 Vite 集成
- [ ] 支持 Webpack 集成
- [ ] 支持 Rolldown 集成
- [ ] 仅使用项目级缓存
- [ ] 编写集成测试

**依赖**: Phase 2, Phase 3, Phase 4

**输出**:
- unplugin 插件
- 使用示例和文档

---

## Phase 7: 测试和文档

**优先级**: P0
**预估时间**: 2-3 天

**目标**: 完善测试覆盖和文档

**任务**:
- [ ] 补充单元测试（目标覆盖率 80%+）
- [ ] 编写集成测试
- [ ] 编写 E2E 测试（CLI 和 unplugin）
- [ ] 编写 README (core, cli, unplugin)
- [ ] 编写 API 文档
- [ ] 编写使用示例
- [ ] 编写贡献指南

**依赖**: Phase 5, Phase 6

**输出**:
- 完整的测试套件
- 完整的文档

---

## Phase 8: 发布准备

**优先级**: P0
**预估时间**: 1-2 天

**目标**: 准备发布到 npm

**任务**:
- [ ] 验证三个包可以正常编译
- [ ] 验证三个包可以正常发布
- [ ] 设置 npm 包名 (@tinyimg/* 或 tinyimg-*)
- [ ] 配置 GitHub Actions 自动发布
- [ ] 编写 CHANGELOG
- [ ] 设置版本号管理
- [ ] 进行 beta 测试

**依赖**: Phase 7

**输出**:
- 发布到 npm 的三个包
- 自动发布流程

---

## Future Milestones

### Milestone 2: 功能增强

**可能的改进**:
- [ ] 支持更多图片格式（WebP, AVIF）
- [ ] 提供可视化进度条
- [ ] 支持自定义缓存目录
- [ ] 提供全局缓存管理命令
- [ ] 支持配置文件 (tinyimg.config.js)

### Milestone 3: 性能优化

**可能的改进**:
- [ ] 优化并发控制策略
- [ ] 优化缓存查询性能
- [ ] 支持增量压缩
- [ ] 支持流式处理大文件

---

## Phase Dependencies

```
Phase 1 (初始化)
    ↓
Phase 2 (API Key 管理)
    ↓
Phase 3 (缓存系统) ←──── Phase 4 (后备方案) ────→
    ↓                                        ↓
Phase 5 (CLI 工具) ←─────────────────────────┘
    ↓
Phase 6 (unplugin 插件)
    ↓
Phase 7 (测试和文档)
    ↓
Phase 8 (发布准备)
```

---

## Risk Assessment

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| TinyPNG 后备接口不稳定 | 高 | 优先使用 API key，后备方案仅作兜底 |
| 缓存文件损坏 | 中 | 缓存损坏时重新压缩并更新缓存 |
| 并发控制不当导致限流 | 中 | 默认并发数设为 8，提供配置选项 |
| unplugin 兼容性问题 | 中 | 在主流构建工具中充分测试 |

---

## Last Updated

**2026-03-23**: Phase 1 plans created (5 plans in 3 waves)
