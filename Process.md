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

---

## 2026-11-09 Phase 7 — S3 双向同步与安全清理

- 阶段：Phase 7
- 分支：`pigo`
- 变更：
  - 新增 `src/core/sync/report.ts`：纯函数双向对比，分类 `matched / onlyS3 / onlySiyuan / notUploaded / outsidePrefix / testObjects / folderMarkers`。
  - 新增 `src/core/sync/service.ts`：扫描全部笔记 + 列出整个存储桶 + 生成报告；删除封装。
  - 新增 `src/core/sync/export.ts`：JSON/CSV 报告导出。
  - 新增 `src/components/sync/SyncTab.vue`：
    - 扫描并对比、取消、重新扫描；
    - 卡片与列表：双向匹配、仅 S3、仅思源（失效）、未上传、前缀外；
    - 搜索、分页、复制 key/链接；
    - “清除 S3 多余图片”：第一次确认展示数量和前 20 个 key，第二次要求输入 `DELETE`；
    - 删除进度、成功/失败数，完成后自动重新扫描；
    - JSON/CSV 导出。
  - `src/core/s3/client-core.ts`：
    - 新增 `deleteObjectsBatched`，使用 S3 `POST ?delete` 批量删除，默认 1000 个/批；
    - `Content-MD5` 由本地 md5 计算，支持分批进度与取消。
  - `src/core/s3/xml.ts`：新增 `parseDeleteObjectsErrors`。
  - `src/core/s3/url.ts`：支持裸子资源参数 `?delete`，同时避免空 `prefix` 参数。
  - `src/core/scan/s3Key.ts`：URL 前缀缓存，避免大量 URL 重复解析 endpoint。
  - `PigoPanel.vue` 接入 `SyncTab`。
  - 新增 `tests/sync.test.mjs`：分类、匹配/失效、前缀保护、测试对象保护、批量删除签名与分批、失败停止。
- 安全策略（重要）：
  - 同步始终扫描**全部笔记**，不能只用当前文档，否则会把其它文档引用中的对象误判为孤儿。
  - 只有同时满足以下条件的对象才会进入清理列表：
    - 没有图片引用；
    - 不在 `_pigo_test/`；
    - 在上传前缀内；
    - 不是文件夹占位；
    - 没有被 fileMap / 原始链接 / 本地资源文件名保护。
  - 额外保护证据：
    - 笔记正文/IAL 中出现的 S3 URL（包括非图片语法链接）；
    - 本地 `assets/...` 文件名与 S3 对象文件名一致（兼容旧 PicGo 上传后未替换链接的笔记）；
    - fileMap 中记录的上传地址。
  - 前缀为空时页面显示强警告，清理范围覆盖整个桶。
  - 删除失败立即停止，不继续下一批。
- 真实桶只读/安全验证：
  - 全库扫描 971 篇文档，S3 对象 3922 个，耗时约 3.0 秒。
  - 报告：双向匹配 2891、仅 S3 存在 1030、仅思源失效 1、未上传 2309、前缀外 0、忽略 2（1 个 folder marker + 测试对象）。
  - 保护规则生效：旧笔记中仍以 `assets/...` 引用、但 S3 已有同名对象的图片被计入匹配，不会进入清理。
  - 安全删除测试：
    - 上传 `siyuan/_pigo_test/pigo-sync-*.png` 与 `siyuan/pigo-sync-verify-*.png`；
    - 报告将 `_pigo_test/` 对象归入 testObjects，未进入清理候选；
    - 普通孤儿对象进入 `onlyS3` 与 `cleanupCandidates`；
    - 使用 `deleteObjectsBatched` 分 2 批删除，结果 `deleted=2, failed=0`；
    - HEAD 确认两个对象均为 `exists:false`。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 58 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 203.95 kB；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 重新构建到工作空间并禁用/启用插件（或重启思源）。
  2. 打开 Pigo -> 同步 -> 扫描并对比：
     - 显示匹配/仅 S3/仅思源/未上传数量；
     - 扫描过程中显示进度。
  3. 检查“仅 S3 存在”列表：
     - key、大小、时间、URL 是否正确；
     - 用“复制链接”抽查对象是否能打开。
  4. 检查“仅思源（失效）”：
     - 是否有确实被删除的 S3 对象；
     - 不会进入清理候选。
  5. 导出 JSON/CSV，确认分类与字段。
  6. 制造测试对象（可选）：
     - 上传 `siyuan/_pigo_test/xxx.png` 和 `siyuan/xxx-orphan.png`；
     - 重新扫描确认：`_pigo_test` 不进入候选，`xxx-orphan.png` 进入候选；
     - 清理后确认对象已删除。
  7. 清理前的双重确认：
     - 第一次展示数量 + 前 20 个 key；
     - 第二次必须输入 `DELETE`；
     - 输入错误或取消时不删除任何对象。
  8. 清理后自动重新扫描，仅 S3 数量应下降，匹配数不应减少。
- 已知问题/风险：
  - 旧笔记中以 `assets/...` 引用但 S3 对象文件名不同（例如内容 MD5 命名）时，无法自动保护；建议清理前先导出报告并抽查。
  - 清理只基于当前工作空间；如果还有其它工作空间共用同一个桶，请勿使用清理功能。
  - 前缀为空时清理整个桶，风险极高，不建议。
  - 删除不可恢复，建议先手动备份或开启桶版本控制。
- 下一步：Phase 8 — 稳定性、兼容、性能与发布。

---

## 2026-11-09 Phase 8 — 稳定性、兼容、性能与发布收尾

- 阶段：Phase 8
- 分支：`pigo`
- 变更：
  - 新增 `src/core/errors.ts`：
    - `PigoError`（code/message/detail）；
    - `toPigoError` / `toUserMessage`：统一映射网络、超时、S3 鉴权、404、400、5xx、配置文件等错误；
    - `toErrorDetail` 用于日志。
  - 新增 `src/core/log.ts`：
    - 最近 200 条内存日志；
    - `debug` 开关控制控制台输出；
    - 自动脱敏 secretAccessKey/accessKeyId/secretId/secretKey/authorization；
    - `formatLogs` / `clearLogs`。
  - `src/core/configStore.ts`：
    - 加载/保存配置时同步 debug 开关；
    - 新增 `getConfigIssues`、`isConfigReady`、`ensureConfigReady`；
    - 配置读写失败写入日志。
  - 配置有效性保护：
    - 粘贴事件在接管前同步检查配置；配置不完整时不阻断思源默认粘贴，避免图片丢失；
    - 上传、统计页上传/修复、同步、清理、右键上传均先校验配置；
    - 配置不完整时提示并跳转设置页。
  - `src/core/s3/transport.ts`：S3 直连增加超时 AbortSignal。
  - 日志接入：
    - 插件加载/卸载、事件注册、粘贴接管/失败、右键上传；
    - 上传开始/结束/失败项、替换结果；
    - 统计失败、同步报告、S3 清理结果与失败项；
    - S3 连接测试。
  - 新增 `src/core/legacyConfig.ts`：
    - 从 configStore 拆出纯函数 `mapLegacyPicgoConfig` / `parseLegacyConfig`；
    - 保持旧 PicGo `tcyun` / `awss3` 映射逻辑；
    - 便于 Node 单元测试。
  - 设置页新增“调试日志”：
    - 显示最近日志、条数；
    - 复制/清空；
    - 说明不会记录密钥。
  - 文档：
    - 重写 `README.md`、`README.zh-CN.md`：功能、安装、配置、使用、统计、同步/清理风险、开发、隐私、限制；
    - 重写 `CHANGELOG.md`：`v0.1.0` 功能与已知限制；
    - `plugin.json` 增加 cos/tencent/sync 关键词。
  - 新增测试：
    - `tests/errors.test.mjs`：错误映射；
    - `tests/legacy.test.mjs`：旧腾讯云/AWS 配置映射、JSON 字符串、错误对象拒绝、缺凭据警告。
- 真实配置迁移验证（只读）：
  - 读取真实旧 PicGo 配置：
    - source `tcyun`
    - endpoint `https://cos.ap-guangzhou.myqcloud.com`
    - region `ap-guangzhou`
    - bucket `picgo-1312673255`
    - uploadPath `siyuan/{year}/{month}/{md5}.{ext}`
    - customUrl `https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com`
    - pathStyle false、acl `public-read`
    - 警告 0 条，凭据完整。
- 性能验证：
  - 全库同步（971 篇文档、3922 个 S3 对象）：约 4.5 秒（含日志与保护扫描）。
  - 统计全库仍为亚秒级核心计算，UI 列表默认 300 条。
- 打包验证：
  - `package.zip` 包含：README、README.zh-CN、i18n、icon、index.css、index.js、plugin.json、preview、asset/action.png。
  - `dist/index.js` 210.59 kB。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 65 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`package.zip` 已生成
- 手动验证（需用户完成，Agent 不代替操作）：
  1. 使用最新 `package.zip` 在干净环境或覆盖安装，启用插件：
     - 顶栏图标、命令、状态栏正常；
     - 控制台无阻断错误。
  2. 首次配置：
     - 填写 S3 -> 测试连接 -> 保存；
     - 粘贴图片应自动上传；
     - 未配置时粘贴不应接管，图片仍由思源保存到本地。
  3. 旧配置导入：
     - 点击“导入旧 PicGo 配置”；
     - 核对 Endpoint/Region/Bucket/路径/CustomUrl；
     - 保存并测试连接。
  4. 日志：
     - 打开设置 -> 调试日志；
     - 执行一次上传/同步；
     - 复制日志，确认不含密钥。
  5. 主题与窄屏：
     - 切换暗色/亮色；
     - 缩小窗口，确认按钮和列表可读。
  6. 重启思源：
     - 配置、弹窗位置、粘贴、右键菜单、统计/同步结果缓存行为正常。
  7. 打包：
     - 卸载旧插件 -> 安装 `package.zip` -> 启用 -> 基本功能可用。
