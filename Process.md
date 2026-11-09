# Process — 阶段操作记录

> 多 Agent 协作规范：每次阶段操作后追加一条记录，包含日期、阶段、分支、变更、测试命令与结果、基线数据、遗留问题、下一步。
>
> 本文件位于新项目仓库 `/home/goserank/Projects/plugin-sample-vite-vue`，分支 `pigo`。

---

## 2026-11-06 规划阶段 — 现状分析 + 开发步骤文档

- 阶段：规划
- 工作目录：`/home/goserank/Projects/siyuan-plugin-picgo`（旧项目，只读参考）
- 目标开发目录：`/home/goserank/Projects/plugin-sample-vite-vue`，分支 `pigo`
- 变更：
  - 阅读旧项目 monorepo：`packages/picgo-plugin-bootstrap`、`packages/picgo-plugin-app`、`libs/zhi-siyuan-picgo`、`libs/Universal-PicGo-Core`、`libs/Universal-PicGo-Store`
  - 阅读脚手架项目：`src/index.ts`、`src/main.ts`、`src/api.ts`、`vite.config.ts`、`plugin.json`
  - 通过思源内核 API 验证示例文档、题头图、资源表、SQL 计数
  - 输出 `开发步骤.md`（Phase 0 ~ Phase 8）
- 关键调研结论：
  - 题头图存放在文档属性 `title-img`，同时在 `assets` 表中 `title='title-img'` 有记录；`attributes` 表查不到 `title-img`。
  - 示例文档 `20261106145728-e3r9zm3` 基线：3 张正文图（1 S3 / 1 本地 / 1 网络查询串）+ 1 张题头图（本地），共 4 个引用。
  - 工作空间基线：文档约 970；含 `![` 的 block 约 4730；`assets` 约 1179；`assets.title='title-img'` 约 100；`data/assets` 文件约 1676。
  - `/api/file/getFile` 和 `/assets/...` 都能读取本地资源。
  - `/api/network/forwardProxy` 可以成功下载无扩展名/查询串网络图片（gstatic），返回 base64。
  - 旧配置当前使用 `tcyun`（腾讯云 COS）上传器；S3 兼容端点可映射为 `endpoint=https://cos.ap-guangzhou.myqcloud.com`、`region=ap-guangzhou`、`bucket=picgo-1312673255`、`customUrl=https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com`、`uploadPath=siyuan/`。
  - 已确认“GIT 图像”是 `.gif` 的笔误，实际需求为 GIF 动图支持；按原始字节上传，保持动画与 `image/gif`。
- 测试命令与结果：
  - `curl /api/system/version` -> `3.8.9` ✅
  - SQL 基线查询 ✅
  - `/api/attr/getBlockAttrs` 读取示例文档 `title-img` / `custom-picgo-file-map-key` ✅
  - `/api/file/getFile` 读取题头图 webp（554294 bytes）✅
  - `/api/network/forwardProxy` 下载 gstatic 图片（12680 bytes JPEG）✅
- 下一步：Phase 0 — 创建 `pigo` 分支，更新插件元信息，建立空壳插件与测试基线。

---

## 2026-11-06 Phase 0 — 基线与仓库准备

- 阶段：Phase 0
- 分支：`pigo`
- 变更：
  - 在 `/home/goserank/Projects/plugin-sample-vite-vue` 创建并切换到 `pigo` 分支。
  - 更新 `plugin.json`：插件名 `siyuan-plugin-pigo`，显示名 `Pigo 图床`，版本 `0.1.0`，移除 `disabledInPublish`。
  - 更新 `package.json`：包名/版本/作者/描述；增加 `test` 脚本。
  - 重写 `src/index.ts`：`PigoPlugin` 入口、顶栏图标、命令 `打开 Pigo 图床`。
  - 重写 `src/main.ts`：Vue 应用挂载/卸载、面板显示切换；修复脚手架 `this.name` 的上下文问题。
  - 重写 `src/App.vue`：Phase 0 占位面板。
  - 更新 `src/i18n/zh_CN.json`、`src/i18n/en_US.json`。
  - 复制 `icon.png`、`preview.png`。
  - 复制 `开发步骤.md` 到新仓库。
  - 新增 `tests/smoke.test.mjs`（Node 内置测试运行器）。
  - 新增 `src/types/vue-shim.d.ts`，让 `tsc --noEmit` 能识别 `*.vue`。
  - 重写 `README.md`、`README.zh-CN.md` 为 Pigo 项目说明。
