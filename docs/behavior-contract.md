# TinyImg 功能行为与修复依据

本文依据现有 README、源码和历史提交整理预期行为，作为此次修复的验收依据。

## 已有意图及证据

| 领域 | 推导出的需求 | 依据 |
| --- | --- | --- |
| 压缩策略 | 保留 API_ONLY、RANDOM、API_FIRST、AUTO 四种策略。API_ONLY 不走 Web；API_FIRST 仅在认证/额度问题后回退 Web；AUTO 根据可用 key 选择策略。 | 根 README 的压缩策略说明；core/compressors/api.ts 的 AccountError 及调用方切换 key 的注释 |
| 多 key | 一次任务可提供多个 key，随机选择起始 key；遇到 401/429 后尝试其他可用 key。 | resolveProjectKeysFromEnv 支持逗号分隔；apiCompress 明确将 key 切换责任交给调用方 |
| key 来源 | CLI 可使用用户保存的 key；插件仅在 USE_USER_TINYIMG_KEYS=true 时允许使用用户 key。显式 CLI -k 优先于项目环境变量；用户 key 只在没有项目 key 时作为来源。 | CLI initKeyManager(useUserKeys: true)；三个插件的 useUserKeys 开关；README“没有项目级密钥时作为回退” |
| 环境变量 | Vite 应从实际 root/envDir 和 mode 对应的 env 文件加载 key；CLI 优先级为进程环境 > .env.local > .env。构建密钥使用无 VITE_ 前缀的名称。 | README 环境变量章节；Vite loadEnv 的行为；.env.local 的本地覆盖用途 |
| 转换 | 根据最新用户要求，CLI 和插件均默认关闭不透明 PNG 转换；CLI --convert、插件 convertPngToJpg 开启。保留文件名，只改变编码。独立 convert 命令默认保留文件名，--rename 才改扩展名。 | fbeeff4 自动转换提交；bb940b1 将 --noRename 改为 --rename；CLI 和插件参数默认值 |
| 已处理 | 已由 TinyImg 处理的源文件原样返回，不重复远程压缩；显式开启转换时只做本地转码，其他情况不覆盖原图；指定输出目录时仍复制。 | 159d923 将检测统一到核心并跳过标记和写入；d8c3fc2 修复已处理文件的输出目录 |
| 缓存 | 相同输入及处理配置可复用结果；noCache/--no-cache 关闭读写，但不强制重处理已标记文件。项目缓存优先，用户缓存作为读取回退；无 node_modules 时写用户缓存。 | README 缓存功能；7395ef1、777387d 禁用缓存的修复意图；compress-file.ts 的读写路径 |
| 清理 | 缓存清理仅删除缓存图片，保留 keys.json、其他文件和子目录。缓存不可写不影响成功的压缩结果。 | cache clear 的命令名称和用途；key 管理与缓存是不同功能 |
| 输出 | 缓存、日志大小、格式字段和文件输出应描述同一份最终字节；添加标记不能再次有损编码。 | CompressFileResult 的 buffer/compressedSize/outputExt；markProcessed 的“标记”用途 |
| 格式 | PNG、JPEG、WebP、AVIF 应贯通匹配、压缩、标记、缓存和写入；格式按真实文件内容判断。 | match.ts 和插件格式过滤；compressors/local.ts 已支持 AVIF；保留文件名的转换设计 |
| 插件失败 | 压缩失败记录错误并保留原始资源继续构建；意外程序错误仍可使构建失败。临时文件在所有退出路径清理。 | 三个插件原有 reporter.track 失败后 return 的实现；没有 strict 配置项 |
| 发布 | CLI 和插件的发布产物应可独立加载；Sharp 必须作为运行时依赖安装，不能只将 JS 内联而丢失原生依赖。 | package.json 对外入口；Sharp 的运行时加载机制 |

## 本次落实的规则