- 已知限制：
  - 图文混合粘贴只保留图片；
  - 清理只基于当前工作空间，删除不可恢复；
  - 非常旧笔记若本地文件名与 S3 key 不一致，无法通过文件名启发式保护；
  - 同步/清理仍建议先导出报告抽查。
- 下一步：等待整体验收；如需发布，只差在真实 SiYuan 环境完成安装/卸载/主题/重启手工验证。

---

## 2026-11-09 重设计对接 · 后端改造分析（未编码）

- 阶段：UI 重设计对接 — 分析
- 分支：`pigo`
- 输入：
  - Stitch 项目 `projects/12319694648067702779`（SiYuan Pigo UI Redesign）
  - 4 个 Screen 的 HTML + 截图已通过 MCP `download_file` 拉取到 `/tmp/opencode/stitch/`
    （`stats` / `upload` / `sync` / `settings`，含清理二次确认弹窗）
  - 输出分析文档：`docs/2026-11-09-redesign-backend-analysis.md`
- 结论：
  - 设计稿约 85% 的数据/操作后端已具备：10 张 KPI 卡、7 个统计筛选、5 个同步分类、
    全库扫描/上传、fileMap 修复、批量清理、CSV/JSON 导出、日志面板、配置校验均已有。
  - 真正需要后端改动 9 项：只读 S3 健康检查、存储供应商显示名、本地资源尺寸/扩展名、
    面板内独立上传、选中子集批量、每文档待修复计数、清理预估空间 + 删除前复核、
    `sourceTypes` 显式过滤、`replaceLink`/`skipIfAlreadyS3` 生效。
- 关键技术验证（内核实测 3.8.9）：
  - `pragma table_info(assets)` → 只有 `id, block_id, root_id, box, docpath, path, name, title, hash`，
    **没有 size/ext/hw**；`/api/file/readDir` 也只有 `name/isDir/isSymlink/updated`。
  - `/assets/<name>` 支持 `Range: bytes=0-0` → `206` + `Content-Range: bytes 0-0/43461`，
    可用 1 字节 GET 取到本地资源尺寸（不能全量 HEAD，需懒加载）。
  - 基线（当前工作空间）：文档 969、assets 1121、`assets.title='title-img'` 100。
- 行为缺陷发现：
  - `behavior.replaceLink`（上传后替换文档链接）在配置和 UI 中存在，但上传管线**从未读取**。
  - `behavior.skipIfAlreadyS3` 只在 `upload/types.ts` 类型里出现，uploader 实际用 `options.force`。
  - “上传本地图片”实际受 `includeRemoteImages` 控制，默认 true 会连带上传网络图。
  - 面板内 Ctrl+V 目前会被文档粘贴处理器接管（会写入 assets 并插入正文），需按焦点路由。
- 测试命令与结果：
  - Stitch MCP `list_projects` / `list_screens` / `download_file` —— ✅ 4 屏资源获取成功
  - `curl /api/query/sql`（token `glbu1bcm7uueheu9`）基线查询 —— ✅
  - `curl -H 'Range: bytes=0-0' /assets/...` —— ✅ 206 + Content-Range
- 遗留/风险：
  - 「自动监控」与「粘贴图片时自动上传」是否同一开关待确认。
  - 「置顶面板」在网页层无法真正 always-on-top，需确认是否接受“保持最上层 + 点空白不关闭”。
  - 统计页多选后的批量操作范围、上传页进度口径、清理弹窗是否保留输入 DELETE 待确认。
- 下一步：确认 5 个问题后按 P0（describe/health/assetMeta/数据模型）→ P1（独立上传/粘贴路由/选中批量）→ P2（清理计划/开关生效/快照失效）→ P3（UI 重写）实施。

---

## 2026-11-09 前端重构 · 开发计划（F0–F6）

- 阶段：计划（未编码）
- 分支：`pigo`
- 输出：`docs/2026-11-09-frontend-redesign-plan.md`
- 用户已确认的决策：
  1. 清理弹窗删除「预计释放空间」；
  2. 「自动监控」=「粘贴图片时自动上传」，顶栏与设置页双向联动同一开关；
  3. 统计页不做多选，只展示，范围仅「当前文档 / 全库」；
  4. 「置顶面板」按简单实现（z-index 最高 + 常驻 + 状态持久化）；
  5. 上传页「同步进度」= 已同步 / 可同步；
  6. 清理弹窗只保留「勾选确认」，移除输入 DELETE。
- 阶段划分：
  - F0 设计基线 + 面板外壳（tokens、基础组件、顶栏/页脚、置顶、`describeStorage`）
  - F1 设置页（手风琴 + 摘要 chip + 开关 + 日志）
  - F2 上传页（独立上传、粘贴路由、sourceTypes、pending 计数、尺寸懒加载）
  - F3 统计页（totalDocs、健康检查、10 KPI、筛选、卡片）
  - F4 同步页（docCount/totalObjects、清理计划、勾选确认弹窗、删除前复核）
  - F5 行为一致性（replaceLink / skipIfAlreadyS3 生效、configRevision、防闪烁）
  - F6 验收与发布（回归、文档、版本 0.2.0、打包）
- 纪律：一个 Phase 一个 commit；每阶段先自测（node --test / tsc / vite build），再由用户手动验证通过后提交。
- 下一步：等用户确认后开始 F0。

---

## 2026-11-09 Phase F0 — 设计基线 + 面板外壳

- 阶段：前端重构 F0
- 分支：`pigo`
- 设计稿快照：`docs/design/2026-11-09/`（4 个 HTML + 4 张 PNG，来自 Stitch MCP）
- 变更：
  - 新增 `src/styles/pigo-tokens.scss`：
    - 设计 token → CSS 变量（背景/卡片/边框/文本优先映射思源主题变量，语义色用设计色）；
    - 只在 `.siyuan-plugin-pigo-app` 内生效，避免污染思源样式。
  - 新增 `src/styles/pigo-ui.scss`：公共零件类（`.pigo-btn` 5 种变体、`.pigo-switch`、`.pigo-chip` 10 种色调、`.pigo-card`）。
  - `src/index.scss` 改用 `@use` 引入两个样式文件。
  - 新增 `src/components/ui/PigoButton.vue`、`PigoSwitch.vue`、`PigoChip.vue`、`PigoCard.vue`。
  - 新增 `src/core/s3/describe.ts`：`describeStorage()` / `detectStorageVendor()`，识别腾讯云 COS、AWS S3、阿里云 OSS、华为 OBS、七牛、MinIO 等，生成页脚 `Tencent COS (ap-guangzhou)` 文案。
  - 重写 `src/components/PigoPanel.vue`：
    - 左侧 Logo（橙金渐变）+ 标题 + 4 页签（激活态橙边 + 圆点）；
    - 右侧「自动监控」开关（绑定 `behavior.autoUploadOnPaste`，改动即时保存）；
    - 页脚插槽 + 渲染错误条；
    - 页签切换时更新页脚“当前模式”。
  - 新增 `src/components/PigoStatusBar.vue`：`S3 存储桶: label` + `当前模式: xxx` + `vX.Y.Z`。
  - 重写 `src/components/PigoPopup.vue`：
    - 尺寸 1000×760（窄屏自适应）、圆角 16、深投影；
    - 顶栏按钮：置顶 / 关闭（内联 SVG）；拖动改为按住顶栏空白区域（页签、开关、按钮等交互元素不触发）；
    - 首次打开居中，位置记忆保留；
    - 置顶：提高 `.siyuan-plugin-pigo-app` z-index、Esc 不关闭、按钮高亮、状态持久化。
  - `src/core/uiStore.ts`：新增 `pinned`（localStorage）+ `modeLabel` + `setPigoMode()` / `setPigoPinned()` / `togglePigoPinned()`；`hidePigoPopup(force)` 置顶时拒绝非强制关闭；顶部图标 toggle 仍可强制关闭。
  - `src/core/configStore.ts`：新增 `saveBehaviorPatch()`（跳过 S3 校验、乐观更新、写盘失败回滚），供顶栏开关与后续设置页复用。
  - 新增 `tests/describe.test.mjs`：7 条供应商识别用例。
- 未做（按计划推迟）：
  - `PigoModal` 推迟到 F4（清理弹窗时引入），`PigoHealthDot` 推迟到 F3（健康检查时引入），避免无用代码。
  - 四个 Tab 的内部布局保持原样，F1–F4 逐页替换。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 72 passed / 0 failed（新增 7 条）
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 218.13 kB，`dist/index.css` 34.42 kB；`package.zip` 已生成
  - 工作空间 `data/plugins/siyuan-plugin-pigo` 已被 watch 进程自动更新（17:41）
  - ESLint 未执行：脚手架 `eslint.config.mjs` 引用了不存在的 `src/utils/eslint/i18n-validate-keys.mjs`（既有问题，非本次引入）
- 待用户手动验证（F0 清单）：
  1. 重启/重载插件，打开 Pigo：新外壳、Logo、页签、页脚存储名正确；
  2. 按住顶栏空白区域拖动面板（页签/开关/按钮上不起作用），关闭再打开，位置保持；首次打开居中；
  3. 置顶：按钮高亮、关闭后重开仍置顶、Esc 不关闭、显式关闭按钮可关闭；
  4. 自动监控：顶栏开关切换后，到设置页确认「粘贴图片时自动上传」同步变化；反向再试；
  5. 暗色/亮色主题下文字、边框、页脚可读；
  6. 快速切换 4 个页签：无闪烁、无空白、无重复渲染；
  7. 窄窗口（<720px）：面板铺满、页脚只显示存储名。
- 遗留/风险：
  - 旧 Tab 内部仍是旧样式，与新外壳有视觉落差（F1–F4 逐页替换）；
  - 置顶只能做到页面内层级（网页层无法系统级 always-on-top）；
  - 顶栏「自动监控」文案点击也可切换，若用户希望只点开关，可在 F5 调整。
- 下一步：用户验证 F0 → 提交 `feat(pigo): 重构面板外壳与设计系统基线（F0）` → 开始 F1 设置页。

---

## 2026-11-09 Phase F1 — 设置页重构

