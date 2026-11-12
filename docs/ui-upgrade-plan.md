# 前端升级 + 功能升级开发计划（修订版）

参考设计稿：Stitch 项目 **SiYuan Translator Plugin**（project 3576564958010101641）
设计系统：Luminous Precision（primary `#0EA5E9` / secondary `#0284C7` / tertiary `#10B981`，Inter，8px 圆角，卡片 12px）

## 已确认的产品决定

1. **append 语义保持现状**：块内追加（`原文\n译文`），不改兄弟块，不改后端去重逻辑。
2. **窗口形态**：浮动置顶 —— 自绘浮动面板（可拖动、记住位置、置顶后不遮挡编辑操作、无遮罩）。
3. **主题**：跟随思源 `data-theme-mode` 自动切换暗/亮（令牌层双套色值，实时生效）。
4. **尺寸**：紧凑优先，默认 800×560 上限，窄屏自适应，不再用 940px 大屏布局。
5. **不做**：暂停/继续、流式增量写回、计费估算 ¥、打开思源文档/打开新建译文文档。

## 一、后端现状盘点（src/trans/*）

| 能力 | 现状 | 设计稿是否需要 |
| --- | --- | --- |
| 双引擎（qwen-mt / OpenAI 兼容 LLM） | ✅ translator.ts 两套客户端 | ✅ |
| 术语 / 翻译记忆 / 领域提示 | ✅ 仅 qwen-mt 生效 | ✅ |
| 并发 + 指数退避重试 | ✅ engine.runConcurrent + withRetry | ✅ |
| 三种写入模式 append/replace/new_doc | ✅ 块内追加（已确认为目标行为） | ✅ |
| 取消 | ✅ engine.cancel() | ✅ |
| 进度 (done/total) / 状态文案 | ✅ onProgress / onStatus | ✅ |
| 运行统计（块数/API/写入/耗时） | ✅ TranslationStats | ✅ |
| Token / 缓存统计（单次 + 跨会话累计） | ✅ llm_stats.ts | ✅ |
| 连通性测试 | ✅ testConnection()（缺延迟数值） | ✅ 需补 ms |
| 文档扫描预览（总块数/待处理块数/跳过明细） | ❌ 只在 run 过程中算出 | ✅ 必填 |
| 当前块 / 逐块流水日志 | ❌ 只有 done/total | ✅ 必填 |
| 网络代理模式（内核 / 系统代理） | ❌ 固定走 forwardProxy | ✅ |
| 重置默认配置 / 语言对·模型下拉清单 | ❌ | ✅ |

## 二、需新增的后端能力（范围已收缩）

1. **scan(docId)**：复用块收集逻辑做纯扫描 → `{ hpath, totalBlocks, translatable, skippedNonText, skippedAlready, sourceLangHint }`。
2. **逐块事件**：`onBlockStart(block, index, total)` + `onLog({ blockId, blockType, kind: 'ok'|'err'|'write'|'skip', tokens?, message, ts })`（tokens 仅 LLM 引擎可用）。
3. **proxy_mode** 新配置（`siyuan_kernel` | `system`）：system 模式前端 `fetch` 直连走系统代理，kernel 模式维持 forwardProxy。
4. **配置与常量**：`stream_write` 不引入；新增语言对清单、模型候选清单；`resetConfig()` 写回 DEFAULT_CONFIG。
5. 其余统计字段沿用现有 `TranslationStats`，不改结构（保证向后兼容旧 config.json）。

## 三、前端改造点

- **外壳**：自绘 FloatWindow（拖动 / 置顶 / Esc 关闭 / 几何记忆 / 无遮罩置顶态）+ 顶部品牌栏 + 页签（翻译工作台 / 插件设置）。
- **设计令牌**：`.tr2` 根类承载设计色板，`html[data-theme-mode="dark"]` 覆盖为暗色套，实时跟随思源主题切换。
- **图标**：内联 SVG 描边图标组件 `Icon.vue`（约 30 个），零新增依赖。
- **翻译工作台（紧凑单列）**：状态条 → 目标页签（当前文档 / 指定页面）→ 当前文档卡（标题/ID/块数指标/语言对/写入模式 chips）→ 主行动卡 → 右侧状态卡改为下方状态卡（就绪 / 进行中 / 完成）。
- **插件设置**：锚点导航 → 写入模式 3 张单选卡 → 并发/重试/退避三列 → 代理双卡 → 引擎分段 tab → 语言对下拉 → 术语/记忆增删行 → Prompt 字数与清空 → 用量看板 4 指标 → 底部（连通性检查含 ms / 重置默认 / 保存）。
- **交互细节**：Toast、内联校验、空态/加载态、按钮按压位移、进度条 shimmer。

## 四、开发步骤（每步人工验收通过 → 一次 commit）

- **S1 设计基座 + 浮动窗口外壳**（本次）
  令牌/字体/图标/窗口外壳（拖动、置顶、Esc、几何记忆、页签切换、暗色跟随）；两个页签先装载现有面板，功能不退化。
  验收：菜单打开窗口 → 拖动、置顶、关闭、切换页签、切换思源明暗主题即时生效。

- **S2 工作台：待翻译态 + 后端 scan**
  当前文档卡（真实总块数/待翻块数/跳过明细）、指定页面解析验证、主行动卡。
  验收：打开文档即显示真实块数；粘贴 ID 解析出路径与待翻块数。

- **S3 工作台：进行中 + 完成态 + 逐块事件**
  逐块日志、当前块、速率、取消；完成态 4 指标 + Token 条（无计费）+ 重新翻译。
  验收：翻译中日志滚动；完成后指标与文档实际改动一致。

- **S4 设置页：通用行为**
  写入模式单选卡、并发/重试/退避、代理模式、底部工具条（连通性检查含 ms / 重置默认 / 保存）。
  验收：切代理后连通性检查仍通过；重置默认生效。

- **S5 设置页：翻译引擎 + 用量看板**
  分段 tab、Qwen（Key/URL/模型/语言对/领域/术语/记忆）、LLM（Key/BaseURL/模型历史/Prompt 计数器）、4 指标 + 清零。
  验收：两套引擎互不串数据；术语保存后仍在；用量与翻译次数一致。

- **S6 打磨收尾**
  动效、空态/错误态、暗色细节、README/CHANGELOG、版本号。

## 五、工程注意

- `pnpm build` 在本机被 pnpm store 限制阻断，验证用 `node ./node_modules/vite/bin/vite.js build`；watch 同理。
- ESLint 仍不可用，不作为验收门槛。
- 不新增 npm 依赖。
- 旧 `src/index.scss` 在 S4/S5 迁移完成后清理；S1 起新样式集中在 `src/styles/design.scss`（`.tr2` 命名空间），避免与旧 `.trans-*` 冲突。
