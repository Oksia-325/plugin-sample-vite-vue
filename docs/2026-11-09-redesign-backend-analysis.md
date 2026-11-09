# 重设计稿 · 后端改造分析（2026-11-09）

- 设计来源：Stitch 项目 `projects/12319694648067702779`（SiYuan Pigo UI Redesign）
  - `projects/.../screens/a5cc2693...` 统计页面重构
  - `projects/.../screens/35eeb2c7...` 上传页面重构
  - `projects/.../screens/9dfb4a0c...` 同步与清除二次确认
  - `projects/.../screens/cae83b59...` 设置页面重构
- 对照代码：本仓库 `pigo` 分支（Phase 0–8 已完成）
- 结论：**新设计约 85% 的数据与操作后端已具备**，主要是 UI 重写；
  真正需要动后端的是 9 项（新增 6、扩展/修正 3），下面逐条给出。

---

## 1. 结论先行

现有后端已经能产出设计稿里的绝大部分数字：

- 10 张 KPI 卡（总引用/唯一/本地/S3/网络/Data/题头图/已上传未替换/含图文档/资源文件）→ `ScanStats` 全部已有
- 7 个统计筛选 chip + 计数 → 由 `uniqueRefs` 现场计算即可
- 5 个同步分类（双向匹配/仅 S3/仅思源/未上传/前缀外）→ `SyncReport` 全部已有
- 全库扫描、全库上传、fileMap 修复、批量清理、导出 CSV/JSON → 已有
- 日志面板、配置校验、测试连接、旧 PicGo 配置导入 → 已有

需要新增的能力集中在“新界面里才出现”的四类：

1. 面板内独立上传（拖拽 / Ctrl+V，不依赖笔记文档）
2. 只读的 S3 健康状态与存储供应商显示名
3. 本地资源尺寸 / 扩展名（`assets` 表实测没有 `size`/`ext` 字段）
4. 选中项批量操作 + 清理预估空间 + 删除前复核

---

## 2. 设计元素 → 后端能力映射

### 2.1 全局（四个页面共有）

| 设计元素 | 现状 | 后端动作 |
|---|---|---|
| 顶栏「自动监控」开关 | 只有设置页的 `autoUploadOnPaste` | **待确认**：复用同一配置项，还是新增独立 flag；见 §5.1 |
| 顶栏拖拽 / 置顶 / 关闭 | 现有弹窗只有拖拽 + 关闭 | 纯前端（置顶见 §5.3） |
| 页脚「S3 存储桶: Tencent COS (ap-guangzhou)」 | 无 | **新增** `describeStorage()` 纯函数 |
| 页脚「v2.4.0」 | `plugin.json` 版本 | 前端读取，无后端 |
| 「Cos S3 节点连接正常」健康点 | 只有设置页的写测试对象式 `testS3Connection` | **新增** 只读健康检查 + 缓存 |
| 页脚「当前已选中 N 项」 | 无 | 前端状态 + 新增批量接口 |

### 2.2 统计页

| 设计元素 | 现状 | 后端动作 |
|---|---|---|
| 当前文档 / 全库切换 | `buildStatsSnapshot(scope)` 已有 | 无 |
| 「开始统计」 | 已有 | 无 |
| 「修复全库S3链接 / 修复S3链接」 | `uploadAllNotes({repairOnly})` 已有 | 无 |
| 「上传全库本地图片 / 上传本地图片」 | 有全库上传，但**会把网络图一起传**（见 §5.2） | **扩展**：显式 `sourceTypes` |
| 导出 CSV | 已有 JSON/CSV | 无 |
| 「文档 N 篇（含图 M 篇）· 资源文件 N · 题头图资源 N」 | `scan.docs.length`（未进 `ScanStats`）、`stats.docs`、`assetFiles`、`titleAssets` | **扩展**：`ScanStats.totalDocs` |
| 10 张 KPI 卡 | 已全部实现（现状 UI 与设计几乎一致） | 无 |
| 7 个筛选 chip + 计数 | 已有 | 无 |
| 搜索「文档、地址或描述」 | 已搜索 docTitle/docPath/url/alt/s3Key/assetPath | 无 |
| 卡片「jfif / 142 KB」扩展名与尺寸 | `ImageRef` 无 size/ext | **新增** 资源元数据索引（§3.2） |
| 卡片「块: xxx」 | `ref.blockId` | 无 |
| 卡片状态（未替换/已同步/外部网络图源） | `isUploadedButNotReplaced` + sourceType | 无 |
| 操作：复制路径 / 立即上传 / 复制MD链接 / 复制链接 / 转存至S3 / 重新上传 | `uploadSingleRef`、`force`、`repairOnly` 已有 | 无（复制是前端） |
| 多选 + 选中批量操作 | 无 | **新增** 选中子集上传接口（§3.5） |