- 环境问题：
  - 本机 `pnpm --version` 长时间无响应（pnpm 独立二进制启动挂起），因此 Phase 0 暂用 Node 内置测试运行器 `node --test`，未安装 Vitest。
  - 构建使用脚手架已有的 `node_modules/.bin/vite`，不依赖 pnpm。
  - Vitest 计划在 Phase 2 前恢复 pnpm 后引入；若 pnpm 仍不可用，则继续使用 Node 测试运行器。
- 测试命令与结果：
  - `node --test tests/*.test.mjs` —— ✅ 3 passed / 0 failed
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 65.31 kB；`package.zip` 已生成
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `unzip -l package.zip` —— ✅ 12 个文件，`plugin.json` 名称为 `siyuan-plugin-pigo`
  - `grep plugin-sample-vite-vue dist/index.js` —— ✅ 0 次（无旧脚手架名残留）
- 构建产物：
  - `dist/`：`index.js`、`index.css`、`plugin.json`、`i18n/*`、`icon.png`、`preview.png`、`README*.md`
  - `package.zip`：可直接安装的打包产物
- 手动验证（需用户完成，Agent 不代替操作）：
  - 将构建产物放到思源工作空间插件目录，或在本地运行 `pnpm dev` 后刷新思源。
  - 在 `思源 -> 设置 -> 插件` 中启用 `Pigo 图床`。
  - 点击顶栏 Pigo 图标，确认占位面板出现。
  - 禁用插件，确认面板/图标无残留、控制台无报错。
- 下一步：Phase 1 — 原生自定义页签、配置模型与设置页。

---

## 2026-11-06 Phase 1 — 原生自定义页签、配置模型与设置页

- 阶段：Phase 1
- 分支：`pigo`
- 变更：
  - `src/index.ts`：改为 `addTab` + `openTab`，顶栏/命令打开思源原生自定义页签；移除全局浮动面板。
  - `src/main.ts`：按页签元素挂载/卸载 Vue 实例，支持多页签实例与统一卸载。
  - `src/App.vue`：渲染 `PigoPanel`。
  - `src/components/PigoPanel.vue`：上传/统计/同步/设置四个子页；设置页可用，其余占位。
  - `src/components/settings/SettingsTab.vue`：S3 配置 + 行为配置 + 保存/恢复默认/导入旧配置；“测试连接”暂为 Phase 3 占位。
  - `src/core/config.ts`：配置类型、默认值、合并、规范化、校验、旧路径模板转换。
  - `src/core/configStore.ts`：`plugin.loadData/saveData`、单例配置状态、旧 PicGo `tcyun`/`awss3` 配置导入。
  - `src/i18n/*`：增加 `pigoTabTitle`。
  - `src/index.scss`：页签宿主高度。
  - `tests/config.test.mjs`：配置合并/规范化/校验/旧路径模板测试。
  - `开发步骤.md`：补充 pnpm 不可用时的测试运行器过渡说明。
