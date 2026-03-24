# TinyImg Requirements

## Overview

TinyImg 是一个基于 TinyPNG 的图片压缩工具，包含核心库 (tinyimg-core)、CLI 工具 (tinyimg-cli) 和 unplugin 插件 (tinyimg-unplugin) 三个包。通过智能缓存、多 API key 策略和后备方案，最大化节省 TinyPNG 的免费压缩额度（500 张/月）。

## Success Criteria

- [ ] 用户可以通过 CLI 工具或 unplugin 插件成功压缩 PNG 和 JPG/JPEG 图片
- [ ] 支持多个 API key 管理，额度用完后自动切换到下一个 key
- [ ] 基于 MD5 的缓存系统工作正常，避免重复压缩相同内容的图片
- [ ] 所有 key 耗尽时，自动降级到后备方案（tinypng.com 在线压缩接口）
- [ ] 并发控制和错误处理机制工作正常（连续失败 8 次后停止）
- [ ] 三个包可以正常发布到 npm，并在实际项目中使用

## Functional Requirements

### FR1: 核心 API Key 管理

**优先级**: P0 (必须)

**描述**: 系统必须支持多个 TinyPNG API key 的管理，并智能选择使用。

**需求详情**:

1. **API Key 来源优先级**:
   - 最高优先级: CLI 参数 `-k, --key <key>`
   - 次优先级: 项目环境变量 `TINYPNG_KEYS` (逗号分隔的多个 key)
   - 最低优先级: 全局配置文件 `~/.tinyimg/keys.json`

2. **API Key 额度查询**:
   - 使用 `tinify` 官方包实时查询每个 key 的剩余额度
   - 额度查询结果在执行时显示（脱敏显示：前 4 位 + 后 4 位，如 `abcd****efgh`）
   - 如果 key 额度用完（剩余 0），自动切换到下一个可用 key

3. **API Key 使用策略**:
   - `random` (默认): 随机选择一个可用 key
   - `round-robin`: 轮询使用所有可用 key
   - `priority`: 优先使用 API key，仅在所有 key 不可用时使用后备方案

**验收标准**:

- [x] 可以从环境变量、全局配置文件读取多个 key
- [x] 实时查询并显示每个 key 的剩余额度
- [x] 额度用完后自动切换到下一个 key
- [x] 三种使用策略工作正常

**完成状态**: ✅ Phase 2 Complete (2026-03-24)

---

### FR2: 智能缓存系统

**优先级**: P0 (必须)

**描述**: 基于 MD5 的缓存系统，避免重复压缩相同内容的图片。

**需求详情**:

1. **缓存 Key 生成**:
   - 计算原始图片文件的 MD5 值作为缓存 key
   - 相同内容的图片（即使文件名或路径不同）会命中同一个缓存

2. **缓存层级**:
   - **项目级缓存** (优先): `.node_modules/.tinyimg_cache/`
     - 默认启用
     - 仅限当前项目使用
   - **全局缓存** (备用): `~/.tinyimg/cache/`
     - CLI 默认关闭，unplugin 不使用
     - 跨项目共享缓存

3. **缓存存储**:
   - 文件名: MD5 值
   - 文件内容: 压缩后的图片数据
   - 永久有效，不设置 TTL

4. **缓存读取逻辑**:
   - CLI 工具: 优先使用项目级缓存，未命中则使用全局缓存
   - unplugin: 仅使用项目级缓存

**验收标准**:

- [ ] 相同内容的图片（不同文件名）命中同一缓存
- [ ] 项目级缓存优先于全局缓存
- [ ] 缓存命中后不再调用 TinyPNG API
- [ ] unplugin 不读取全局缓存

---

### FR3: 后备方案

**优先级**: P0 (必须)

**描述**: 当所有 API key 额度耗尽时，自动降级到 tinypng.com 的在线压缩接口。

**需求详情**:

1. **触发条件**:
   - 所有 API key 的剩余额度均为 0
   - 或没有配置任何 API key

2. **后备方案接口**:
   - 使用 tinypng.com 的在线压缩接口: `https://tinypng.com/backend/opt/shrink`
   - 该接口未公开但稳定可靠

3. **并发限制**:
   - 后备方案有并发限制（短时间内约 10 张图片）
   - 所有压缩任务（包括 API key 和后备方案）都受并发控制
   - 默认并发数: 8（可通过 `-p, --parallel <number>` 配置）

4. **错误处理**:
   - 连续失败 8 次后停止执行
   - 显示清晰的错误提示，建议用户检查 API key 或稍后再试

**验收标准**:

- [ ] 所有 key 额度耗尽时自动降级到后备方案
- [ ] 并发控制正常工作
- [ ] 连续失败 8 次后停止并提示用户

---

### FR4: CLI 工具

**优先级**: P0 (必须)

**描述**: 提供命令行接口，支持批量压缩图片和管理 API key。

**需求详情**:

1. **基础命令**:

   ```bash
   tinyimg [options] <input...>
   ```

   - `input`: 支持多个文件路径、目录路径、glob 模式

2. **选项**:
   - `-o, --output <dir>`: 指定输出目录（默认为输入文件所在目录）
   - `-k, --key <key>`: 指定使用的 API key（优先级高于环境变量）
   - `-m, --mode <mode>`: 指定 key 使用策略（random/round-robin/priority，默认 random）
   - `-p, --parallel <number>`: 指定并发数（默认 8）
   - `-c, --cache`: 启用缓存（默认开启）
   - `-h, --help`: 显示帮助信息

