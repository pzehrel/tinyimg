# Phase 8: 发布准备 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-03-26
**Phase:** 08-release-prep
**Mode:** discuss
**Language:** 中文

## Discussion Areas

### 发布验证范围
**Question:** 第8阶段需要验证发布流程。您希望如何进行发布前验证？

**User Decisions:**
- ✅ 本地编译验证
- ✅ 本地发布模拟测试
- ✅ Beta发布到真实npm

**Rationale:**
用户选择了完整的验证流程，从本地验证到真实npm测试，确保发布流程的可靠性。

---

### 初始版本号
**Question:** 初始版本号应该如何设置？

**User Decisions:**
- ✅ v0.1.0-beta.1 - Beta预发布版

**Rationale:**
使用预发布版本号进行beta测试，收集反馈后再发布正式v1.0.0版本。

---

### Beta测试策略
**Question:** Beta版本发布后，如何进行测试验证？

**User Decisions:**
- ✅ 创建demo项目测试CLI
- ✅ 在真实项目中测试unplugin
- ✅ 文档示例验证
- ✅ **额外要求**: demo项目放在examples目录下，api key使用.env.local文件

**Rationale:**
全面测试CLI和unplugin功能，同时确保文档示例的正确性。使用.env.local文件保护API key安全。

---

### 发布检查清单
**Question:** 正式发布前需要检查哪些项目？

**User Decisions:**
- ✅ 三个包的package.json完整性
- ✅ 编译产物完整性
- ✅ CI测试通过
- ✅ CHANGELOG更新

**Rationale:**
完整的发布前检查清单，确保包质量、文档和测试都符合发布标准。

---

### 发布触发方式
**Question:** 正式发布时使用什么工作流程？

**User Decisions:**
- ✅ 完全自动（Changesets PR → 自动发布）

**Rationale:**
利用Phase 1已配置的自动化发布流程，实现完全自动化的版本管理和发布。

---

### Beta发布方式
**Question:** Beta版本发布到npm的方式？

**User Decisions:**
- ✅ 使用Changesets pre模式

**Rationale:**
使用Changesets的预发布模式，可以方便地管理beta版本的迭代。

---

## Summary of Decisions

### Version Management
- 初始版本：v0.1.0-beta.1（预发布版）
- 使用 Changesets pre 模式管理
- 正式版本从 v1.0.0 开始

### Release Verification
- 三阶段验证：本地编译 → 本地模拟 → npm beta
- 完整的发布检查清单
- 自动化发布流程

### Testing Strategy
- 创建 examples/ 目录下的 demo 项目
- 使用 .env.local 文件保护 API key
- 测试 CLI 和 unplugin 的所有功能

### Release Workflow
- 完全自动：Changesets PR → 自动版本 → 自动发布
- 无需手动触发或审批

## No Scope Creep
Discussion stayed within Phase 8 scope (release preparation). All decisions focused on verification and testing for publishing.

---

*Phase: 08-release-prep*
*Discussion date: 2026-03-26*