- 阶段：前端重构 F1
- 分支：`pigo`
- 变更：
  - 新增 `src/components/ui/PigoAccordion.vue`：可折叠面板（图标插槽、标题/副标题、右侧摘要 chip、箭头旋转、`v-model:open`）。
  - 新增 `src/components/ui/PigoField.vue`：表单字段容器（label / label 右侧插槽 / hint / error）。
  - `src/styles/pigo-ui.scss` 增加表单零件：`.pigo-field*`、`.pigo-input`、`.pigo-select`、`.pigo-textarea`、`.pigo-check`、`.pigo-check-card`、`.pigo-divider`。
  - 重写 `src/components/settings/SettingsTab.vue`：
    - 顶部两张高频开关卡：`粘贴图片时自动上传`、`上传后替换文档中的图片链接`，含启用状态 chip、说明、开关；整卡可点击；
    - 三段手风琴：`S3 存储配置`（摘要=存储名）、`详细行为与上传规则`（摘要=`并发: 4 | 过滤网络图: 否`）、`调试与运行日志`（摘要=`共 N 条`）；
    - S3 表单：Endpoint/Region 三列栅格、Bucket、AK/SK（显示密钥）、上传路径模板（变量提示）、CustomUrl、额外前缀、ACL、超时、PathStyle、思源代理、`导入旧 PicGo 配置...` / `测试连接`、连接测试步骤结果；
    - 行为区：混合粘贴说明框、三个“批量扫描与上传”复选卡、并发滑杆 + 数字输入联动、调试日志；
    - 日志区：倒序列表（时间/级别/消息/详情）、复制、清空、条数；
    - 页脚：安全说明 + `恢复默认` / `保存配置`，`position: sticky` 固定在面板底部。
  - `src/core/configStore.ts` 行为保存加强：
    - 新增模块级 `savedConfig`（最近一次成功落盘的配置）；
    - `saveBehaviorPatch()` 改为“以已保存配置为基线 + 只合并行为字段”，避免顶栏/快捷开关把**未保存的 S3 表单改动**一起写盘；
    - 加载、保存成功后同步 `savedConfig`。
  - 快捷开关（粘贴自动上传 / 替换链接）改为**即时保存**（乐观更新 + 失败回滚 + 提示），其余表单仍走 `保存配置`。
  - 新增底部浮层提示（修复消息弹窗打乱排版）：
    - `src/core/toastStore.ts`：`pushToast()` / `dismissToast()` / `clearToasts()`，最多 3 条、自动消失、可点击关闭；
    - `src/components/ui/PigoToast.vue`：绝对定位于面板右下（页脚上方），淡入上滑 + 移动过渡，`pointer-events` 只作用于提示本身；
    - `PigoPanel.vue` 挂载 `PigoToast` 并设置 `position: relative`；
    - 设置页移除顶部内联 alert（会推挤内容），保存/重置/导入/复制/测试连接/配置错误全部改为底部浮层；
    - 快捷开关成功时不再弹提示（状态 chip 已可见），仅失败时提示。
  - 浮层提示第一次实测异常（用户反馈右下角看不到、设置页页脚说明文字闪烁），第二次修正：
    - `PigoToast` 改为**绝对定位全屏覆盖层**（`inset: 0` + `padding-bottom` 抬升），彻底脱离文档流，即使页脚变高也不会改变主内容布局；
    - `bottom/padding` 使用 `var(--pigo-footer-height, 34px)` 兜底，变量缺失也不会落到静态位置；
    - `z-index` 提到 60；设置页（有吸底操作栏）单独把提示抬高到 `页脚 + 96px`；
    - 提示卡片背景改为 `--pigo-bg`，避免与页脚文字视觉混叠；
    - `plugin.json` / `package.json` 版本升到 `0.1.1`，强制思源重新加载插件 JS/CSS，排除旧资源缓存；
    - `tests/smoke.test.mjs` 版本断言改为 semver 格式校验，避免每次升版本都要改测试。
  - 页脚文字闪烁修复（用户实测：切换快捷开关 / 保存配置时，页脚说明文字抖动）：
    - 根因：`configState.saving` 变化让「保存配置」按钮临时出现 loading 圈，按钮宽度增加，导致页脚 flex 重新分配宽度、说明文字重新换行；
    - `saveBehaviorPatch()` 不再切换 `configState.saving`（行为开关属于后台静默保存，不该驱动表单按钮 loading）；
    - 页脚两个按钮统一 `min-width: 88px`，loading 圈出现/消失不再改变按钮宽度；
    - 结果：三条触发路径（两个快捷开关、保存配置）都不会再引起页脚重排。
  - 页脚按钮视觉微调：
    - 「恢复默认」「保存配置」改用默认尺寸（12px 字号，原 11px 偏小）；
    - `min-width: 96px` + `justify-content/text-align: center`，文字始终居中，loading 圈出现时也不位移；
    - 仍保持宽度稳定，不会重新引入页脚闪烁。
- 测试命令与结果：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 72 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功；`dist/index.js` 231.52 kB，`dist/index.css` 43.87 kB；`package.zip` 已生成
  - 工作空间插件已由 watch 进程更新（17:54）
- 待用户手动验证（F1 清单）：
  1. 设置页顶部两个开关卡：点整卡、点开关都能切换；`已启用/已关闭` chip 同步；顶栏「自动监控」同步变化；
  2. 两个快捷开关**立即生效并持久化**（重载插件后保持），而 S3 表单改动不点保存不落盘；
  3. 三段手风琴展开/收起；摘要实时更新（存储名、`并发: 4 | 过滤网络图: 否`、`共 N 条`）；
  4. S3 表单：字段可编辑、保存后保持；错误提示定位到字段；显示/隐藏密钥；路径模板变量提示；
  5. `导入旧 PicGo 配置...`、`测试连接`（步骤、告警、错误展示）；
  6. 并发滑杆与数字输入联动，范围 1–10；
  7. 日志：倒序、时间/级别/消息、详情折叠展示、复制、清空、条数同步；
  8. 页脚说明 + `恢复默认` + `保存配置`（滚动时吸底）；
  9. 亮色主题、窄屏（<720px）单列显示。
  10. 通知位置：点「保存配置」「测试连接」「复制日志」等，提示出现在**右下角浮层**，不下推页面内容、不遮挡底部按钮；多条提示可叠放，3 秒左右自动消失，点击可关闭。
- 遗留/风险：
  - `replaceLink` 开关目前只有配置与 UI，真正生效在 F5；
  - `保存配置` 仍会整体校验 S3 字段（原有行为），只改行为开关时建议用顶部快捷开关；
  - 设置页字段较多，保存后摘要与页脚存储名依赖实时配置，未保存时会显示“预览值”。
- 下一步：用户验证 F1 → 提交 `feat(pigo): 重构设置页为手风琴布局（F1）` → 开始 F2 上传页。

---

## 2026-11-10 Phase F2 — 上传页重构（独立上传 + 粘贴路由）

- 阶段：前端重构 F2
- 分支：`pigo`
- 后端支撑（同批实现）：
  - 新增 `src/core/upload/select.ts`：纯函数 `selectRefs()`，把「题头图/网络图/S3 跳过/仅修链接」的筛选从 pipeline 抽出来，并新增 `sourceTypes` 显式范围。
  - `src/core/upload/pipeline.ts`：`PipelineOptions.sourceTypes`，改用 `selectRefs`。
  - 新增 `src/core/upload/standalone.ts`：
    - `uploadFilesToS3()`：面板内独立上传，复用 S3 client / key 模板 / 并发控制；
    - 不写 fileMap、不修改文档；
    - `uploadSingleFile()`、`isImageFile()`、`filterImageFiles()`。
  - 新增 `src/core/stats/assetMeta.ts`：
    - 实测 `assets` 表无 size 字段，改为 `Range: bytes=0-0` 读 `Content-Range` 总大小；
    - `parseContentRange()` / `extensionOf()` / `getAssetSize()`（带缓存、失败不重试）。
  - 新增 `src/core/paste/panelPaste.ts`：`isPigoPanelElement()` / `isPigoPanelPaste()` / `isPigoPanelFocused()`。
  - `src/index.ts`：文档粘贴接管前先判断焦点是否在 Pigo 面板，面板内粘贴交给面板自己的队列。
  - `src/core/paste/PasteUploadTransaction.ts`：上传统一走 `uploadFilesToS3()`，删除重复的并发/上传代码。
- 前端改动（重写 `src/components/upload/UploadTab.vue`）：
  - 顶部文档卡：笔记本/ID/扫描时间、文档标题 +「已就绪/待处理」、刷新文档按钮；
  - chips：本地 / S3 已同步 / 网络外链 / 总数 / 唯一图片 / 扫描耗时 + `同步进度 X / Y (Z%)` + 进度条；
  - 「快速添加图片」：点击选择、拖拽、面板内 Ctrl+V，进入待上传队列（缩略图、大小、状态、取消、开始上传、复制链接）；
  - 「当前页面批量操作」：上传本地图片（`sourceTypes:['local']`）、强制重新上传、替换为S3链接 (N)、停止；
  - 「已解析图片列表」：双列卡片（缩略图 + 扩展名角标、来源/题头图、状态、文件名、key/路径、块 ID、大小、操作）；
  - 通知统一走底部浮层；保留任务结果摘要与失败明细。
  - 额外：面板 body 与图片卡片加 `tabindex="-1"`，点击面板后 Ctrl+V 可稳定进入队列。
- 测试：
  - 新增 `tests/select.test.mjs`（5 条）、`tests/asset-meta.test.mjs`（4 条）、`tests/paste-route.test.mjs`（3 条）。
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ `dist/index.js` 241.79 kB，`dist/index.css` 46.87 kB；`package.zip` 已生成
- 待用户手动验证（F2 清单）：
  1. 文档卡与 chips 数字、扫描耗时、同步进度百分比；
  2. 图片卡片：缩略图/扩展名/来源/状态/文件名/key/块 ID/大小；
  3. 拖拽多图 → 队列 → 开始上传 → 拿到链接，**文档不变化**；
  4. 点击 dropzone 选择文件上传；
  5. 点击面板（空白或卡片）后 Ctrl+V → 进入队列；在编辑器内粘贴仍走自动上传并插入正文；
  6. 队列取消、上传中停止、复制链接；
  7. 「上传本地图片」只传本地，不传网络图；
  8. 「替换为S3链接 (N)」计数正确，点击后归零；
  9. 单卡「立即上传 / 转存至S3 / 重新上传」；
  10. 切换文档自动刷新，无旧数据残留；窄屏单列。