### 2.3 上传页

| 设计元素 | 现状 | 后端动作 |
|---|---|---|
| 文档标题 / ID / 扫描时间 / 扫描耗时 | `ScanDocResult.doc` + `durationMs` | 无（耗时目前 UI 未展示） |
| 顶部 chip：本地 / S3 已同步 / 网络外链 / 总数 / 唯一 / 扫描耗时 | `ScanStats` 已有 | 无 |
| 「同步进度 14 / 14（100%）」 | 现为任务进度条 | **待确认**语义（§5.4） |
| 「快速添加图片」拖拽 / 点击 / Ctrl+V → 待上传队列 | **完全没有**（只有文档内粘贴） | **新增** 独立上传 + 粘贴路由（§3.4、§3.7） |
| 「上传本地图片」 | 目前受 `includeRemoteImages` 控制 | **扩展** 仅本地 |
| 「强制重新上传」 | `force` 已有 | 无 |
| 「替换为S3链接 (7)」计数 | 能力已有，但**没有单文档待修复计数** | **扩展** 每文档 pending 计数 |
| 卡片缩略图 | 已有 `previewUrl()` | 无 |
| 卡片文件名 / S3 key / 块 ID / 大小 / 已替换徽章 | 缺 size/ext | **新增** 资源元数据（S3 侧走 HEAD 或反查本地资源） |
| 操作：复制链接 / 复制MD链接 / 重新上传 | 已有 | 无 |

### 2.4 同步页

| 设计元素 | 现状 | 后端动作 |
|---|---|---|
| 重新扫描 / 导出 CSV / 清除按钮(1049) | 已有 | 无 |
| 说明文案（前缀、`_pigo_test/` 保护、不可恢复） | 规则已有 | 无 |
| 扫描元信息：笔记数 / S3 对象数 / 前缀 | `scan.docs.length`、`objects.length`、`report.prefix` | **扩展**：报告内补 `docCount`、`totalObjects`、`reclaimableBytes` |
| 5 张分类卡 | 已有 | 无 |
| 5 个筛选 chip + 搜索 | 已有 | 无 |
| 行内：key / URL / 大小 / 修改时间 / ext / 「未被笔记引用」 | `S3ObjectInfo` 全有 | 无 |
| 行内「复制 key / 复制链接」 | 前端 | 无 |
| 清理弹窗：前缀、保护目录、总量、**预计释放空间 ~186.4 MB**、勾选确认 | 只有 `window.confirm` + 输入 DELETE | **新增** 清理计划对象（含字节数）+ 删除前复核（§3.6） |

### 2.5 设置页