- 关键实现：
  - 自定义页签 id：`${plugin.name}pigo`，符合思源 `plugin.name + tab.type` 约定。
  - 配置存储：`plugin.saveData("config", ...)` -> `data/storage/petal/siyuan-plugin-pigo/`，随工作空间同步。
  - 旧配置导入：读取 `data/storage/syp/picgo/picgo.cfg.json`，优先当前 uploader 的 `tcyun`/`awss3`，映射到新 S3 配置；tcyun 的 `path` 前缀转换为 `{year}/{month}/{md5}.{ext}` 模板。
  - 校验：必填、URL、bucket 字符、上传路径模板变量、ACL、并发 1-10、超时 5000-300000。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 11 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 92.59 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间：`node_modules/.bin/vite build --watch`，或把 `dist/` 复制到 `data/plugins/siyuan-plugin-pigo`。
  2. 在思源中禁用再启用 `Pigo 图床`（或重启思源）。
  3. 点击顶栏 Pigo 图标：应打开思源原生页签（不是浮动 iframe）。
  4. 设置页填写 S3 配置 -> 点“保存配置” -> 关闭页签再打开，确认字段仍在。
  5. 检查 `data/storage/petal/siyuan-plugin-pigo/` 下配置文件。
  6. 点“导入旧 PicGo 配置”，确认能读取旧 `tcyun`/`awss3` 字段；检查后保存。
  7. 故意清空 bucket 或并发数填 99，确认保存被阻止并显示错误。
  8. 切换上传/统计/同步页签，确认占位页显示正常；控制台无报错。
- 已知问题：
  - “测试连接”按钮暂为 Phase 3 占位。
  - 旧配置读取依赖 `getFile`（`fetchSyncPost`）；如运行时权限异常，Phase 3 改用内核文件读取封装。
  - `plugin.json` 的 `url` 仍为空，发布前补。
- 下一步：Phase 2 — 内核 API、当前文档识别、图片扫描与解析器。

---

## 2026-11-06 Phase 1 修订 — 原生页签改为非模态浮动弹窗

- 原因：用户主要使用“上传”功能，原生页签需要在笔记和插件页签之间来回切换，影响阅读与操作。
- 变更：
  - 移除 `addTab` / `openTab` 自定义页签实现。
  - 新增 `src/core/uiStore.ts`：弹窗可见性、当前子页状态。
  - 新增 `src/components/PigoPopup.vue`：非模态浮动弹窗，可拖动、可关闭、Esc 关闭、位置 localStorage 记忆；点击笔记不关闭，不阻塞编辑。
  - `src/components/PigoPanel.vue`：改为弹窗内容与子页布局，子页状态来自 `uiStore`；新增 header actions 插槽放拖动/关闭按钮。
  - `src/main.ts`：改为单例 `initPopup` / `destroyPopup`，常驻 Vue 实例，关闭只隐藏不销毁。
  - `src/index.ts`：顶栏切换弹窗、命令打开弹窗、`openSetting()` 打开设置子页。
  - `src/index.scss`：改为弹窗容器样式。
  - `开发步骤.md`：同步更新为“非模态浮动弹窗”方案。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 11 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 95.25 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间并禁用/启用插件（或重启思源）。
  2. 点击顶栏 Pigo 图标：出现非模态浮动弹窗，不打开新页签。
  3. 弹窗打开时点击/编辑笔记：弹窗保持显示，笔记可正常操作。
  4. 拖动弹窗 header 右侧的 `⠿`：弹窗移动；关闭后重新打开，位置恢复。
  5. 按 Esc 或点 `×`：弹窗关闭；再次打开时设置表单状态保留。
  6. 从思源插件设置进入 Pigo：弹窗打开并定位到“设置”子页。
- 下一步：Phase 2 — 内核 API、当前文档识别、图片扫描与解析器。

---

## 2026-11-06 Phase 2 — 内核访问、当前文档与图片扫描