- 已知限制/风险：
  - 面板内粘贴需要焦点在面板（点击面板任意位置即可）；
  - 队列在上传页内保留，切换文档不会清空，但关闭插件后丢失；
  - 尺寸为“尽力而为”：本地用 Range 1 字节，S3 优先反查原图，失败回退 HEAD，仍失败显示 `—`。
- 下一步：用户验证 F2 → 提交 `feat(pigo): 重构上传页并支持面板内独立上传（F2）` → 开始 F3 统计页。

---

## 2026-11-10 Phase F2 修订 — 上传页交互与替换逻辑修复

- 阶段：前端重构 F2（用户第一轮测试反馈）
- 分支：`pigo`
- 关键实测结论：
  - 通过内核 API 验证：`block/updateBlock` 之后 **SQL 索引有短暂延迟**（实测 100ms 内查 `blocks.markdown` 仍是旧值，约 1s 后更新）；
  - 这解释了“上传后列表仍显示本地链接 / 上传后状态不刷新”的主要现象；
  - 处理方式：替换成功后延迟 350ms 再扫描，并二次校验（再等 450ms 重扫）；未替换时延迟 150ms。
- 修复内容：
  1. 按钮统一：`height: 28px/24px` + `inline-flex` 居中 + `line-height: 1`，`sm` 字号从 11px 提到 12px；所有变体（含 ghost）都加可见边框，边框色改用 `--b3-border-color`。
  2. `behavior.replaceLink` 真正生效：
     - `applyUploadResults` 新增 `replace` 选项；关闭时只写 fileMap、不改文档；
     - `PipelineOptions.replaceLink`，`execute` 默认取 `config.behavior.replaceLink`。
  3. 批量操作前强制重新扫描（`await refresh()`），避免用旧快照导致“少传/需要点第二次”。
  4. 刷新文档改为图标按钮（保留 loading 态与 tooltip）。
  5. 删除页面中部的大进度条：
     - 顶部同步进度条保留并始终显示，0% 时也能看到轨道；
     - 批量按钮内部用 `::before` 填充进度（`--pigo-progress`），按钮尺寸不变；
     - 运行中把「停止」按钮常驻（禁用/启用切换），避免布局跳动。
  6. 删除顶栏「自动监控」开关、删除上传页「开启右上角自动监控」文案（设置页开关保留）。
  7. 置顶语义修正：
     - 默认点面板外部关闭；置顶后常驻（外部点击 / Esc 都不关闭）；
     - 点击顶栏图标时先触发外部关闭，用 300ms 保护避免同一次点击又打开。
  8. 快速添加队列按“当前笔记 + 当前面板会话”管理：
     - 切换文档、关闭面板都会清空队列并回收 objectURL；
     - 新增「复制MD」「×」「清空列表」。
  9. 同步进度文案：`0%` 用灰色、上传中橙色、`100%` 才显示 ✓ 与绿色；进度条轨道始终渲染。
  10. 列表加载态改为 `loading && !scanResult`，刷新时保留旧列表，减少闪烁。
- 测试：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed / 0 failed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ `dist/index.js` 243.07 kB，`dist/index.css` 46.81 kB
- 待用户复测：按钮居中/边框、批量上传替换、第二次点击问题、单卡上传替换、队列清理、外部点击关闭、同步进度颜色、窄屏。
- 下一步：复测通过后提交 F2，进入 F3 统计页。

---

## 2026-11-10 Phase F2 修订 2 — 亮色主题配色与按钮层级

- 阶段：前端重构 F2（用户第二轮测试反馈）
- 根因：用户当前使用亮色主题，`--b3-theme-surface-lighter` 在 daylight 下是 `#e0e0e0`，
  被同时用作卡片背景和边框色 → **卡片、按钮、边框全部同色**，看起来“没有边框”。
- 修复：
  - `pigo-tokens.scss` 背景/卡片/边框全部改为 `color-mix(b3-background, b3-on-background)`：
    - card 94% + 6%、surface 90% + 10%、surface-strong 86% + 14%；
    - border 16% label 色、border-strong 28%；
    - 保留纯 rgba 作为不支持 `color-mix` 时的回退；
    - 亮/暗主题自动适配，不再依赖 `--b3-theme-surface-lighter`。
  - 批量操作栏删除「停止」按钮，只保留 `上传本地图片 / 强制重新上传 / 替换为S3链接`。
  - 按钮层级：批量主操作保持橙色 primary；图片卡片上的
    `立即上传 / 转存至S3 / 重新上传` 改为 `outline`（淡），复制类保持 `ghost`。
  - 「刷新文档」图标替换为用户提供的 `刷新.svg`（内联 path，`fill: currentColor`，16px）。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功
- 待用户复测：亮色主题下按钮边框、按钮层级、批量栏 3 个按钮、刷新图标。
- 下一步：复测通过后提交 F2。

---

## 2026-11-10 Phase F2 修订 3 — 进度卡 50%、置顶图标、按钮字体居中

- 阶段：前端重构 F2（用户第三轮测试反馈）
- 问题 1：本地图片上传后一直停在 50%，手动刷新页面才 100%
  - 原因：仍然依赖 SQL 索引；固定 350ms/450ms 两次延迟无法覆盖索引延迟波动；
  - 处理：
    - 新增 **乐观更新** `applyOptimisticUpload()`：上传成功且 replaceLink 开启时，直接把 `scanResult.refs` 中对应 ref 重写为 S3（`createParsedImage`），并用 `computeRefStats` 重算 stats，进度立即 100%；
    - `refresh()` 新增 `guardUrls`：扫描结果里若仍存在刚替换掉的旧链接（且不是 S3），判定为索引未更新，**不提交该次扫描**，每 320ms 重试，最多 6 次；
    - `runPipeline` 结束后用 guardUrls 刷新，避免“回退到 50%”。
- 问题 2：「置顶面板」图标换成用户提供的 `置顶.svg`（内联 2 个 path，`viewBox 0 0 1024 1024`，`fill: currentColor`）。
- 问题 3：按钮文字偏上 / 字体
  - 面板根节点显式使用 `font-family: var(--b3-font-family)`（与思源编辑器同一变量）；
  - `.pigo-btn` 改为 `font: inherit` + `box-sizing: border-box` + `line-height: 1.4`，保留固定高度与 `align-items/justify-content: center`，消除按钮继承 UA 字体导致的基线偏移。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 10:28 更新）
- 待用户复测：本地图片批量上传后进度直接 100%、置顶图标、按钮文字居中与字体。
- 下一步：复测通过后提交 F2。

---

## 2026-11-10 Phase F2 修订 4 — 图片缩略图预览

- 阶段：前端重构 F2（新增功能）
- 变更：
  - 新增 `src/components/ui/PigoImagePreview.vue`：
    - 全屏半透明遮罩 + 居中放大图片（`max-width: 92vw / max-height: 92vh`，`object-fit: contain`）；
    - 点击遮罩关闭、点击图片不关闭、`Esc` 关闭；
    - `Esc` 用捕获阶段 + `stopPropagation`，避免同时触发面板的 Esc 关闭。
  - `UploadTab.vue`：
    - 「已解析图片列表」缩略图支持点击/回车打开预览，hover 有强调描边与轻微缩放；
    - 预览组件挂在面板内部，点击遮罩不会触发“点击面板外部关闭面板”的逻辑。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功（工作区已更新）
- 下一步：复测通过后提交 F2。

---

## 2026-11-10 Phase F2 修订 5 — 上传后进度停在 50% 的二次修复

- 阶段：前端重构 F2（用户第四轮测试反馈：3 张本地图上传后进度不走到 100%）
- 现象：新文档 3 张本地图 → 上传后进度停在 50% 左右，手动刷新才 100%；6 张图的文档正常。
- 分析：
  - SQL 索引延迟与文档/事务大小相关，3 张图集中在少量 block 时 `updateBlock` 事务更大，索引延迟可能超过上一版 6×320ms（约 1.9s）的等待；
  - 上一版在重试用尽后仍会**提交最后一次（可能仍是旧的）扫描结果**，把乐观更新覆盖回去，所以看起来“卡住”，手动刷新时索引已更新才变 100%。
- 修复：
  - 新增 `pendingRemovals`：记录“刚被替换掉、但索引还没确认消失”的旧 URL；
  - `refresh()` 的重试次数提升到 10 次（约 3s），且**只要仍命中 pending 旧链接就绝不提交**；超时后保留乐观结果并 `scheduleStaleRetry()` 每 1.2s 后台重试；
  - pending 条目 20s 后过期，避免替换真的失败时永久拦截刷新；
  - 任何来源的刷新（切页签、外部触发）都会受 pending 保护，不会用旧数据覆盖乐观结果；
  - 守卫型后台刷新不再设置 `loading`，不会让按钮长时间禁用；
  - 日志新增：`已乐观更新 N 张图片为 S3，等待索引确认` / `扫描结果仍包含刚替换的旧链接，稍后重试`。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 10:40 更新）
- 下一步：复测 3 张图的新文档；若仍异常，请打开 设置 → 调试与运行日志，把 `任务完成：替换块 …` 与 `已乐观更新 …` 两条发我。

---

## 2026-11-10 Phase F2 修订 6 — 删除任务结果统计条

- 阶段：前端重构 F2（用户第五轮测试反馈）
- 变更：
  - 删除上传页的「上传 3 · 复用 0 · 跳过 0 · 失败 0 · 替换块 7 · 题头图 0 · 耗时 1629ms」结果条；
  - 同时移除 `lastPipeline` 状态与 `pipelineErrors` 计算、相关样式，避免它跨笔记残留、打乱布局；
  - 上传结果仍通过底部浮层提示（成功 / 失败条数），失败详情写日志。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 10:44 更新）