1. 核心压缩流程按“读取真实格式 → 已处理检测 → 配置缓存 → 可选转换/本地预压缩 → 远程压缩 → 无损标记 → 缓存”执行，返回最终字节。
2. 缓存身份包含源内容、策略、maxFileSize、转换开关和缓存版本；缓存文件使用输入格式作为索引，命中后从结果内容恢复输出格式。旧缓存不删除，新身份首次构建可能重新压缩。
3. 401/429 的 key 在当前任务内停用。API_ONLY 在所有 key 失败后返回失败；API_FIRST 在所有可用 key 耗尽后走 Web。网络、图片参数和服务错误不被当作 key 错误。
4. JPEG 使用 COM、PNG 使用 tEXt、WebP 使用扩展 RIFF chunk、AVIF 使用 UUID box 记录标记，均不重编码像素；仍识别早期版本写入的 EXIF 标记。
5. CLI 用显式默认命令路由代替插入 `--`，保留参数先后顺序和用户自己传入的选项终止符。
6. 插件临时文件使用独立 mkdtemp 目录，传递 noCache 并在 finally 中清理。
7. 未查询到的 key 额度显示 unknown，不再伪造“已用 0、剩余 500”。

## 验收边界

- 自动化测试使用模拟 HTTP 和临时目录，不发送真实图片、不使用真实 key。
- 构建后验证四个公开包的产物加载和 CLI 命令；源码测试不能替代发布产物验证。
- Vite 当前只处理 bundle 中独立输出的图片；public 目录直接复制文件、内联图片不属于当前插件实现范围。
- Webpack/Rsbuild 的环境文件加载依赖宿主配置，插件读取 process.env；本次没有新增跨构建工具的 env 加载框架。
- 没有新增 strict、强制重压缩、远程服务、发布或部署操作。

## 可选扩展名重命名（新增需求）

用户要求添加改扩展名，同时保留不改文件名的功能。三个构建插件提供 `renameConvertedFiles?: boolean`，默认 false。开启后，`.png` 名称下的 JPEG 输出改为同目录、同基本名、同 hash 的 `.jpg`；透明 PNG 不改名。此开关在构建层处理，不影响核心压缩配置或缓存身份。

重命名必须同时更新生成的资源 URL、chunk 资源元数据和 manifest；query/hash 后缀保留。Vite 将开关纳入 JS chunk hash；Webpack/Rsbuild 在资源生成后的 summarize 阶段处理，并保留 source map。目标资源已经存在时停止构建，禁止覆盖。压缩失败时保留原资源和原引用。已标记或缓存命中的 JPEG 也支持扩展名纠正。CLI 的文件命名规则维持不变。

## 默认关闭转换与原生日志（最新用户需求）

CLI `--convert` 和插件 `convertPngToJpg` 默认 false；`tinyimg convert` 是用户主动调用的独立转码命令，继续执行转换。已处理 PNG 在显式开启转换时仅本地转码并重新无损标记，避免建议开启后却被“已处理”短路。

日志默认使用“开始 + 一行汇总”，省略零值和内部 compressor 类名；缓存命中也计入最终体积收益，体积增大显示正百分比。CLI `--verbose`、插件 `verbose: true` 输出按文件名排序的明细。符合转换条件且未开启转换时追加一条 info 建议，使用入口各自的配置项，不把建议当成警告；透明 PNG、非 PNG 或已开启转换时不提示。缓存写失败仍是 warn，压缩失败是 error。

Vite 接入 resolvedConfig.logger；Webpack 接入 compiler.getInfrastructureLogger('tinyimg')；Rsbuild 接入 api.logger。插件不调用 console，也不注入额外空行、图标或 ANSI 转义；颜色、级别及时间戳由宿主决定。CLI 使用独立的 TinyImg 前缀。

## 宿主版本升级

开发依赖和示例更新到 Vite 8.3.2、Webpack 5.111.1、Rsbuild 2.2.11；保留已有 peer 下限，Vite 新增 7/8 支持。Vite 资源重命名在旧 Rollup 使用 emitFile，在 Rolldown 使用原生资源属性更新，兼容新旧宿主。实际构建矩阵和边界见 [host-compatibility.md](./host-compatibility.md)。