- 阶段：Phase 2
- 分支：`pigo`
- 变更：
  - 新增 `src/core/activeDoc.ts`：`getActiveDocId()` 使用 `getAllEditor()` + DOM 兜底；`subscribeActiveDoc()` 监听 `switch-protyle` / `loaded-protyle-static`。
  - 新增 `src/core/scan/types.ts`：图片引用、文档元数据、扫描结果、统计类型。
  - 新增 `src/core/scan/s3Key.ts`：把 customUrl / extraUrlPrefixes / 虚拟主机 / Path Style / COS / AWS URL 反推为 S3 key。
  - 新增 `src/core/scan/parser.ts`：Markdown 图片、HTML `<img>`、data URI、题头图、查询串 URL、括号 URL 解析；`blocks.ial` 属性解析。
  - 新增 `src/core/scan/scanner.ts`：`scanDoc()` / `scanAll()`；用 SQL 一次取回文档、题头图和图片块；去重、分类、统计。
  - 新增 `src/components/upload/UploadTab.vue`：当前文档图片列表、缩略图、来源徽标、统计条、刷新、复制链接；上传按钮留待 Phase 4。
  - `src/components/PigoPanel.vue`：上传 tab 接入真实列表。
  - 新增 `tests/parser.test.mjs`：Markdown/HTML/题头图/IAL/S3 key/分类测试。
  - 关键优化：题头图直接从 `blocks.ial` 的 `title-img` 解析，避免逐文档 `getBlockAttrs`。
- 真实思源内核验证（示例文档 `20261106145728-e3r9zm3`）：
  - 唯一引用 4：本地 2（含题头图 1）、S3 1、网络 1。
  - 列表：`cover_062...webp`（本地/题头图）、`siyuan/austin...jpg`（S3）、`google-deepmind...jpg`（本地）、gstatic 查询串 URL（网络）。
- 全库真实数据验证（Node + 思源 HTTP SQL）：
  - 文档 970；含 `title-img` 的文档 289；含图片的 block 4730。
  - 总引用 5388；唯一引用 4433；本地 1681；S3 2071；网络 681；题头图 280。
  - SQL + 解析耗时约 269ms（不含 UI 渲染）。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 19 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 108.61 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间并禁用/启用插件（或重启思源）。
  2. 打开示例文档 `图片测试`，点击顶栏 Pigo 图标 -> “上传”子页。
  3. 应看到 4 个唯一图片：本地 2（含题头图）、S3 1、网络 1。
  4. 检查 gstatic 查询串 URL 被识别为“网络”，不是漏掉。
  5. 切换另一篇有图片的文档，列表应自动刷新；不要出现上一篇的图片。
  6. 打开无图片文档，应显示“本文档没有识别到图片”。
  7. 打开弹窗时点击笔记、编辑笔记，弹窗保持且列表不闪烁。
  8. 点击“刷新”按钮，列表重新扫描。
- 已知问题：
  - 上传按钮仍是 Phase 4 占位。
  - 本地图片缩略图使用 `/assets/...` 直链；私有/特殊资源如加载失败，Phase 4 再补 Blob 读取。
  - `scanAll` 尚未接入 UI（Phase 6）。
- 下一步：Phase 3 — S3 客户端与配置有效性校验（测试连接）。

---

## 2026-11-06 Phase 3 — S3 客户端与配置有效性校验

- 阶段：Phase 3
- 分支：`pigo`
- 变更：
  - Vendor 第三方库（因本机 pnpm 启动挂起，未走 npm 安装）：
    - `src/core/s3/vendor/aws4fetch.ts`（MIT，Michael Hart）
    - `src/core/s3/vendor/LICENSE.aws4fetch`
    - `src/core/upload/vendor/md5.ts`（MIT，js-md5）
    - `src/core/upload/vendor/LICENSE.js-md5`
  - 新增 `src/core/s3/url.ts`：虚拟主机/Path Style 对象 URL、key 编码、公网 URL。
  - 新增 `src/core/s3/xml.ts`：`ListObjectsV2` 解析、`DeleteObjects` XML、XML 实体解码。
  - 新增 `src/core/s3/client-core.ts`：SigV4 签名、List/Head/Get/Put/Delete、分页、错误处理；可注入 requester 便于测试。
  - 新增 `src/core/s3/transport.ts`：直连 / 思源 `forwardProxy`（base64 payload/response）。
  - 新增 `src/core/s3/client.ts`：`createS3Client()`、`testS3Connection()`（List + Put + Head + 公网 URL + Delete + 清理）。
  - 新增 `src/core/upload/keyTemplate.ts`：`{year}/{month}/{md5}/{ext}/{fullName}` 等变量、静态前缀、key sanitize。
  - `SettingsTab.vue`：启用“测试连接”按钮，展示分步结果、耗时、警告和错误。
  - 新增 `tests/s3.test.mjs`：key 模板、URL、XML、签名请求、404/403 处理。