- 下一步：复测通过后提交 F2。

---

## 2026-11-10 Phase F2 修订 8 — 去掉单图重复上传的二次确认

- 阶段：前端重构 F2（用户反馈）
- 变更：`handleUploadRef()` 删除 `window.confirm('该图片已经是网络/已上传图片，是否重新上传？')`。
  - 「重新上传 / 转存至S3」本身就是用户明确点击的动作，不再二次确认；
  - 批量「强制重新上传」仍保留确认（影响整篇笔记，风险不同）。
- 验证：`tests` 84 passed、`tsc` 通过、`vite build` 成功（工作区 10:54）。
- 下一步：复测通过后提交 F2。

---

## 2026-11-10 Phase F2 修订 7 — 失效网络图片的重试与失败态

- 阶段：前端重构 F2（用户反馈：失效外链「转存至S3」一直转圈）
- 变更：
  - `src/core/upload/source.ts` 的 `readRemoteImage()`：
    - 每次尝试最多 **1.5s**（直连 + 思源代理共享同一时间预算）；
    - 最多 **3 次**尝试，间隔 200ms；
    - 失败信息统一为「网络图片读取失败（可能已失效）」并附带最近错误；
  - `UploadTab.vue`：
    - 新增会话级 `invalidRefs`（不落盘）：单个网络图片失败后按钮变为「图片失效」、禁用并显示玫红色；
    - `runPipeline()` 返回结果，单图上传由 `handleUploadRef()` 负责提示；
    - 失效状态在切换笔记、关闭面板、重载插件后自动清除。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 84 passed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 10:51 更新）
- 下一步：复测通过后提交 F2。

---

## 2026-11-10 Phase F2 完成并提交

- 阶段：前端重构 F2
- 用户复测通过：上传进度、失效外链重试、缩略图预览、单图无二次确认、删除结果统计条均正常。
- 提交：`dfff1b3 feat(pigo): 重构上传页并支持面板内独立上传（F2）`
- 下一步：F3 统计页。

---

## 2026-11-10 Phase F3 — 统计页重构（实现完成，待用户验收）

- 阶段：前端重构 F3（统计页）
- 目标：scope 切换 + 元信息行 + 10 KPI + 7 筛选 + 搜索 + 双列卡片 + S3 健康点；**不做多选**。

### 后端最小支撑

1. `ScanStats.totalDocs`：
   - `src/core/scan/types.ts` 新增字段（文档总数，`docs` 仍是含图文档数）；
   - `computeRefStats(refs, uniqueRefs, totalDocs = 0)`；
   - `scanDoc` 传 1，`scanAll` 传 `docs.length`。
2. `src/core/s3/health.ts`：
   - `checkS3Health(config, { force })` 只读健康检查（`listObjectsV2 maxKeys=1`，按上传前缀）；
   - 结果按「配置指纹」缓存 60s，并发请求合并；`force` 供点击健康点手动重查；
   - `clearS3HealthCache()` 供后续同步页复用。
3. `src/core/stats/service.ts`：
   - `scope=doc` 时只加载当前文档的 fileMap（`loadFileMap`），不再全库读取。
4. 新增 `src/components/ui/PigoHealthDot.vue`：ok / error / checking 三态点 + 文案。

### 统计页重构 `src/components/stats/StatsTab.vue`

- 顶部操作区（卡片）：
  - 分段控件「当前文档 / 全库」+「开始统计」+ 运行中「取消」；
  -「修复 S3 链接 / 修复全库S3链接」（紫色描边，无未替换时禁用）；
  -「上传本地图片 / 上传全库本地图片」（主按钮，无本地+Data 时禁用）；
  - CSV 导出改为图标按钮（不再提供 JSON 导出）。
- 元信息行：扫描时间 / 耗时 / 文档总数（含图数）或当前文档标题 / 资源文件 / 题头图资源；
  右侧为 S3 健康点（可点击强制重查）。
- 进度：运行中在工具栏底部显示 2px 进度条（绝对定位，不推挤布局），不再插入整块进度面板或提示条。
- 切换「当前文档 / 全库」时，若目标范围还没有快照会自动统计一次，避免切过去看到空页。
- 「上传本地 / 上传全库本地图片」固定 `sourceTypes: ['local']`（题头图属于 local，会一起上传），不误传网络图。
- 10 张 KPI：总引用、唯一图片、本地、已上传 S3、网络、Data URI、题头图、已上传未替换、含图文档、资源文件；沿用现有色语义。
- 7 个筛选 chip + 搜索（文档 / 路径 / 地址 / 描述 / key / 资源路径），保留 300 条「加载更多」。
- 双列卡片：
  - 缩略图（懒加载 + 扩展名角标 + 点击放大预览，失败回退占位图）；
  - 来源徽章、题头图徽章、已上传未替换徽章、文档标题；
  - 路径 / URL、块 ID、S3 Key、资源路径；
  - 状态点：未替换至云端 / 链接已同步 / 外部网络图源 / 内嵌 Data URI / 已上传未替换；
  - 操作：复制路径、复制链接、复制MD链接、立即上传、转存至S3、重新上传。
- 所有提示统一走底部 toast（不再使用 sticky notice 或横幅，避免推挤布局）；「已上传未替换」通过 KPI、筛选 chip 与修复按钮 title 表达。
- S3 健康检查超时收紧到 10s，避免 Endpoint 错误时长时间转圈。
- 响应式：<860px KPI 3 列，<720px 卡片 1 列，<560px KPI 2 列。

### 验证

- `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ **85 passed**（新增 totalDocs 用例）
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
- `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 11:06 更新）
- 实机 SQL 基线：文档 970 篇、assets 732。

### 待用户验收

1. 打开统计页默认「全库」，10 个 KPI 数字是否符合预期；
2. 切到「当前文档」后按钮文案、元信息、KPI 是否同步；
3. 筛选 chip 与搜索；
4. 卡片操作（复制路径 / 链接 / MD、立即上传、转存至S3、重新上传）；
5. 缩略图点击预览；
6. 右上健康点为绿色，点击可重新检查；改错配置后应变红；
7. 亮色主题下 KPI 与卡片配色是否可读。

- 下一步：用户验收通过后提交 `feat(pigo): 重构统计页展示与健康状态（F3）`，然后进入 F4 同步页。

---

## 2026-11-10 Phase F3 修订 1 — 图标替换与删除进度条

- 阶段：前端重构 F3（用户第一轮测试反馈）
- 变更：
  - 「开始统计」左侧图标换为用户提供的 `统计.svg`（内联 2 个 path，`viewBox 0 0 1024 1024`，`fill: currentColor`）；
  - CSV 导出按钮图标换为 `导出.svg`（内联 3 个 path）；
  - 删除「开始统计」下方的 2px 进度条及其 `progressPercent` 计算和样式；
  - 同步移除元信息行右侧的扫描进度文字，只保留按钮 loading 状态与左侧状态文字，避免布局抖动。
- 验证：`tests` 85 passed、`tsc` 通过、`vite build` 成功（工作区 11:19）。

---

## 2026-11-10 Phase F2 修订 9 — 缩略图文件大小角标

- 阶段：前端重构 F2（用户补充需求）
- 变更：
  - 缩略图右下角在扩展名前增加文件大小：`12K jfif`、`1.4M png`；
  - 单位规则：< 1MB 显示整数 `K`（最小 1K），≥ 1MB 显示 1 位小数 `M`；
  - 覆盖本地图片、S3 图片、网络图片；Data URI 不显示；
  - 本地图片用 `Range: bytes=0-0` 读大小；S3 优先取 fileMap 的本地原文件大小，否则 `HEAD` 对象；
  - 网络图片用 `HEAD` 取 `content-length`（1.5s 超时，直连失败后思源代理兜底一次）；
  - 缩略图已加载失败（`previewErrors`）的图片不再请求大小；S3 / 网络取不到大小时静默不显示，不重试。
- 验证：`tests` 85 passed、`tsc` 通过、`vite build` 成功（工作区 11:19）。

---

## 2026-11-10 Phase F2 修订 10 — 修复文件大小不显示 + 统计页也显示大小

- 阶段：前端重构 F2 / F3（用户反馈：上传页大小没显示；统计页也要显示）
- 根因（上传页）：
  - `resolveSizes()` 调用 `runWithConcurrency(tasks, 4)` 时漏传第三个参数 `isCancelled`；
  - 函数内部执行 `isCancelled()` 抛 `TypeError`，导致整批尺寸读取直接失败（被 `void` 吞掉），所以一个大小都不显示。
  - 修复：`runWithConcurrency` 的 `isCancelled` 改为可选（默认 `() => false`），并补单测。
- 重构：
  - 新增 `src/core/stats/refSize.ts`：
    - `resolveRefSize()` 统一本地 / S3 / 网络图片的大小解析；
    - `formatSizeBadge()` 统一 `K`（整数）/ `M`（1 位小数）格式；
    - `fillRefSizes()` 并发 4 补全尺寸；失败写入 `null` 负缓存，切换筛选 / 搜索时不会反复请求失效图片。
  - `UploadTab.vue` 改用共享实现，删除组件内的重复代码。
  - `StatsTab.vue`：
    - 新增 `sizeMap`，只对**当前可见的 300 条**卡片懒加载大小，避免全库 4000+ 次 HEAD 请求；
    - 缩略图右下角同样显示 `12K png` / `1.4M jpg`；
    - 筛选 / 搜索 / 加载更多后自动补全新出现的图片尺寸。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ **86 passed**（新增省略 isCancelled 的用例）
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 11:24 更新）
- 待用户复测：上传页 / 统计页的缩略图大小角标。

---

## 2026-11-10 Phase F3 修订 2 — 图标更新 + 缩略图角标改版

- 阶段：前端重构 F2 / F3（用户第二轮测试反馈）
- 图标（全部内联，`viewBox 0 0 1024 1024`，`fill: currentColor`）：
  - 统计页「修复 S3 链接」→ `链接.svg`（2 path）；
  - 「上传本地 / 全库本地图片」→ `上传.svg`（3 path）；
  - CSV 导出 → 更新后的 `导出.svg`（3 path）。
