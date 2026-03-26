# Phase 8: 发布准备 - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

准备发布到 npm，验证三个包（tinyimg-core、tinyimg-cli、tinyimg-unplugin）的发布流程，进行 beta 测试，确保正式发布时的可靠性和完整性。

**In scope**:
- 验证三个包可以正常编译
- 验证三个包可以正常发布到 npm
- Beta 发布测试（v0.1.0-beta.1）
- 创建 demo 项目测试 CLI 和 unplugin
- 配置完整的发布前检查清单

**Out scope**: 正式 v1.0.0 发布（Phase 9 后续）
</domain>

<decisions>
## Implementation Decisions

### 发布验证范围
- **D-01**: 本地编译验证
  - 在干净环境中运行 `pnpm build`
  - 确保三个包都能成功编译并生成 dist/ 目录
  - 验证 dist/ 目录包含必要的文件（.mjs, .d.ts）

- **D-02**: 本地发布模拟测试
  - 使用 `npm pack` 生成 .tgz 文件
  - 在测试项目中安装验证包结构
  - 确保包的 exports、files 配置正确

- **D-03**: Beta 发布到真实 npm
  - 发布预发布版本到 npm registry
  - 在真实项目中测试安装和使用
  - 收集反馈后再决定正式发布

### 初始版本号
- **D-04**: 使用预发布版本号
  - 初始版本：`v0.1.0-beta.1`
  - 使用 Changesets pre 模式管理预发布版本
  - Beta 版本迭代：v0.1.0-beta.2, v0.1.0-beta.3...
  - 正式版本从 v1.0.0 开始

### Beta 测试策略
- **D-05**: 创建 demo 项目测试 CLI
  - Demo 项目位置：`examples/cli-demo/`
  - 使用 `.env.local` 文件存储 API key（不提交到 git）
  - 测试 CLI 的所有功能：压缩、key 管理、缓存等

- **D-06**: 在真实项目中测试 unplugin
  - 创建 Vite 项目 demo：`examples/vite-demo/`
  - 创建 Webpack 项目 demo：`examples/webpack-demo/`
  - 测试构建时图片压缩功能

- **D-07**: 文档示例验证
  - 手动运行 README 中的所有示例命令
  - 确保文档中的代码片段都能正常工作
  - 验证安装说明、使用示例、配置选项

### 发布检查清单
- **D-08**: package.json 完整性检查
  - 所有必需字段：name, version, description, author, license
  - 元数据字段：homepage, repository, bugs, keywords
  - exports 和 files 配置正确
  - engines 字段声明 Node.js >= 18

- **D-09**: 编译产物完整性检查
  - dist/ 目录存在且包含必要的文件
  - .mjs 文件（ESM 产物）
  - .d.ts 文件（TypeScript 类型定义）
  - package.json 的 exports 字段指向正确路径

- **D-10**: CI 测试通过
  - 所有测试用例通过（pnpm test）
  - ESLint 检查无错误（pnpm lint）
  - TypeScript 类型检查通过（pnpm typecheck）

- **D-11**: CHANGELOG 更新
  - 使用 Changesets 自动生成 CHANGELOG.md
  - 记录 beta 版本的变更内容
  - 遵循 Keep a Changelog 格式

### 发布工作流程
- **D-12**: 完全自动发布流程
  - 创建 changeset → 提交 PR
  - PR 合并后自动创建 Version PR
  - Version PR 合并后自动发布到 npm
  - 无需手动触发或审批

- **D-13**: Beta 发布使用 Changesets pre 模式
  - 进入预发布模式：`pnpm changeset enter pre beta`
  - 创建 changeset 时自动使用预发布版本号
  - 发布命令：`pnpm changeset publish`
  - 退出预发布模式：`pnpm changeset exit pre`

### Claude's Discretion
- Demo 项目的具体实现细节
- CI 工作流的优化和调整
- Beta 测试的具体测试用例设计

### Folded Todos
（无）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1: 基础设施决策
- `.planning/phases/01-project-initialization/01-CONTEXT.md` — Package naming (D-02: tinyimg-*, no scope), Changesets config (D-17-D-19), Auto-publish workflow (D-13)

### 发布配置文件
- `.changeset/config.json` — Changesets 配置（固定版本、公共访问）
- `.github/workflows/release.yml` — GitHub Actions 发布工作流
- `packages/*/package.json` — 三个包的发布配置

### 版本管理
- Changesets documentation — https://github.com/changesets/changesets
- npm publishing documentation — https://docs.npmjs.com/cli/v9/commands/npm-publish

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **GitHub Actions workflows**:
  - `.github/workflows/ci.yml` — CI 工作流（test + lint + typecheck）
  - `.github/workflows/release.yml` — 发布工作流（已配置 Changesets action）

- **Changesets 配置**:
  - `.changeset/config.json` — 固定三个包版本统一
  - 已配置 `access: public`（开源 npm 包）

### Established Patterns
- **统一版本管理**: 三个包共享版本号，同时发布
- **自动化发布**: Changesets PR → 自动版本 → 自动发布
- **包命名约定**: 不使用 scope，直接使用 `tinyimg-*` 命名

### Integration Points
- **发布触发点**: 合并 Version PR 到 main 分支
- **版本号管理**: 通过 Changesets 自动管理
- **npm registry**: 发布到公共 npm registry

</code_context>

<specifics>
## Specific Ideas

**Beta 测试场景**:
- CLI demo 应包含常见使用场景：单文件压缩、批量压缩、目录压缩、glob 模式
- unplugin demo 应展示在主流构建工具中的集成方式
- 文档示例验证应确保新用户能按照文档成功使用工具

**Demo 项目要求**:
- examples/ 目录下的 demo 项目应该简单易懂
- 每个 demo 都有 README 说明使用方法
- .env.local 文件在 .gitignore 中，不提交 API key

**发布前验证顺序**:
1. 本地编译验证 → 2. 本地发布模拟测试 → 3. Beta 发布到 npm → 4. Demo 项目测试 → 5. 真实项目测试 → 6. 检查清单确认

</specifics>

<deferred>
## Deferred Ideas

- **正式 v1.0.0 发布** — Beta 测试完成后再决定正式发布计划
- **npm org scope (@tinyimg/*)** — 未来如果需要可以考虑使用 scope，当前保持简洁
- **发布到多个 registry** — 目前仅发布到 npm，未来可考虑其他 registry

</deferred>

---

*Phase: 08-release-prep*
*Context gathered: 2026-03-26*