- 真实 S3 只读验证（腾讯云 COS S3 兼容端点）：
  - 直连 `ListObjectsV2(prefix=siyuan/, maxKeys=1)` ✅
  - 直连 `HeadObject(siyuan/austin-schmid-...jpg)` ✅（image/jpeg，2827153 bytes）
  - 思源 `forwardProxy` + `ListObjectsV2` ✅
  - 思源 `forwardProxy` + `HeadObject` ✅
  - 未写入/删除真实对象，避免污染桶；写/删测试请通过设置页“测试连接”执行。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 28 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 135.51 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间并禁用/启用插件（或重启思源）。
  2. 打开 Pigo 弹窗 -> 设置，填写/导入 S3 配置。
  3. 点击“测试连接”：
     - 读取存储桶 ✅
     - 写入测试对象 ✅
     - 读取测试对象 ✅
     - 公网 URL 访问 ✅（私有桶可能显示警告）
     - 删除测试对象 ✅
  4. 到 S3 控制台确认 `siyuan/_pigo_test/` 下无残留测试对象（或只保留历史）。
  5. 改错 SecretAccessKey 再测试：应显示 403/签名错误。
  6. 改错 bucket 再测试：应显示 404/NoSuchBucket。
  7. 关闭“通过思源内核代理访问 S3”再测试：直连成功或给出明确 CORS 提示。
- 已知问题：
  - 测试连接会写入一个极小的 `_pigo_test/*.txt` 并尝试删除；如删除失败会提示手动清理。
  - HEAD 经思源代理时可能拿不到 `content-length`，因此步骤中大小可能显示“未知”。
  - `aws4fetch`/`js-md5` 当前为 vendor 形式；pnpm 恢复后可切回依赖。
- 下一步：Phase 4 — 单图/批量上传、并发、链接替换、题头图。

---

## 2026-11-06 Phase 4 — 单图/批量上传、并发、链接替换、题头图

- 阶段：Phase 4
- 分支：`pigo`
- 变更：
  - 新增 `src/core/upload/mime.ts`：扩展名/Magic Bytes 识别 PNG/JPEG/GIF/WebP/SVG/BMP/TIFF/ICO/AVIF/HEIC。
  - 新增 `src/core/upload/source.ts`：本地 `assets`（内核文件 API + `/assets` 兜底）、远程 URL（直连 + 思源代理兜底）、data URI、S3 对象读取；50MB 限制；非图片拒绝。
  - 新增 `src/core/upload/fileMap.ts`：兼容旧 `custom-picgo-file-map-key`，MD5 文件名哈希、冲突回退 `md5(originUrl)`、按 originUrl 查找复用。
  - 新增 `src/core/upload/keyTemplate.ts`：完整 key 模板（md5/sha256/ext/fullName 等）。
  - 新增 `src/core/upload/concurrency.ts`：可取消并发池。
  - 新增 `src/core/upload/uploader.ts`：上传/复用/跳过/失败隔离、fileMap 复用、进度统计。
  - 新增 `src/core/upload/replacer.ts`：先写 fileMap，再按块批量替换 Markdown/HTML 图片 URL，最后替换题头图 `title-img`；同一资源跨文档时给每个文档写 fileMap。
  - 新增 `src/core/upload/pipeline.ts`：`uploadCurrentDoc`、`uploadAllNotes`、`uploadSingleRef`，统一进度。
  - `src/core/scan/parser.ts`：新增图片 URL 位置与安全替换函数（只替换图片目标，不误伤正文）。
  - `UploadTab.vue`：启用单图上传、上传本文档未上传、强制重新上传、修复未替换链接、上传全部笔记、停止、进度条、结果/失败列表。
  - 新增 `tests/upload.test.mjs`：URL 替换、HTML src、题头图、MIME、并发池/取消。