3. **全局 Key 管理命令**:

   ```bash
   tinyimg key add <key>        # 添加 API key
   tinyimg key remove [key]     # 移除 API key（不指定则交互式选择）
   tinyimg key                  # 列出所有 key 及使用情况
   ```

4. **执行信息输出**:
   - 显示所有 API key 的使用情况（脱敏显示）
   - 显示当前使用的策略和并发数
   - 显示压缩进度和结果

**验收标准**:

- [ ] 支持文件、目录、glob 模式输入
- [ ] 所有选项工作正常
- [ ] Key 管理命令可以添加、删除、列出 key
- [ ] 执行时显示清晰的状态信息

---

### FR5: unplugin 插件

**优先级**: P0 (必须)

**描述**: 提供 unplugin 插件，在构建过程中自动压缩图片。

**需求详情**:

1. **支持的构建工具**:
   - Vite
   - Webpack
   - Rolldown

2. **配置选项**:

   ```js
   // vite.config.js
   import tinyimg from 'tinyimg-unplugin'

   export default {
     plugins: [
       tinyimg({
         mode: 'random',        // key 使用策略（默认 random）
         cache: true,           // 启用缓存（默认 true）
         parallel: 8            // 并发数（默认 8）
       })
     ]
   }
   ```

3. **环境限制**:
   - 仅从环境变量读取 API key
   - 不支持 CLI 的 `-k` 选项
   - 仅使用项目级缓存

4. **文件类型**:
   - 支持 PNG、JPG/JPEG（TinyPNG 支持的格式）
   - 忽略 SVG 和其他格式

**验收标准**:

- [ ] 可以在 Vite、Webpack、Rolldown 中正常工作
- [ ] 配置选项生效
- [ ] 仅从环境变量读取 key
- [ ] 仅处理 PNG 和 JPG/JPEG 文件

---

### FR6: Monorepo 工程化

**优先级**: P0 (必须)

**描述**: 使用 pnpm workspace 管理三个包，统一版本号和发布流程。

**需求详情**:

1. **包结构**:

   ```
   tinyimg/
   ├── packages/
   │   ├── tinyimg-core/       # 核心库
   │   ├── tinyimg-cli/        # CLI 工具
   │   └── tinyimg-unplugin/   # unplugin 插件
   ├── package.json            # 根 package.json
   ├── pnpm-workspace.yaml     # workspace 配置
   └── tsconfig.json           # TypeScript 配置
   ```

2. **依赖关系**:
   - `tinyimg-cli` 依赖 `tinyimg-core`
   - `tinyimg-unplugin` 依赖 `tinyimg-core`
   - 三个包统一版本号，同时发布

3. **编译配置**:
   - 使用 tsdown 编译 TypeScript
   - 自动生成 .d.ts 类型定义文件
   - 最低支持 Node.js 18

4. **开发工具**:
   - 使用 vitest 进行测试
   - 使用 eslint + @antfu/eslint-config（开启 stylistic，禁用 prettier）
   - 使用 @posva/prompts 处理命令行交互
   - 使用 kleur 进行命令行着色

5. **CI/CD**:
   - 使用 GitHub Actions
   - 自动化测试和发布流程
   - 统一版本号管理

**验收标准**:

- [ ] pnpm workspace 正常工作
- [ ] 三个包可以正常编译和发布
- [ ] 测试、linting 通过
- [ ] CI/CD 自动化流程工作正常

---

## Non-Functional Requirements

### NFR1: 性能

- [ ] 单张图片压缩时间应在合理范围内（取决于网络和图片大小）
- [ ] 缓存命中时无需网络请求，即时返回
- [ ] 并发压缩不阻塞主线程（使用异步处理）

### NFR2: 可靠性

- [ ] 压缩失败时自动重试（最多 8 次）
- [ ] 所有 key 耗尽且后备方案失败时，清晰提示用户
- [ ] 缓存文件损坏时不影响正常压缩（重新压缩并更新缓存）

### NFR3: 可用性

- [ ] CLI 提供清晰的错误提示和使用说明
- [ ] API key 脱敏显示，保护敏感信息
- [ ] 执行时显示进度和状态，用户了解当前情况

### NFR4: 可维护性

- [ ] 代码使用 TypeScript 编写，有完整的类型定义
- [ ] 三个包之间职责清晰，低耦合
- [ ] 提供完整的测试用例

### NFR5: 兼容性

- [ ] 最低支持 Node.js 18
- [ ] 支持 Vite、Webpack、Rolldown 等主流构建工具
- [ ] 支持 macOS、Linux、Windows

---

## Out of Scope

以下功能明确不在本项目的范围内：

- **SVG 压缩**: TinyPNG 不支持 SVG 格式
- **其他图片格式**: 仅支持 PNG、JPG/JPEG，不包括 WebP、AVIF 等
- **图片格式转换**: 工具专注于压缩，不进行格式转换
- **GUI 界面**: 纯命令行工具，不提供图形界面
- **付费 API key 管理**: 不涉及付费 key 的购买和管理

---

## Dependencies

### 外部依赖

- `tinify` (tinify/tinify-nodejs): TinyPNG 官方包，用于查询额度和压缩图片
- `unplugin`: unplugin 插件基础库
- `@posva/prompts`: 命令行交互
- `kleur`: 命令行着色
- `crypto` (Node.js 内置): 计算 MD5
- `fs` (Node.js 内置): 文件系统操作

### 内部依赖

- `tinyimg-cli` → `tinyimg-core`
- `tinyimg-unplugin` → `tinyimg-core`

---

## Open Questions

目前没有未解决的问题。所有需求已经明确。

---

## Change Log

- **2026-03-23**: 初始版本，从 PROJECT.md 衍生