- 缩略图角标（上传页 + 统计页统一）：
  - 改为缩略图底部整条灰色层，左右两个等宽单元格，`大小 | 格式` 固定宽度、居中；
  - 只剩一项时自动占满整条；
  - 字号保持 9px，条高 16px，中间 1px 分隔线。
- 缩略图尺寸增加 50%：上传页 72 → **108px**，统计页 64 → **96px**。
- 验证：`tests` 86 passed、`tsc` 通过、`vite build` 成功（工作区 11:33）。

---

## 2026-11-10 Phase F3 修订 3 / F2 修订 11 — 图标修正与批量按钮图标

- 阶段：前端重构 F3 + F2（用户第三轮反馈）
- 修复统计页图标错位：
  - 「上传本地 / 全库本地图片」误用了 `导出.svg`，已换回 `asset/上传.svg`（3 path）；
  - CSV 导出按钮误用了旧的 `上传` 箭头，已换回 `asset/导出.svg`（3 path）。
- 统计页其余图标仍为：统计 = `asset/统计.svg`，修复链接 = `asset/链接.svg`。
- 上传页：
  - 「快速添加图片」dropzone 图标换成 `asset/上传.svg`；
  - 「上传本地图片」→ `asset/上传.svg`；
  - 「强制重新上传」→ `asset/强制.svg`（闪电，1 path）；
  - 「替换为S3链接」→ `asset/链接.svg`（2 path）；
  - 批量按钮图标统一 13×13，与文字间距由 PigoButton 的 gap 控制。
- 验证：`tests` 86 passed、`tsc` 通过、`vite build` 成功（工作区 11:51）。
- 待用户验收后提交 F3。

---

## 2026-11-10 Phase F2 修订 12 — 按钮文字垂直居中（像素级修正）

- 阶段：前端重构 F2（用户反馈三个批量按钮文字明显偏上）
- 定位：用 Firefox headless 以 6× 放大渲染同款按钮并测像素质心：
  - 文字包围盒中心比按钮中心高 **1px**（字体视觉基线偏高），与 line-height 无关；
  - 单纯改 line-height（1 / 16 / 22）都无法消除。
- 修复（`src/styles/pigo-ui.scss`）：
  - `.pigo-btn` padding 改为 `2px 12px 0`，`.pigo-btn--sm` 改为 `2px 10px 0`；
  - 这样内容中心整体下移 1px，文字包围盒与按钮中心完全重合；
  - 新增 `.pigo-btn > svg { transform: translateY(-1px) }`，让图标回正，保持图标几何居中。
- 统计页图标按钮 `.pigo-stats__export` 的 padding 同步为 `2px 0 0`。
- 复测渲染结果：按钮中心 91.5，文字中心 91.5（0 偏移）；图标中心 94.5（0.5px，视觉可忽略）。
- 验证：`tsc` 通过、`vite build` 成功（工作区已更新）。

---

## 2026-11-10 全局垂直居中审计（按钮 / chip / 标签 / 输入框）

- 阶段：前端重构 F2 / F3 收尾
- 方法：用 Firefox headless 8× 放大渲染同款组件并测像素质心，确认「中文字体视觉中心比行盒中心高约 1px」是全局性问题。
- 统一修复方式：
  - 有背景的小标签：上下内边距改为 `上+1 / 下-1`（总高度不变，内容下移 1px）；
  - 固定高度容器：`padding-top` 增加、底部归零（内容中心下移 1px），图标再用 `translateY(-1px)` 回正；
  - 圆点类装饰元素：`position: relative; top: -1px` 跟随文字视觉中心。
- 已覆盖：
  - `PigoChip`：`padding: 3px 8px 1px`（本地 / S3 / 网络 / 待处理 / 统计筛选 / 卡片徽章全部生效）；
  - 顶栏页签：`padding: 6px 11px 4px`，页签圆点 `top: -1px`；标题 `top: 1px`；
  - 页脚状态栏：`padding: 2px 12px 0`，状态圆点 `top: -1px`；
  - 统计页范围分段按钮：`padding: 2px 9px 0` + 图标 `translateY(-1px)`；
  - 手风琴摘要 chip：`padding: 3px 8px 1px`；
  - 输入框 / 下拉框：`padding: 7px 10px 5px`；
  - 统计页搜索框：`padding: 2px 9px 0 26px`；
  - 复选框：`top: -1px`；
  - 健康点 / 统计卡片状态点：圆点 `top: -1px`；
  - Toast 圆点 `margin-top: 5px`；
  - 上传页 `kbd` 快捷键：`padding: 2px 4px 0`。
- 验证：`tests` 86 passed、`tsc` 通过、`vite build` 成功（工作区 14:17 更新）。
- 备注：同步页仍是旧结构，F4 重构时统一套用以上规范。

---

## 2026-11-10 Phase F3 完成并提交

- 提交：`325dd5e feat(pigo): 重构统计页展示与健康状态（F3）`
- 用户验收通过：统计页、图片大小角标、全局垂直居中均正常。

---

## 2026-11-10 Phase F4 — 同步页重构与清理确认弹窗（实现完成，待用户验收）

- 阶段：前端重构 F4（S3 双向同步 + 清理）
- 目标：分类卡片 + 双列列表 + 危险清理弹窗（勾选确认，无「预计释放空间」）。

### 后端最小支撑

1. `SyncSummary.docCount / totalObjects`：
   - `buildSyncReport` 新增 `docCount` 选项，`totalObjects = objects.length`；
   - 服务层传入 `scan.docs.length`。
2. `buildCleanupPlan(report)`（`src/core/sync/report.ts`）：
   - 仅「仅 S3 存在 + 前缀内 + 非 `_pigo_test/`」；
   - 返回 `{ items(含 etag), keys, count, prefix, protectedPrefix: '_pigo_test/*' }`。
3. `revalidateCleanupPlan(config, plan)`（`src/core/sync/service.ts`）：
   - 删除前逐 key `HEAD`，并发 4；
   - 对象不存在 / ETag 变化 / 前缀或保护目录复核失败 → 跳过，不删；
   - 返回可删除 keys 与跳过原因。
4. `uiStore.cleanupCount` + 页脚 `待清理: N 项`。

### 新组件

- `src/components/ui/PigoModal.vue`：遮罩 + 焦点陷阱 + Esc 关闭（不 Teleport，保证设计 token 生效）。
- `src/components/sync/CleanupModal.vue`：
  - 标题、红色不可逆提示、前缀、保护目录、待清理数量（**无预计释放空间**）；
  - 勾选确认后才可点「确认彻底删除 (N)」；
  - 删除中显示复核/删除进度文字。

### 同步页重构 `src/components/sync/SyncTab.vue`

- 操作栏：重新扫描、取消、CSV 图标导出、红色「清除 S3 多余图片 (N)」；
- 固定安全说明条；
- 元信息行：扫描时间 / 耗时 / 笔记数 / S3 对象数 / 上传前缀 + S3 健康点；
- 5 张 KPI：双向匹配 / 仅 S3 / 仅思源 / 未上传 / 前缀外；
- 5 个筛选 chip + 搜索（key / URL / 文档）；
- 双列卡片：S3/来源徽章、扩展名、key、URL、`大小 · 修改时间`、状态（未被笔记引用 / N 篇文档 / 云端对象不存在 / 待上传 / 前缀外安全保留）、复制 key / 复制链接；
- 加载更多 300；
- 清理流程：弹窗勾选 → HEAD 复核 → 批量删除 → 删除后静默重扫；
- 所有提示统一走底部 toast，不再插入会推挤布局的提示块。

### 验证

- `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ **87 passed**（新增 cleanupPlan / summary 字段用例）
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
- `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 14:25 更新）

### 待用户验收

1. 同步页 5 个数字是否合理（双向匹配 + 仅S3 + 仅思源 + 未上传 + 前缀外）；
2. 5 个筛选与搜索；
3. 行内复制 key / 链接；
4. 红色按钮弹窗：数量、前缀、`_pigo_test/*`，**不应出现预计释放空间**；
5. 不勾选时确认按钮禁用；
6. 删除 1–2 个测试对象后数量下降并自动重扫；
7. 前缀为空时的红色强警告；
8. 亮色 / 暗色主题与窄屏。

- 下一步：用户验收通过后提交 `feat(pigo): 重构同步页与清理确认弹窗（F4）`，然后进入 F5。

---

## 2026-11-10 Phase F4 修订 1 — 新图标、查看图片、搜索框修复

- 阶段：前端重构 F4（用户第一轮测试反馈）
- 图标全部改为 `asset/` 中用户准备的版本（内联 path，`viewBox 0 0 1024 1024`，`fill: currentColor`）：
  - 同步页「重新扫描」→ `扫描.svg`；「清除 S3 多余图片」→ `清理.svg`；
  - 设置页「粘贴图片时自动上传」→ `上传.svg`；「上传后替换链接」→ `链接.svg`；
  - 「S3 存储配置」→ `S3存储.svg`；「详细行为与上传规则」更名为 **「插件配置」** + `设置.svg`；
  - 「调试与运行日志」→ `调试.svg`；
  - 统计页 / 同步页搜索框 → `搜索.svg`。
- 同步页卡片：
  - 移除「复制 key」；
  - 新增「查看图片」，复用 `PigoImagePreview` 全屏预览；
  - 双向匹配 / 仅 S3 / 前缀外使用公开 URL，未上传使用本地资源/网络原图；
  - 「仅思源存在」对象已丢失，不提供预览；
  - 关闭面板时自动关闭预览。
- 搜索框重叠根因：
  - `index.scss` 在入口文件末尾才 import，导致全局 `.siyuan-plugin-pigo-app .pigo-input` 在组件 scoped 规则之后输出，同权重覆盖了搜索框的 `padding-left`；
  - 修复：把 `import '@/index.scss'` 移到入口第一行，保证全局基础样式先于组件样式；
  - 同时把搜索输入规则提升为 `.pigo-xxx__search .pigo-xxx__search-input`，左侧留白改为 28px。
  - 该调整同时修正了修复按钮/卡片操作按钮等被全局按钮样式覆盖的隐患。