- 真实 S3 写入验证（不修改笔记）：
  - 用 1x1 PNG 上传到 `siyuan/_pigo_test/2026/11/8c8fc3bcf3ab8ebc3bbf8a549a3aac54.png` ✅
  - `HEAD` 返回 `image/png`，68 bytes ✅
  - `DELETE` 后 `HEAD` 返回 `exists: false` ✅
  - 测试对象已清理。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 36 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 157.71 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间并禁用/启用插件（或重启思源）。
  2. **先复制一份示例文档** `图片测试`，在副本上测试，避免破坏原文档。
  3. 打开副本，点击“上传未上传图片”：
     - 预期上传 3 张：本地 google、网络 gstatic、题头图 cover
     - 已上传的 austin 应跳过
     - 文档 Markdown 和 `title-img` 应替换为 S3 URL
     - `custom-picgo-file-map-key` 应增加/更新条目
  4. 再点一次“上传未上传图片”：
     - 预期 0 上传，复用/跳过 4 张，不再产生新对象
  5. 点“强制重新上传”：
     - 4 张全部重新上传，生成新 key；旧对象成为 S3 孤儿（Phase 7 清理）
  6. 点“修复未替换链接”：
     - 对 fileMap 有记录但文档仍是本地链接的图片执行替换
  7. 单图上传：对一张本地图、一张网络图分别点“上传”/“上传到 S3”
  8. GIF：上传含 GIF 的图片，确认 S3 Content-Type 为 `image/gif`，笔记中动画正常
  9. data URI：新建 data URI 图片块并上传
  10. 上传全部笔记：先在小范围/副本测试，确认进度、停止、失败列表
  11. 失败隔离：断网或填错 S3 后上传，确认失败项可读、文档不被破坏
- 已知问题：
  - 强制重传会产生新的 S3 对象，旧的变成孤儿；Phase 7 提供同步清理。
  - 上传后不删除本地 `assets` 文件（本次范围不处理）。
  - 本地图片读取优先 `/api/file/getFile`，失败回退 `/assets/...`；如遇权限问题请反馈。
  - 全局上传可能耗时较长，建议先在小范围验证。
  - 实际笔记替换尚未由 Agent 自动执行（避免改动用户数据）；需按上述手动步骤验证。
- 下一步：Phase 5 — 粘贴自动上传、右键菜单、顶栏/状态栏。

---

## 2026-11-09 Phase 5 — 粘贴自动上传、右键菜单、状态栏

- 阶段：Phase 5
- 分支：`pigo`
- 变更：
  - 新增 `src/core/paste/PasteEventAdapter.ts`：同步决策、preventDefault、resolve 空载荷；支持多文件；保留 `preventedBy` 排错信息。
  - 新增 `src/core/paste/PasteUploadTransaction.ts`：并发上传粘贴文件、生成 Markdown、插入光标位置、写 fileMap、部分失败提示。
  - 新增 `src/core/statusBar.ts`：状态栏初始化/更新/销毁。
  - `src/index.ts`：
    - `onLayoutReady` 注册 `paste` / `open-menu-image` 事件。
    - 粘贴图片自动上传，支持多图。
    - 右键图片菜单“上传至 Pigo 图床 / 上传网络图片 / 重新上传”。
    - 状态栏与思源通知更新。
  - `src/components/upload/UploadTab.vue`：上传过程同步更新状态栏。
  - `SettingsTab.vue`：图文混合接管增加“文字可能丢失”的警告提示。
  - `src/index.scss`：状态栏、菜单图标样式。
  - `src/i18n/*`：增加 `uploadToBed` 文案。
  - 新增 `tests/paste.test.mjs`：单图/多图接管、关闭自动上传、图文混合、无文件、无文档、无法阻断默认行为。