| 设计元素 | 现状 | 后端动作 |
|---|---|---|
| 粘贴自动上传 / 上传后替换链接 两个开关 | 配置项已有，但 **`replaceLink` 从未被读取** | **修正**（§5.2） |
| 手风琴摘要「Tencent COS (ap-guangzhou)」 | 无 | 复用 `describeStorage()` |
| 手风琴摘要「并发: 4 \| 过滤网络图: 否」 | 可由 `concurrency` + `!includeRemoteImages` 推导 | 无（建议统一命名，见 §5.5） |
| 手风琴摘要「共 6 条」+ 日志复制/清空 | `log.ts` 已有 | 无 |
| S3 表单（Endpoint/Region/Bucket/AK/SK/路径/CustomUrl/额外前缀/ACL/超时/PathStyle/代理） | 全部已有 | 无 |
| 显示密钥 / 导入旧 PicGo 配置 / 测试连接 / 恢复默认 / 保存 | 全部已有 | 无 |
| 详细行为（混合粘贴、包含题头图、包含网络图、跳过已上传、并发、调试日志） | 配置项全部已有 | 无（`skipIfAlreadyS3` 未接入，见 §5.2） |

---

## 3. 需要新增的后端模块

### 3.1 `src/core/s3/describe.ts` — 存储显示名（纯函数）

```ts
export interface StorageDescriptor {
  vendor: string      // 'Tencent COS' | 'AWS S3' | 'Aliyun OSS' | 'MinIO' | 'S3 兼容存储'
  region: string
  label: string       // 'Tencent COS (ap-guangzhou)'
}
export function describeStorage(s3: S3Config): StorageDescriptor
```

- 依据 endpoint host（`myqcloud.com` / `aliyuncs.com` / `amazonaws.com` / `myhuaweicloud.com` / 本地或 IP → MinIO）。
- 需要单测：`tests/describe.test.mjs`。

### 3.2 `src/core/stats/assetMeta.ts` — 本地资源尺寸 / 扩展名

**实测结论（2026-11-09，内核 3.8.9）：**

```
pragma table_info(assets) → id, block_id, root_id, box, docpath, path, name, title, hash
```

`assets` 表**没有 `size` / `ext` / `hw`**（新版本已移除），`/api/file/readDir` 只返回 `name/isDir/isSymlink/updated`。
但 `/assets/<name>` 支持 `Range`：

```
GET /assets/xxx.png  Range: bytes=0-0
→ 206 Partial Content, Content-Range: bytes 0-0/43461
```

所以尺寸必须“现取”：

```ts
export interface AssetMeta { size?: number, ext?: string, fileName: string }
export async function readAssetMeta(assetPath: string): Promise<AssetMeta>
export function createAssetMetaCache(concurrency = 4): {
  get(assetPath: string): Promise<AssetMeta>   // 缓存 + 去重 + 失败不重试
  preload(paths: string[]): void               // 可选：可视区懒加载
}
```

- ext 从文件名取（`jfif/webp` 直接可用）。
- S3 图片的尺寸取值优先级：`fileMap.originUrl → 本地 assets（Range GET）` → 失败再 `S3 headObject` → 再失败显示 `—`。
- 统计页 2000+ 唯一图**不能全量 HEAD**：只在卡片进入可视区时懒取（每页 300 张以内）。
- 单测只需覆盖纯函数部分（文件名解析、Content-Range 解析）。

### 3.3 `src/core/s3/health.ts` — 只读健康检查

```ts
export interface S3Health { state: 'ok' | 'error' | 'unknown', latencyMs?: number, message?: string, checkedAt: number }
export async function checkS3Health(s3: S3Config): Promise<S3Health>   // listObjectsV2 maxKeys=1
export const healthStore: { get(): S3Health | null, refresh(config): Promise<S3Health> }
```

- 与 `testS3Connection` 区分：**不写测试对象、不留垃圾**，用于面板每次打开 / 切到统计、同步页时点亮绿点。
- 缓存 60s；配置变更（endpoint/bucket/ak）时失效。
- 超时沿用 `s3.timeoutMs`，失败不抛异常，只置 `error`。

### 3.4 `src/core/upload/standalone.ts` — 面板内独立上传

```ts
export interface StandaloneUploadItem { file: File, name: string, size: number, status: 'pending'|'uploading'|'done'|'error', url?: string, error?: string }
export async function uploadFilesToS3(files: File[], config: PigoConfig, options: {
  concurrency?: number
  isCancelled?: () => boolean
  onProgress?: (item: StandaloneUploadItem, index: number) => void
}): Promise<{ files: PastedFileResult[], errors: string[] }>
```

