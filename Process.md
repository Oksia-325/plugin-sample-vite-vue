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