- 功能说明：
  - 粘贴单图/多图：Pigo 接管默认粘贴，并发上传 S3，插入 `![](url)`，写 fileMap。
  - 右键本地图片：上传并替换链接。
  - 右键网络图片：先确认，再下载上传并替换。
  - 右键已 S3 图片：先确认，再重新上传。
  - GIF：按原始字节上传，保持 `image/gif`。
  - 状态栏显示“正在上传/上传完成/上传失败”等短状态。
  - 思源通知提示成功/失败。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 44 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 166.71 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间并禁用/启用插件（或重启思源）。
  2. **建议先禁用旧 PicGo 插件**，避免 paste/右键菜单双重处理。
  3. 复制一张图片 -> 在文档中 Ctrl+V：
     - 状态栏显示上传中
     - 图片上传 S3
     - 插入 `![](s3url)`
     - 通知“已上传 1 张图片并插入文档”
  4. 复制 3 张图片 -> 粘贴：
     - 3 张并发上传
     - 插入多行 Markdown
  5. 复制“文字+图片” -> 粘贴：
     - 设置中“允许图片和文字混合粘贴时接管”关闭时：走思源默认行为
     - 开启时：Pigo 接管；注意当前只保留图片，文字可能丢失
  6. 右键本地图片 -> 插件 -> 上传至 Pigo 图床：
     - 上传并替换链接
  7. 右键网络图片：
     - 弹确认框；确认后下载上传并替换
  8. 右键已 S3 图片：
     - 弹确认框；确认后重新上传
  9. GIF 粘贴/右键上传：
     - S3 Content-Type 为 `image/gif`
     - 笔记中动画正常
  10. 重启思源后重复上述操作，确认事件仍注册。
- 已知问题：
  - 图文混合接管当前只插入图片，文字可能丢失；设置页已提示，默认关闭。
  - 右键菜单只覆盖正文图片；题头图请用上传页。
  - 若 SiYuan 将某些图片渲染为 blob URL，右键菜单可能无法与 Markdown 中的原 URL 对应；常见本地资产/网络图片不受影响。
  - 旧 PicGo 插件同时启用时会重复接管/重复菜单，建议禁用旧插件。
- 下一步：Phase 6 — 全库统计与全库上传 UI。

---

## 2026-11-09 Phase 6 — 全库统计与全库上传 UI

- 阶段：Phase 6
- 分支：`pigo`
- 变更：
  - 新增 `src/core/stats/aggregate.ts`：`dedupeRefs`、`computeRefStats`、`isUploadedButNotReplaced`、`countUploadedButNotReplaced`，纯函数可单测。
  - 新增 `src/core/stats/siyuanData.ts`：一次 SQL 读取所有带 `custom-picgo-file-map-key` 的文档 IAL；统计 `assets` 与 `title-img` 资源数量。
  - 新增 `src/core/stats/service.ts`：`buildStatsSnapshot(scope, config)`，扫描后附加 fileMap 未替换数与 assets 数量。
  - 新增 `src/core/stats/export.ts`：JSON/CSV 导出，CSV 处理逗号、引号、换行。
  - 新增 `src/components/stats/StatsTab.vue`：
    - 当前文档 / 全库切换；
    - 开始统计、取消、修复未替换链接、上传未上传图片；
    - 进度条、扫描耗时、扫描时间、文档数、资源文件数；
    - 卡片：总引用、唯一图片、本地、S3、网络、Data URI、题头图、已上传未替换、含图文档、资源文件；
    - 按来源/题头图/已上传未替换筛选；
    - 搜索文档、地址、描述；
    - 列表分页显示（默认 300 条，可加载更多）；
    - 复制链接、导出 JSON/CSV。
  - `PigoPanel.vue` 接入 `StatsTab`。
  - `scan/types.ts` 的 `ScanStats` 增加 `uploadedButNotReplaced`、`assetFiles`、`titleAssets`。
  - 拆分 `fileMapPure.ts`（纯函数）与 `fileMap.ts`（读写思源），便于 Node 单测；原导入路径保持兼容。
  - 新增 `tests/stats.test.mjs`：去重、来源统计、fileMap 未替换判定、CSV 转义、JSON 导出。