- 复用 `buildObjectKey` / `runWithConcurrency` / `detectImageContentType` / `createS3Client`。
- **不写 fileMap、不改文档**（设计稿只显示“待上传到 S3”）。
- 建议顺手把 `PasteUploadTransaction` 里重复的上传代码抽到这里，粘贴流程只保留“插入块”部分。
- 队列、取消、重试都在前端；后端只提供批量上传函数。

### 3.5 `src/core/upload/selection.ts` — 选中子集批量

```ts
export async function uploadSelectedRefs(
  scan: ScanDocResult | ScanAllResult,
  refs: ImageRef[],
  config: PigoConfig,
  options: PipelineOptions
): Promise<PipelineResult>
```

- `pipeline.execute` 现在接收的是 `filterRefs(...)` 的结果，只要把 `selected` 暴露成参数即可，无需重写上传逻辑。
- 统计页“当前已选中 N 项”的批量上传 / 复制 / 修复都走这个入口。
- 注意：修复（`repairOnly`）不产生新对象，`applyUploadResults` 的 fileMap 写入逻辑要保留。

### 3.6 `src/core/sync/cleanupPlan.ts` — 清理计划与删除前复核

```ts
export interface CleanupPlan {
  keys: string[]
  count: number
  bytes: number                 // 预计释放空间
  prefix: string
  protectedPrefix: string       // `${prefix}_pigo_test/`
  snapshotEtags: Map<string, string>
  testObjects: number
  folderMarkers: number
}
export function buildCleanupPlan(report: SyncReport): CleanupPlan
export async function revalidatePlan(plan, head: (key) => Promise<{ exists: boolean, etag?: string }>): Promise<{ keys: string[], skipped: Array<{key: string, reason: string}> }>
```

- `bytes` = `cleanupCandidates.reduce(size)`，弹窗里的“预计释放空间 ~186.4 MB”直接来自这里。
- `revalidatePlan`：删除前 HEAD 一遍，`ETag`/`LastModified` 与扫描快照不一致的对象跳过（防止扫描后又被重新上传/覆盖）。
- 现有安全规则（前缀内、非 `_pigo_test/`、非文件夹占位、非引用）保持不变。

### 3.7 粘贴路由（`src/index.ts` / `PasteEventAdapter`）

- 现在 `paste` 是全局 `CustomEvent`，插件不区分焦点位置：**面板内按 Ctrl+V 会被当成文档粘贴**，图片会被写进 SiYuan 的 assets 并插入正文。
- 需要：当 `event.detail.source` / `event.target` 位于 `.pigo-popup` 内时，走 `uploadFilesToS3`（§3.4），并阻止文档粘贴。
- 同时保留“文档内粘贴 → 上传并替换/插入”的原行为。
- 这是唯一会触碰事件层的后端改动，务必加单测（纯判断函数 `isPigoPanelPaste(target)`）。

---

## 4. 需要扩展的数据模型

```ts
// scan/types.ts
interface ImageRef {
  // 新增（全部可选，避免破坏现有测试）
  size?: number
  ext?: string
  fileName?: string
  pendingS3Url?: string          // fileMap 里已存在的 S3 地址（用于“替换为S3链接”）
  isReplaced?: boolean           // s3 且与当前 customUrl 匹配
}

interface ScanStats {
  totalDocs: number              // 971（文档总数）
  // docs 保持“含图文档数”
  // assetFiles / titleAssets 保持
}
```

```ts
// sync/report.ts
interface SyncSummary {
  matched, onlyS3, onlySiyuan, notUploaded, outsidePrefix, ignored  // 已有
  docCount: number               // 笔记 969 篇
  totalObjects: number           // S3 对象 3936 个
  totalBytes: number
  reclaimableBytes: number       // 预计释放空间
}
```

其它：

