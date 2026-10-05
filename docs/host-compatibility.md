# 构建宿主兼容范围

本次按用户要求升级开发和示例使用的宿主编译器，保留已有 peerDependencies 的最低版本声明。

| 插件 | peerDependencies 范围 | 开发与示例版本 | 实际构建验证版本 |
| --- | --- | --- | --- |
| Vite | `^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0` | 8.3.2 | 5.0.0、6.4.2（升级前锁定版本）、7.3.1、8.3.2 |
| Webpack | `^5.0.0` | 5.111.1 | 5.106.1（升级前锁定版本）、5.111.1 |
| Rsbuild | `>=1.0.0` | 2.2.11 | 1.7.5（升级前锁定版本）、2.2.11 |

范围声明与实际测试版本分开记录；测试不等于穷举范围内每个补丁版本。Webpack 5.0.0 的依赖安装受到仓库 pnpm 信任策略拒绝，本次没有降低该策略；Webpack 和 Rsbuild 使用升级前实际锁定版本作为回归基线。

## 兼容改动

- Vite 8 使用 Rolldown，不能直接通过 `bundle[newName] = asset` 添加资源。旧 Rollup 通过 `this.emitFile()` 输出新资产并删除旧资产；Rolldown 通过支持的 asset.fileName 属性更新原生改名，不向 bundle 添加新属性。两种路径保留原始文件名元数据与 manifest 来源键；Vite 8 的共享资源别名另有回归测试。
- 旧 Rollup 的 `referencedFiles` 按可选字段处理；新旧版本都更新 Vite 的 importedAssets 和生成的资源引用。
- Webpack/Rsbuild 的既有 processAssets、renameAsset、ReplaceSource 和原生日志适配继续使用；在两个宿主版本上运行实际构建验证。

参考：[Vite 8 迁移说明](https://vite.dev/guide/migration#advanced)、[Rsbuild 1 到 2 迁移说明](https://www.rsbuild.dev/guide/upgrade/v1-to-v2)。

## 验证方式与运行环境

测试把构建后的插件复制到独立临时消费工程，并将该工程的宿主依赖指向指定版本，防止旧版测试实际上解析到仓库中的新版宿主。使用带 TinyImg 标记的 PNG，显式进行本地 JPEG 转换，验证 JPEG 字节、扩展名、透明 PNG、JS/HTML 引用和 manifest。子进程禁止 HTTP 请求，不消费 TinyPNG 额度。

旧版宿主仅以开发别名依赖安装，用于测试；不成为插件的运行时依赖。现有 CI 的完整 Vitest 测试会自动包含兼容矩阵。

Vite 8 与 Rsbuild 2 要求 Node `^20.19.0 || >=22.12.0`。开发验证与 CI 使用符合此要求的 Node；CLI、核心库及旧宿主的 Node 支持声明不因开发依赖升级而整体提高。