- 验证：`tests` 87 passed、`tsc` 通过、`vite build` 成功（工作区 14:50）。

---

## 2026-11-10 Phase F4 完成并提交

- 提交：`cb69a01 feat(pigo): 重构同步页与清理确认弹窗（F4）`
- 用户验收通过：同步页、清理弹窗、查看图片、新图标、搜索框均正常。

---

## 2026-11-10 Phase F5 — 行为一致性与稳定性（实现完成，待用户验收）

- 阶段：前端重构 F5
- 目标：配置开关真正生效 + 配置变更后快照失效 + 交互一致性收尾。

### 行为开关

1. `behavior.skipIfAlreadyS3` 真正接入：
   - `selectRefs()` 新增 `skipIfAlreadyS3` 选项（默认跟随配置）；
   - `uploadRefs/uploadOne()` 使用同一开关；关闭时 S3 图片视为强制重新上传，
     忽略 fileMap 里的旧记录并重新读取对象上传。
2. `behavior.replaceLink` 提示补齐：
   - 关闭时上传成功但未替换链接，底部提示
     「已上传 N 张图片，按设置未替换文档链接；可在统计页点击「修复S3链接」」；
   - fileMap 仍写入，统计页「已上传未替换」可继续走修复流程。

### 配置变更后的快照失效

3. `configStore.revision`：配置保存 / 恢复默认时 +1。
4. 统计页监听 revision：
   - 清空全库 / 当前文档快照与筛选、搜索；
   - 若统计页可见 → 自动重扫；否则下次进入统计页自动重扫；
   - 同时强制重查 S3 健康状态。
5. 同步页监听 revision：
   - 清空旧报告、待清理计数、预览；
   - 标记 `stale`，若同步页可见立即静默重扫；否则下次进入同步页自动重扫。

### 一致性收尾

6. 所有长任务继续统一使用「运行中禁用 + 取消只取消未开始任务」的并发工具条。
7. 配置不完整的引导保持统一：toast 提示并自动跳到设置页。
8. 空态 / 错误态 / 无文档状态在各页面保持现有文案与布局，不插入会推挤布局的块。
9. 亮色 / 窄屏样式沿用 F2–F4 的响应式规则（KPI 3/2 列、卡片单列）。

### 验证

- `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ **89 passed**
  （新增 skipIfAlreadyS3 两个用例）
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
- `node_modules/.bin/vite build` —— ✅ 构建成功（工作区 14:56）

### 待用户验收

1. 设置页关闭「上传后替换文档链接」→ 上传本地图片 → 文档仍是本地链接，
   统计页「已上传未替换」增加；再打开开关 →「修复S3链接」→ 计数归零；
2. 修改 Endpoint / 上传前缀并保存 → 统计页与同步页数据按新配置自动刷新；
3. 快速切换页签 / 重复点击开始统计，无空白、无重复请求、无闪烁；
4. 亮色主题与 720px 以下窄屏；
5. 关闭「跳过已上传 S3」后，重新上传 S3 图仅建议少量测试。

- 下一步：用户验收通过后提交 `fix(pigo): 修正配置开关生效与页面闪烁问题（F5）`，进入 F6。

---

## 2026-11-10 Phase F2 修订 13 — 主按钮进度层不可见修复

- 阶段：前端重构 F2 / F5 复测反馈
- 现象：「上传本地图片」（primary）上传时看不到按钮内的充电进度，而「强制重新上传」可见。
- 原因：进度层是 `rgba(249, 115, 22, 0.32)` 的橙色半透明覆盖，
  主按钮本身是橙→琥珀渐变，橙色叠橙色几乎无对比，视觉上被“吞掉”。
- 修复（`src/components/upload/UploadTab.vue`）：
  - 进度层统一改为**纯橙填充** `var(--pigo-accent)`（从透明底逐渐覆盖为橙色）；
  - 主按钮在运行中把底色切到中性灰 `var(--pigo-surface-strong)`，
    否则橙色层会与橙色渐变底混在一起；
  - 运行中按钮虽然 disabled，但进度按钮覆盖 `opacity: 1`，保证充电效果清晰；
  - 文字/图标颜色改为跟随主题 `var(--pigo-text)`，亮色主题下仍可读。
- 验证：Firefox 6× 渲染对比（灰底 + 纯橙 50%）边界清晰；
  `tsc` 通过、`vite build` 成功（工作区 15:18）。

---

## 2026-11-10 Phase F5 完成并提交

- 提交：`1c3840b fix(pigo): 修正配置开关生效与页面闪烁问题（F5）`
- 用户验收通过：两个行为开关、配置变更自动刷新、上传按钮充电效果均正常。

---

## 2026-11-10 Phase F6 — 验收与发布 0.2.0（已完成）

- 阶段：前端重构 F6（收尾）
- 版本：`0.2.0`（`plugin.json` / `package.json` 同步更新）

### 文档

- `README.zh-CN.md` / `README.md`：
  - 状态更新为 0.2.0；
  - 补充四页界面、图片预览、大小角标、S3 健康检查、清理 ETag 复核；
  - 更新上传 / 统计 / 同步 / 清理流程说明（勾选确认、无预计释放空间）；
  - 设置入口改为「S3 存储配置」。
- `CHANGELOG.md`：新增 v0.2.0 完整变更记录（新增 / 变更 / 修复 / 兼容）。

### 构建与打包

- `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ **89 passed**
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
- `node_modules/.bin/vite build` —— ✅ 构建成功，生成 `package.zip`
- `package.zip`：24 个文件，约 517 KB；包含 `index.js` / `index.css` / `plugin.json`(0.2.0) /
  `icon.png` / `preview.png` / `README` / `i18n` / `asset/*`。

### 覆盖安装验证

- 工作区插件目录 `/home/goserank/文档/Siyuan/data/plugins/siyuan-plugin-pigo` 已更新：
  - `plugin.json` 版本 0.2.0；
  - `index.js` / `index.css` 包含 F4/F5 最新功能（查看图片、插件配置、清理弹窗、configRevision）。
- 升级路径数据检查：
  - `storage/petal/siyuan-plugin-pigo/config` 保留（bucket / 前缀 / replaceLink 均在）；
  - fileMap 仍使用 `custom-picgo-file-map-key`，文档数据未迁移、未丢失。

### 回归基线（当前真实工作空间）

- 文档 968 篇，含图文档 654 篇；
- 总引用 5,377；唯一图片 4,390；
- 本地 586 / S3 3,144 / 网络 660 / Data 0；
- 题头图 270；assets 资源文件 608。

### 全量验收清单

- [x] 四个页面布局、主题变量、亮/暗色可读
- [x] 顶栏页签、拖拽、置顶、关闭
- [x] 页脚存储桶 / 当前模式 / 版本
- [x] 统计：双范围、10 KPI、7 筛选、搜索、卡片操作、健康点
- [x] 上传：点击/拖拽/面板粘贴、队列、充电进度、批量栏、预览、大小角标
- [x] 同步：5 分类、筛选、搜索、查看图片、清理弹窗（勾选、无预计空间）
- [x] 设置：两开关 + 三段手风琴、保存 / 恢复 / 导入 / 测试 / 日志
- [x] 行为：replaceLink、skipIfAlreadyS3、配置变更快照失效
- [x] 稳定性：无插入式布局抖动、取消可用、无重复请求
- [x] 回归：右键上传、粘贴自动上传、题头图、GIF、全库上传、清理逻辑

- 下一步：提交 `chore(pigo): 发布 0.2.0 前端重构版本（F6）`。

---

## 2026-11-10 0.2.0 发布后修复 — S3 图片大小 & 列表分页（待用户验收）

### 1. S3 图片不显示大小

- 根因：思源代理模式（`useSiyuanProxy: true`）下，`normalizeProxyHeaders()` 会过滤掉
  `content-length`，导致 `headObject()` 拿不到对象大小；
  同时 S3 图片的 fileMap 记录里 `originUrl` 是本地路径，按 S3 URL 查不到。
- 修复：
  - `src/core/s3/transport.ts`：HEAD 响应保留 `content-length`（GET 仍过滤）；
  - `src/core/stats/refSize.ts`：S3 图片先按 fileMap 的 `entry.url === ref.url` 反查本地原文件，
    有则用本地 Range 大小；否则 HEAD 对象；
  - 上传页尺寸改为只读取当前分页的 60 张，翻页时补读，避免大文档一次发几百个请求。

### 2. 图片胶囊分页

- 新增 `src/components/ui/PigoPagination.vue`：
  - 固定每页 60 条；显示「共 N 条 · 第 x / y 页」；
  - 上一页 / 下一页按钮，首尾自动禁用；
  - 输入页码 + 回车跳转，失焦恢复当前页；
  - 键盘左右键翻页：仅当分页组件可见、焦点不在输入框/可编辑区域、
    且没有弹窗/图片预览时生效，避免误触。
- 上传 / 统计 / 同步三个页面全部改为分页：
  - 移除原「加载更多 300」；
  - 搜索、筛选、切换范围、切换文档、重新扫描时自动回到第 1 页；
  - 统计页图片尺寸也改为只读取当前页。

### 验证

- `tests`：89 passed
- `tsc`：无错误
- `vite build`：成功（工作区 15:31 更新）
- 待用户验收：S3 图片大小、三个页面的分页与键盘翻页。

- 验收通过后提交并升级为 `0.2.1`。

---

## 2026-11-10 发布 0.2.1

- 用户验收通过：S3 图片大小、三个页面分页与键盘翻页均正常。
- 修复提交：`a336513 fix(pigo): 修复 S3 图片大小与长列表分页`
- 版本：`0.2.1`（`plugin.json` / `package.json`）
- 文档：README 状态更新；CHANGELOG 新增 v0.2.1。
- 验证：
  - `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 89 passed
  - `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
  - `node_modules/.bin/vite build` —— ✅ 构建成功并重新生成 `package.zip`