- `ScanDocResult.durationMs`、`ScanAllResult.durationMs` 已有，上传页“扫描耗时”直接可用。
- `SyncSnapshot` 增加 `docCount` 或直接由 `scan.docs.length` 提供，前端二选一，建议进 summary，便于导出。
- 配置：若确认「自动监控」独立，则 `BehaviorConfig.autoMonitor` + `mergeConfig` 兼容；否则不加字段。

---

## 5. 需要修正的现有行为（设计稿会暴露的问题）

### 5.1 「自动监控」语义（待确认）

- 设计稿同时在**顶栏**（自动监控）和**设置页**（粘贴图片时自动上传）出现，且上传页提示“截图后想自动识别？开启右上角「自动监控」”。
- 现状只有 `autoUploadOnPaste` 一个开关。
- 建议：**顶栏开关直接绑定 `autoUploadOnPaste`**，两处联动，不新增字段。
  真正的“后台剪贴板监控”在浏览器/Electron 里需要轮询 `navigator.clipboard.read()`，打扰大且各平台权限不同，不建议做。

### 5.2 两个“假开关”

实测 `grep` 结果：

- `behavior.replaceLink`：只在 `config.ts` 和设置页出现，**上传管线从未读取**，即无论开关如何都会替换文档链接。
- `behavior.skipIfAlreadyS3`：只在 `upload/types.ts` 类型里出现，`uploader.ts` 用的是 `options.force`。

新设置页把这两个开关摆在显眼位置，必须让它们真正生效：

1. `applyUploadResults` 拆成：
   - `saveUploadRecords()`（总是写 fileMap）
   - `replaceDocLinks()`（仅 `replaceLink === true`）
2. `uploader` 用 `config.behavior.skipIfAlreadyS3` 作为默认 `!force` 判断。
3. 关掉“替换链接”时，上传完成后 UI 需要提示“已上传但未替换，可稍后点『替换为S3链接』”。

### 5.3 「上传本地图片」的语义

现状 `filterRefs()` 只看 `includeTitleImage` / `includeRemoteImages`（默认都 true），所以“上传本地图片”实际会连网络图一起传。
设计稿把“本地 0 / 网络外链 0”分开统计，按钮也叫“上传本地图片”，需要：

```ts
interface PipelineOptions {
  sourceTypes?: ImageSourceType[]   // ['local'] | ['local','title'] | ['local','remote','title']
}
```

- 「上传本地图片」→ `['local','title']`（题头图默认算本地）
- 「上传全部」→ `['local','remote','title','data']`
- 全库按钮同语义。

### 5.4 上传页「同步进度 14 / 14（100%）」

- 设计稿 18 张唯一图、14/14 完成，语义不清（上一次任务？已替换数？）。
- 建议：`已替换 + 已同步 / 可同步总数`，即 `s3 与 fileMap 已对齐的数量 / (unique - data)`，任务运行中则显示实时进度。
- 需要在前端定义；后端只需提供 `pendingCount` 与 `stats`，不需要新模块。

### 5.5 「过滤网络图: 否」

- 由 `!includeRemoteImages` 推导，摘要文案与设置项要统一（避免出现“过滤网络图”和“包含网络图片”两个反义说法）。
- 不新增字段，只在前端做映射。

### 5.6 快照失效

- 统计 / 同步快照目前只在切换 tab、切文档时按需刷新。
- 修改 S3 配置（Endpoint/CustomUrl/前缀/额外 URL 前缀）后，旧的 S3 分类、前缀保护、清理候选全部失真。
- 需要：`configStore` 保存成功后 `bumpConfigRevision()`，统计 / 同步 / 健康检查监听 revision 失效缓存。
- 删除 / 上传完成后已有重新扫描逻辑，保留。

### 5.7 清理候选的“二次保护”

- 现状：扫描 → 用户确认 → 直接按 key 删除。
- 风险：扫描与删除之间，若用户又上传了同名对象（`{md5}` 模板下可能覆盖），或被其它客户端改动，会误删新内容。
- 建议：删除前 `revalidatePlan`（§3.6），ETag 不一致就跳过并在结果里报告。