- 真实数据验证（只读，不改笔记）：
  - 示例文档 `20261106145728-e3r9zm3`（图片测试）：
    - `totalRefs=4`、`uniqueRefs=4`
    - 本地 2（含题头图 1）、S3 1、网络 1、Data 0
    - `assetFiles=1179`、`titleAssets=100`
    - 扫描耗时 139 ms（含 fileMap/assets 统计）
  - 全库：
    - 文档 971 篇，含图 663 篇
    - 总引用 5393、唯一图片 4437
    - 本地 1681、S3 2075、网络 681、Data 0
    - 题头图 281
    - 已上传未替换 53
    - `assetFiles=1179`、`titleAssets=100`
    - 加载 fileMap 文档 395 篇
    - 总耗时 370 ms
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 50 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 183.40 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间并禁用/启用插件（或重启思源）。
  2. 打开 Pigo -> 统计：
     - 默认自动统计当前文档；
     - 示例文档应显示：总引用 4、本地 2、S3 1、网络 1、题头图 1。
  3. 点击“全库”->“开始统计”：
     - 进度条按文档推进；
     - 预期文档约 971 篇、唯一图片约 4437；
     - 期间可以点击“取消”，旧结果保留。
  4. 筛选与搜索：
     - 点击“本地 / S3 / 网络 / Data / 题头图 / 已上传未替换”；
     - 搜索文档标题或 URL；
     - 列表超过 300 条时点击“加载更多”。
  5. 导出 JSON/CSV：
     - 浏览器下载文件；
     - 打开确认字段 `docId, docTitle, blockId, kind, sourceType, url, s3Key, status`。
  6. “已上传未替换”：
     - 若数量 > 0，页面顶部出现提示；
     - 点击“修复未替换链接”，按 fileMap 记录替换，不重新上传对象；
     - 完成后自动重新统计，数量应下降。
  7. “上传未上传图片”：
     - 当前文档：上传本文档本地/网络图片并替换链接；
     - 全库：扫描全部并上传，耗时较长，完成后自动重新统计；
     - 上传过程中可取消，已完成部分保留。
  8. 多端/重启：
     - 切到别的文档再切回，统计页应跟随当前文档；
     - 关闭再打开弹窗，全库结果仍保留在内存中。
- 已知问题：
  - 全库统计结果只保存在内存，重启思源后需要重新扫描。
  - 列表默认只渲染 300 条，避免一次渲染数千条卡顿；导出包含全部引用。
  - “已上传未替换”依赖 `custom-picgo-file-map-key`，没有 fileMap 的旧笔记无法判断。
  - 全库上传/修复仍属于长任务，建议先在小范围验证。
- 下一步：Phase 7 — S3 双向同步与清理。

---

## 2026-11-09 Phase 6 修复 — 统计页全库扫描后空白

- 现象：点击「全库」→「开始统计」后统计页空白，重新打开插件仍空白。
- 原因：
  - `StatsTab.vue` 模板中直接调用了从 `aggregate.ts` 导入的 `isUploadedButNotReplaced(ref)`，
  - 但该函数签名是 `(ref, fileMaps)`，模板只传了 `ref`，`fileMaps.get()` 触发 `TypeError`，
  - Vue 渲染中断，整个面板变成空白。
- 修复：
  - 模板改为调用组件内的 `isPending(ref)`，由它传入 `snapshot.fileMaps`。
  - 导入别名改为 `hasUploadRecord`，避免模板/脚本同名误用。
  - `isUploadedButNotReplaced` 增加 `!fileMaps` 防御，缺少 fileMaps 时返回 `false`。
  - `PigoPanel.vue` 增加 `onErrorCaptured` 错误条：子页渲染异常时显示错误信息，不再整页空白。
  - 新增回归测试：缺少 fileMaps 时不抛错。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 51 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功