- 覆盖安装：工作区插件目录已更新为 0.2.1，配置 / fileMap 不变。

---

## 2026-11-10 性能排查与优化 — 80 图批量上传 CPU 偏高

### 1. 复现与量化（真实工作空间）

- 环境：SiYuan 3.8.9 / Electron 44.10（Chromium 152）；12 核；`useSiyuanProxy=true`、`concurrency=4`、路径模板 `siyuan/{year}/{month}/{md5}.{ext}`。
- 找到 80 图左右的真实文档（`20230513163056-zc3a4mp`：80 个 fileMap 条目 / 9.0 MB；`20230513171438-fr0eje2`：81 条 / 16.1 MB）。
- 用 80 张真实 assets（16.2 MB，平均 208 KB）复刻上传热路径，分别采样 Node(JS) 与 SiYuan-Kernel 的 CPU：

| 路径 | wall | 插件 JS CPU | 内核 CPU | 吞吐 |
| --- | --- | --- | --- | --- |
| 直连 S3 ×4 | 139 ms | 172 ms | 30 ms | 117 MB/s |
| 思源代理 ×4（旧 Base64） | 1011 ms | 1069 ms | 1020 ms | 16 MB/s |
| 思源代理 ×4（新 Base64，Node 回退实现） | 622 ms | 720 ms | 1080 ms | 26 MB/s |
| 代理单请求固定开销（1 KB ×80） | 233 ms | — | 60 ms | 0.75 ms/请求 |
| 代理按体积开销（200 KB ×80） | 1148 ms | — | 880 ms | 11 ms/请求 |

- 结论：
  1. 代理模式下每字节要走两遍 Base64：渲染进程编码（旧实现 23 MB/s）+ 内核解码（约 18 MB/s）。
  2. 旧 `arrayBufferToBase64` 用 `String.fromCharCode(...32KB)` + 巨型字符串拼接，是插件侧最大的 CPU 热点。
  3. `putObject` 之前还会 `request.clone().arrayBuffer()`，把整张图再复制一次。
  4. 每张图上传完成都回调一次进度 → 整页（60 张卡片）重渲染 80 次。
  5. 替换链接时逐块 `getBlockByID` + `updateBlock`，80 张图 = 80 次读取 + 80 次内核事务 / 索引 / 编辑器重绘。
  6. 上传后列表把 60 个缩略图换成 S3 URL，浏览器重新下载并解码刚上传的图片。

### 2. 本次改动

- 新增 `src/core/s3/base64.ts`：
  - 优先调用 Chromium 133+ 原生 `Uint8Array.prototype.toBase64()` / `Uint8Array.fromBase64()`；
  - 旧环境回退为查表编码（实测 73.6 MB/s，旧实现 23.8 MB/s）；
  - 统一 `bytesToBase64` / `base64ToBytes`，`source.ts` 删除重复实现。
- `src/core/s3/transport.ts`：
  - 新增 `body` 参数，代理模式直接对原始 `Uint8Array` 编码，删除 `request.clone().arrayBuffer()` 全量复制；
  - 响应解码走统一工具。
- `src/core/s3/client-core.ts` + `client.ts`：
  - `S3Requester` 增加第二个 `body` 参数；
  - 代理模式下签名不再把 body 放回 Request（S3 使用 `UNSIGNED-PAYLOAD`，签名结果不变）；
  - 已用真实腾讯云 COS 桶验证：PUT / HEAD / GET / DELETE 全部成功（`siyuan/_pigo_perf_check/...` 测试对象已删除）。
- `src/core/upload/uploader.ts`：
  - 上传进度回调节流至 100 ms（尾随补发 + 结束时强制刷新），80 次重渲染降为约 10 次。
- `src/core/upload/replacer.ts` + `src/api.ts`：
  - 新增 `getBlocksMarkdown()`：一条 SQL 取回全部待替换块的 markdown（按 200 个 id 分批），替代逐块 `getBlockByID`（仍然是最新内容，不用过期扫描快照）；
  - 新增 `batchUpdateBlock()`：所有块合并为一次内核事务；批量失败时自动回退逐块 `updateBlock`，保持部分成功语义；
  - 计数/错误统计保持不变。
- `src/components/upload/UploadTab.vue`：
  - 新增 `localPreviewByUrl`：上传后用“S3 URL -> 本地 assets”缓存缩略图，避免重新下载/解码 60 张图；
  - 尺寸回填改为 `requestAnimationFrame` 合并，60 次 `setSize` 降为每帧一次；
  - 缩略图增加 `decoding="async"`；
  - 切换文档 / 关闭面板时清理缓存。
- `src/components/settings/SettingsTab.vue`：
  - 代理开关下增加说明：代理要把图片 Base64 交给内核，内核额外解码会增加 CPU；桶配置了 CORS 时关闭代理更快。

### 3. 验证

- `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
- `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ 95 passed（新增 `tests/base64.test.mjs` 4 条、`tests/s3.test.mjs` 2 条）
- `node_modules/.bin/vite build` —— ✅ 成功，`package.zip` 已重新生成
- 真实 COS 签名验证（代理模式、Request 不再携带 body）：PUT 200 / HEAD 41B / GET 内容一致 / DELETE 后 404 ✅
- `/api/block/batchUpdateBlock` 在 3.8.9 上实测可用（`{blocks:[{id,dataType,data}]}`，no-op 更新后内容不变）✅

### 4. 部署与遗留

- 已覆盖工作区插件目录 `/home/goserank/文档/Siyuan/data/plugins/siyuan-plugin-pigo`（`index.js` / `index.css` / `plugin.json`），版本仍为 0.2.1，待用户验收后再升 0.2.2。
- 需要用户在 SiYuan 中重新加载插件后验证：
  1. 80 图文档执行「上传本地图片」，观察 CPU 与总耗时；
  2. 替换后的列表缩略图应继续使用本地预览（不重新下载）；
  3. 题头图 / GIF / 右键上传 / 粘贴上传回归。
- 无法继续压缩的部分：思源 `forwardProxy` 在内核侧仍需 Base64 解码（实测约 18 MB/s）；若存储桶配置 CORS 并关闭代理，可同时省掉渲染进程编码与内核解码。
- 下一步：用户验收通过后提交 `fix(pigo): 降低批量上传 CPU 占用` 并升级 0.2.2。

### 5. 验收与发布 0.2.2

- 用户验收通过：80 图批量上传的 CPU 与耗时符合预期，缩略图、题头图、GIF、右键上传、粘贴上传回归正常。
- 提交：
  - `fa1b056 fix(pigo): 降低批量上传 CPU 占用`
  - `chore(pigo): 发布 0.2.2`（本条目）
- 版本：`plugin.json` / `package.json` → `0.2.2`；CHANGELOG / README 状态同步更新。
- 构建：`vite build` 成功，`package.zip` 重新生成；工作区插件目录已覆盖为 0.2.2，配置与 fileMap 不变。


---

## 2026-11-13 修复：统计页上传后无法立即修复 / 修复不生效

### 现象

1. 统计页全库扫描后上传单张本地图片，「修复全库S3链接」不能立即点击；
   手动重新扫描后才变为可点击。
2. 点击修复后提示完成，但图片仍显示为本地 / 「已上传未替换」；
   同步页也扫描不出孤立 S3 对象。
3. 期望：统计页上传单张或全部图片后立即可修复；修复成功后状态变为 S3、
   待修复数归零、修复按钮重新禁用。

### 根因

1. **修复任务沿用了「上传后替换文档链接」开关**：
   `pipeline.execute()` 使用 `options.replaceLink ?? config.behavior.replaceLink`，
   而统计页 / 上传页的「修复S3链接」都没有传 `replaceLink`。
   当设置里关闭该开关时，修复只复用 fileMap、不替换任何链接，因此必然“修复失败”。
   同步页通过 IAL 里的 fileMap 保护对象，所以看不到孤立对象，符合该根因。
2. **思源 SQL 索引有短暂延迟**：`setBlockAttrs` / `updateBlock` 之后立刻重扫，
   `blocks.ial` / `blocks.markdown` 可能仍是旧值，导致「已上传未替换」暂时为 0，
   修复按钮禁用；修复后的自动刷新也可能闪回本地状态。上传页已有类似的守卫，
   统计页没有。

### 修复

- 新增 `src/core/upload/policy.ts`：`shouldReplaceLinks()` 规定 `repairOnly` 必须替换链接；
  `pipeline.execute()` 统一使用它，统计页与上传页的修复入口也显式传 `replaceLink: true`。
- `replacer.ts` 的 `ReplaceResult` 新增 `replacedUrls`，精确记录本次真正替换掉的旧 URL。
- 新增 `src/core/stats/optimistic.ts`：把上传 / 修复结果合并进统计快照：
  - 已替换：对应引用立即变为 S3；
  - 未替换：新的 fileMap 记录并入快照，「已上传未替换」立即增加；
  - 仅在受影响文档内更新，避免同一图片被多个文档引用时误改其它文档。
- `StatsTab.vue`：
  - 上传、修复、单图上传完成后先乐观更新快照，按钮状态立即正确；
  - 新增 SQL 索引守卫：重扫结果仍包含旧链接或缺少 fileMap 记录时自动重试（10 次 × 300ms），
    仍不一致则保留乐观结果并延迟重试，绝不把旧数据提交到界面；
  - 切回统计页时若有未确认的守卫会再补一次扫描。
- `uploader.ts`：修复模式复用 fileMap 记录时只要求 `url` 是 http(s)，
  与统计页 `isUploadedButNotReplaced` 的判定保持一致。
- `UploadTab.vue`：乐观更新与待删除守卫改用 `replacedUrls`，避免把替换失败的图片误标为 S3。

### 验证

- `node --experimental-strip-types --test tests/*.test.mjs` —— ✅ **100 passed**
  （新增 `tests/repair.test.mjs`：修复强制替换、乐观更新、跨文档不误改）
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` —— ✅ 无类型错误
- `vite build` —— ✅ 构建成功，`dist` 与 `package.zip` 已重新生成