### 5.8 其它小项

- `countAssetFiles()` 在 doc 作用域也查全库资源数（设计稿确实展示全库 1121），保留即可；但每次统计 2 条 SQL，可与 `loadDocFileMaps()` 并行（已并行）。
- `dedupeRefs` 按 normalizedUrl 去重会丢掉“同时作为题头图和正文图”的重复项，导致 `题头图` 计数偏小；如需精确，改为按 `(url, kind)` 去重并单独给“唯一 URL”计数 —— 这会改变现有 KPI 语义，建议**不动**，仅在文档中注明。
- 统计页 `题头图资源` 来自 `assets.title='title-img'`（实测 100），与 `题头图 281` 不是一个概念，UI 需要文案区分（设计稿已区分）。

---

## 6. 纯前端改动（无需后端）

- 四个页面的视觉重写（卡片网格、chip、手风琴、弹窗、进度条、徽章、图标、暗色变量）
- 统计页多选交互与批量工具条
- 同步页清理弹窗（勾选确认 + 预计空间展示）
- 设置页手风琴展开状态、密钥显示、并发滑杆
- 顶栏拖拽 / 置顶 / 关闭行为、页脚状态栏
- 复制路径、复制 Markdown 链接、复制 key
- 导出 CSV 的按钮样式

---

## 7. 建议实施顺序

| 阶段 | 内容 | 交付物 |
|---|---|---|
| P0（无 UI） | `describe.ts`、`health.ts`、`assetMeta.ts`、数据模型扩展 | 4 个模块 + 单测 |
| P1 | `standalone.ts` + 粘贴路由 + `selection.ts` + `sourceTypes` + 每文档 pending 计数 | 上传能力补齐 |
| P2 | `cleanupPlan.ts`（字节数 + 复核）+ `replaceLink` / `skipIfAlreadyS3` 修正 + 快照失效 | 安全与一致性 |
| P3 | 按设计稿重写 4 个 Tab + 顶栏 / 页脚 | UI 对齐 |

每个阶段独立可测；P0/P1/P2 完成前不动 UI，避免样式问题掩盖数据问题。

---

## 8. 验证清单

**Node 单测（新增）**

- `describeStorage`：腾讯云 / AWS / 阿里云 / MinIO / 未知端点
- `parseContentRange`、`extensionOf`、`buildCleanupPlan`（字节数、保护目录、过滤文件夹占位）
- `revalidatePlan`：ETag 一致删除、不一致跳过
- `filterRefs` 的 `sourceTypes`
- `isPigoPanelPaste`

**真机（token `glbu1bcm7uueheu9`，已验证基线）**

- 文档 969 篇、assets 1121、`title-img` 100
- `Range: bytes=0-0` 取 `Content-Range` 尺寸（43461）
- `listObjectsV2 maxKeys=1` 健康检查 < 1s
- 清理 dry-run：只读生成 plan，核对 count/bytes 与现有报告一致
- 全库统计耗时仍在 1s 量级（加 1 条 assets SQL + 懒加载尺寸）

**构建**

- `node --experimental-strip-types --test tests/*.test.mjs`
- `node_modules/.bin/tsc --noEmit -p tsconfig.json`
- `node_modules/.bin/vite build`

---

## 9. 待你确认的 5 个问题

1. 「自动监控」= 现有 `autoUploadOnPaste`（推荐），还是要真正后台轮询剪贴板？
2. 统计页多选后需要哪些批量操作（上传 / 复制 / 修复 / 清除）？
3. 「置顶面板」是否只要求“保持最上层 + 点空白不关闭”（浏览器层可行），还是必须 Electron 原生 always-on-top？
4. 上传页「同步进度 14/14」采用哪种口径（已同步/可同步 vs 上次任务进度）？
5. 清理弹窗是否保留“输入 DELETE”第二道关？建议：勾选 + 展示前缀/数量/空间 + 输入确认二选一。
