<template>
  <div class="pigo-sync">
    <div class="pigo-sync__toolbar">
      <div class="pigo-sync__actions">
        <button class="b3-button b3-button--outline" type="button" :disabled="running" @click="scan">
          {{ running && isScanPhase ? '扫描中…' : (snapshot ? '重新扫描' : '扫描并对比') }}
        </button>
        <button v-if="running" class="b3-button b3-button--outline" type="button" @click="cancel">
          取消
        </button>
        <button
          class="b3-button b3-button--outline"
          type="button"
          :disabled="!snapshot || running"
          @click="exportJson"
        >
          导出 JSON
        </button>
        <button
          class="b3-button b3-button--outline"
          type="button"
          :disabled="!snapshot || running"
          @click="exportCsv"
        >
          导出 CSV
        </button>
      </div>

      <button
        class="b3-button pigo-sync__danger"
        type="button"
        :disabled="running || cleanupCandidates.length === 0"
        @click="handleCleanup"
      >
        清除 S3 多余图片（{{ cleanupCandidates.length }}）
      </button>
    </div>

    <div class="pigo-sync__safety">
      同步会扫描<strong>全部笔记</strong>和<strong>整个存储桶</strong>。清理只删除“仅 S3 存在、在上传前缀内、且不属于 _pigo_test/”的对象，删除后不可恢复。
    </div>

    <div v-if="progress" class="pigo-sync__progress">
      <div class="pigo-sync__progress-head">
        <span>{{ phaseLabel }}</span>
        <span v-if="progress.total > 0">{{ progress.done }} / {{ progress.total }}</span>
      </div>
      <div class="pigo-sync__progress-bar">
        <div class="pigo-sync__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <div v-if="progress.current" class="pigo-sync__progress-current">
        {{ progress.current }}
      </div>
    </div>

    <div v-if="notice" class="pigo-sync__notice">
      {{ notice }}
    </div>

    <div v-if="snapshot" class="pigo-sync__meta">
      <span>扫描于 {{ scannedAtText }}</span>
      <span>耗时 {{ snapshot.durationMs }} ms</span>
      <span>笔记 {{ snapshot.scan.docs.length }} 篇</span>
      <span>S3 对象 {{ snapshot.objects.length }} 个</span>
      <span>上传前缀 <code>{{ snapshot.prefix || '（空：整个桶）' }}</code></span>
    </div>

    <div v-if="snapshot && !snapshot.prefix" class="pigo-sync__warning">
      上传前缀为空，清理范围将覆盖整个存储桶，风险极高。建议先在设置中配置 `uploadPath`（例如 `siyuan/`）后再同步。
    </div>

    <div v-if="lastCleanup" class="pigo-sync__result">
      上次清理：删除 {{ lastCleanup.deleted }} 个，失败 {{ lastCleanup.failed.length }} 个
      <span v-if="lastCleanup.cancelled">（已取消）</span>
      <details v-if="lastCleanup.failed.length > 0">
        <summary>查看失败项</summary>
        <ul>
          <li v-for="item in lastCleanup.failed" :key="item.key || item.message">
            {{ item.key || '(未知 key)' }}：{{ item.message || item.code || '删除失败' }}
          </li>
        </ul>
      </details>
    </div>

    <div v-if="snapshot" class="pigo-sync__cards">
      <button
        v-for="card in cards"
        :key="card.category"
        class="pigo-sync__card"
        :class="[card.className, { 'pigo-sync__card--active': activeCategory === card.category }]"
        type="button"
        @click="activeCategory = card.category"
      >
        <div class="pigo-sync__card-value">
          {{ card.value }}
        </div>
        <div class="pigo-sync__card-label">
          {{ card.label }}
        </div>
      </button>
    </div>

    <div v-if="!snapshot && !running" class="pigo-sync__empty">
      <div class="pigo-sync__empty-title">
        还没有同步报告
      </div>
      <div class="pigo-sync__empty-desc">
        点击“扫描并对比”，读取全部笔记引用和 S3 对象，生成双向匹配报告。首次扫描对象较多时可能需要等待。
      </div>
    </div>

    <template v-if="snapshot">
      <div class="pigo-sync__list-head">
        <div class="pigo-sync__filters">
          <button
            v-for="filter in filters"
            :key="filter.id"
            class="pigo-sync__filter"
            :class="{ 'pigo-sync__filter--active': activeCategory === filter.id }"
            type="button"
            @click="activeCategory = filter.id"
          >
            {{ filter.label }}
            <span class="pigo-sync__filter-count">{{ filter.count }}</span>
          </button>
        </div>
        <input
          v-model="searchText"
          class="b3-text-field pigo-sync__search"
          type="search"
          placeholder="搜索 key、地址或文档"
        >
      </div>

      <div v-if="filteredRows.length === 0" class="pigo-sync__empty pigo-sync__empty--small">
        当前分类没有记录。
      </div>

      <div v-else class="pigo-sync__list">
        <div v-for="row in visibleRows" :key="row.id" class="pigo-sync__row">
          <div class="pigo-sync__row-main">
            <div class="pigo-sync__row-title" :title="row.title">
              {{ row.title }}
            </div>
            <div class="pigo-sync__row-url" :title="row.url">
              {{ row.url || '-' }}
            </div>
            <div class="pigo-sync__row-meta">
              {{ row.meta }}
            </div>
          </div>
          <div class="pigo-sync__row-actions">
            <button v-if="row.key" class="b3-button b3-button--text" type="button" @click="copyText(row.key)">
              复制 key
            </button>
            <button v-if="row.url" class="b3-button b3-button--text" type="button" @click="copyText(row.url)">
              复制链接
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredRows.length > visibleLimit" class="pigo-sync__more">
        <button class="b3-button b3-button--outline" type="button" @click="visibleLimit += 300">
          加载更多（{{ filteredRows.length - visibleLimit }}）
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import { ensureConfigLoaded, ensureConfigReady, usePigoConfigStore } from '@/core/configStore'
import { toUserMessage } from '@/core/errors'
import { logError, logInfo } from '@/core/log'
import { buildPublicUrl } from '@/core/s3/url'
import type { S3DeleteError } from '@/core/s3/xml'
import { downloadTextFile, exportFileName } from '@/core/stats/export'
import { updateStatusBar } from '@/core/statusBar'
import { buildSyncCsv, buildSyncJson } from '@/core/sync/export'
import { isSafeCleanupKey } from '@/core/sync/report'
import {
  buildSyncSnapshot,
  cleanupSyncObjects,
  type SyncSnapshot,
} from '@/core/sync/service'
import { uiState } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin
}>()

type CategoryId = 'onlyS3' | 'onlySiyuan' | 'notUploaded' | 'matched' | 'outsidePrefix'

interface SyncRow {
  id: string
  category: CategoryId
  key: string
  url: string
  title: string
  meta: string
}

interface SyncProgressState {
  phase: 'scanning' | 'listing' | 'comparing' | 'protecting' | 'deleting'
  done: number
  total: number
  current?: string
  objects?: number
}

const store = usePigoConfigStore()

const snapshot = ref<SyncSnapshot | null>(null)
const running = ref(false)
const progress = ref<SyncProgressState | null>(null)
const notice = ref('')
const activeCategory = ref<CategoryId>('onlyS3')
const searchText = ref('')
const visibleLimit = ref(300)
const lastCleanup = ref<{ deleted: number, failed: S3DeleteError[], cancelled: boolean } | null>(null)

let cancelRequested = false
let noticeTimer: number | undefined

const isScanPhase = computed(() => progress.value?.phase === 'scanning' || progress.value?.phase === 'listing')

const cleanupCandidates = computed(() => {
  if (!snapshot.value) {
    return []
  }
  return snapshot.value.report.cleanupCandidates.filter((object) => (
    isSafeCleanupKey(object.key, snapshot.value?.report.prefix || '')
  ))
})

const scannedAtText = computed(() => {
  if (!snapshot.value) {
    return ''
  }
  return new Date(snapshot.value.scannedAt).toLocaleString()
})

const phaseLabel = computed(() => {
  switch (progress.value?.phase) {
    case 'scanning':
      return '扫描全部笔记'
    case 'listing':
      return '读取 S3 对象列表'
    case 'comparing':
      return '对比引用关系'
    case 'protecting':
      return '读取笔记原文（保护链接）'
    case 'deleting':
      return '删除 S3 多余图片'
    default:
      return ''
  }
})

const progressPercent = computed(() => {
  if (!progress.value || progress.value.total <= 0) {
    return 0
  }
  return Math.min(100, Math.round((progress.value.done / progress.value.total) * 100))
})

const cards = computed(() => {
  const summary = snapshot.value?.report.summary
  if (!summary) {
    return []
  }

  return [
    { category: 'matched' as CategoryId, label: '双向匹配', value: summary.matched, className: 'pigo-sync__card--success' },
    { category: 'onlyS3' as CategoryId, label: '仅 S3 存在', value: summary.onlyS3, className: 'pigo-sync__card--warning' },
    { category: 'onlySiyuan' as CategoryId, label: '仅思源存在（失效）', value: summary.onlySiyuan, className: 'pigo-sync__card--danger' },
    { category: 'notUploaded' as CategoryId, label: '未上传', value: summary.notUploaded, className: '' },
    { category: 'outsidePrefix' as CategoryId, label: '前缀外对象', value: summary.outsidePrefix, className: '' },
  ]
})

const filters = computed(() => {
  const summary = snapshot.value?.report.summary
  if (!summary) {
    return []
  }

  return [
    { id: 'onlyS3' as CategoryId, label: '仅 S3', count: summary.onlyS3 },
    { id: 'onlySiyuan' as CategoryId, label: '仅思源/失效', count: summary.onlySiyuan },
    { id: 'notUploaded' as CategoryId, label: '未上传', count: summary.notUploaded },
    { id: 'matched' as CategoryId, label: '双向匹配', count: summary.matched },
    { id: 'outsidePrefix' as CategoryId, label: '前缀外', count: summary.outsidePrefix },
  ]
})

const categoryRows = computed<SyncRow[]>(() => {
  const current = snapshot.value
  if (!current) {
    return []
  }

  const report = current.report
  const config = store.config

  switch (activeCategory.value) {
    case 'matched':
      return report.matched.map((entry) => {
        const docs = new Set(entry.refs.map((ref) => ref.docId))
        return {
          id: `matched:${entry.key}`,
          category: 'matched',
          key: entry.key,
          url: buildPublicUrl(config.s3, entry.key),
          title: entry.key,
          meta: `${docs.size} 篇文档 / ${entry.refs.length} 处引用 · ${matchSourceLabel(entry.sources)} · ${formatSize(entry.object.size)} · ${entry.object.lastModified || '未知时间'}`,
        }
      })

    case 'onlySiyuan':
      return report.onlySiyuan.flatMap((entry) => entry.refs.map((ref) => ({
        id: `missing:${entry.key}:${ref.id}`,
        category: 'onlySiyuan' as CategoryId,
        key: entry.key,
        url: ref.url,
        title: ref.docTitle || ref.docId,
        meta: `${ref.docPath || ''} · 块 ${ref.blockId} · ${ref.kind === 'title' ? '题头图' : '正文'} · S3 对象不存在`,
      })))

    case 'notUploaded':
      return report.notUploaded.map((ref) => ({
        id: `not-uploaded:${ref.id}`,
        category: 'notUploaded',
        key: '',
        url: ref.url,
        title: ref.docTitle || ref.docId,
        meta: `${ref.docPath || ''} · 块 ${ref.blockId} · ${sourceLabel(ref.sourceType)} · ${ref.kind === 'title' ? '题头图' : '正文'}`,
      }))

    case 'outsidePrefix':
      return report.outsidePrefix.map((object) => ({
        id: `outside:${object.key}`,
        category: 'outsidePrefix',
        key: object.key,
        url: buildPublicUrl(config.s3, object.key),
        title: object.key,
        meta: `${formatSize(object.size)} · ${object.lastModified || '未知时间'} · 前缀外，不参与清理`,
      }))

    default:
      return report.onlyS3.map((object) => ({
        id: `orphan:${object.key}`,
        category: 'onlyS3',
        key: object.key,
        url: buildPublicUrl(config.s3, object.key),
        title: object.key,
        meta: `${formatSize(object.size)} · ${object.lastModified || '未知时间'}`,
      }))
  }
})

const filteredRows = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) {
    return categoryRows.value
  }

  return categoryRows.value.filter((row) => (
    row.key.toLowerCase().includes(keyword)
    || row.url.toLowerCase().includes(keyword)
    || row.title.toLowerCase().includes(keyword)
    || row.meta.toLowerCase().includes(keyword)
  ))
})

const visibleRows = computed(() => filteredRows.value.slice(0, visibleLimit.value))

watch([activeCategory, searchText], () => {
  visibleLimit.value = 300
})

onBeforeUnmount(() => {
  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }
})

async function scan(): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  if (!(await ensureSyncReady())) {
    return
  }

  running.value = true
  cancelRequested = false
  progress.value = { phase: 'scanning', done: 0, total: 0 }
  notice.value = ''
  updateStatusBar('正在同步 S3 与笔记…')

  try {
    const next = await buildSyncSnapshot(store.config, {
      isCancelled: () => cancelRequested,
      onProgress: (value) => {
        progress.value = {
          phase: value.phase === 'done' ? 'comparing' : value.phase,
          done: value.done,
          total: value.total,
          current: value.current,
          objects: value.objects,
        }
      },
    })

    snapshot.value = next
    activeCategory.value = next.report.summary.onlyS3 > 0 ? 'onlyS3' : 'matched'
    searchText.value = ''
    visibleLimit.value = 300

    if (next.report.summary.onlySiyuan > 0) {
      showNotice(`同步完成：${next.report.summary.onlySiyuan} 个 S3 链接已失效，${next.report.summary.onlyS3} 个对象没有引用。`)
    }
    else {
      showNotice(`同步完成：双向匹配 ${next.report.summary.matched} 个，仅 S3 ${next.report.summary.onlyS3} 个。`)
    }
    updateStatusBar('同步完成')
  }
  catch (error) {
    if (cancelRequested) {
      showNotice('已取消同步，保留上次结果。')
      updateStatusBar('同步已取消')
    }
    else {
      const message = toUserMessage(error)
      logError('同步失败', error)
      showNotice(`同步失败：${message}`)
      updateStatusBar('同步失败')
    }
  }
  finally {
    running.value = false
    progress.value = null
  }
}

function cancel(): void {
  cancelRequested = true
  showNotice('正在停止…')
  updateStatusBar('正在停止同步…')
}

async function handleCleanup(): Promise<void> {
  if (!snapshot.value || running.value) {
    return
  }

  const candidates = cleanupCandidates.value
  if (candidates.length === 0) {
    return
  }

  const prefix = snapshot.value.report.prefix
  const preview = candidates.slice(0, 20).map((object) => `- ${object.key}`).join('\n')
  const prefixText = prefix || '（空前缀：整个桶）'
  const firstConfirm = window.confirm([
    `即将删除 ${candidates.length} 个“仅 S3 存在”的对象。`,
    `上传前缀：${prefixText}`,
    '',
    '前 20 个对象：',
    preview,
    '',
    '删除后不可恢复，请确认这些对象确实没有任何笔记引用。',
  ].join('\n'))

  if (!firstConfirm) {
    return
  }

  const typed = window.prompt(`请输入 DELETE 确认删除 ${candidates.length} 个对象`)
  if (typed !== 'DELETE') {
    showNotice('已取消：未输入 DELETE。')
    return
  }

  await ensureConfigLoaded(props.plugin)
  if (!(await ensureSyncReady())) {
    return
  }

  running.value = true
  cancelRequested = false
  progress.value = { phase: 'deleting', done: 0, total: candidates.length }
  updateStatusBar('正在删除 S3 多余图片…')

  try {
    const result = await cleanupSyncObjects(store.config, candidates.map((object) => object.key), {
      isCancelled: () => cancelRequested,
      onProgress: (value) => {
        progress.value = {
          phase: 'deleting',
          done: value.done,
          total: value.total,
          current: `第 ${value.batch}/${value.batchCount} 批`,
        }
      },
    })

    lastCleanup.value = {
      deleted: result.deleted,
      failed: result.failed,
      cancelled: result.cancelled,
    }

    logInfo(`S3 清理完成：删除 ${result.deleted} 个，失败 ${result.failed.length} 个${result.cancelled ? '，已取消' : ''}`)
    result.failed.slice(0, 10).forEach((item) => logError(`删除失败：${item.key || '(未知 key)'}`, item.message || item.code || ''))

    showNotice(result.cancelled
      ? `已停止删除，已删除 ${result.deleted} 个。`
      : `清理完成：删除 ${result.deleted} 个，失败 ${result.failed.length} 个。`)
    updateStatusBar('清理完成')
    running.value = false
    progress.value = null

    if (result.deleted > 0) {
      await scan()
    }
  }
  catch (error) {
    const message = toUserMessage(error)
    logError('S3 清理失败', error)
    showNotice(`清理失败：${message}。已删除的部分无法恢复，请重新扫描确认。`)
    updateStatusBar('清理失败')
  }
  finally {
    running.value = false
    progress.value = null
  }
}

async function ensureSyncReady(): Promise<boolean> {
  const ready = await ensureConfigReady(props.plugin)
  if (ready.ok) {
    return true
  }

  const message = ready.issues.map((issue) => issue.message).join('；')
  showNotice(`配置不完整：${message}`)
  uiState.activeTab = 'settings'
  return false
}

function exportJson(): void {
  if (!snapshot.value) {
    return
  }
  const text = buildSyncJson(snapshot.value, store.config)
  downloadTextFile(exportFileName('sync', 'json', snapshot.value.scannedAt), text, 'application/json')
  showNotice('JSON 已导出。')
}

function exportCsv(): void {
  if (!snapshot.value) {
    return
  }
  const text = buildSyncCsv(snapshot.value, store.config)
  downloadTextFile(exportFileName('sync', 'csv', snapshot.value.scannedAt), text, 'text/csv')
  showNotice('CSV 已导出。')
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    showNotice('已复制。')
  }
  catch {
    showNotice('复制失败，请手动复制。')
  }
}

function formatSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B'
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function matchSourceLabel(sources: string[]): string {
  const labels: Record<string, string> = {
    ref: '图片引用',
    fileMap: '上传记录',
    basename: '本地文件名',
    url: '链接提及',
  }
  const text = sources.map((source) => labels[source] || source).join('、')
  return text ? `依据：${text}` : '依据：未知'
}

function sourceLabel(sourceType: string): string {
  switch (sourceType) {
    case 'local':
      return '本地'
    case 'remote':
      return '网络'
    case 'data':
      return 'Data URI'
    default:
      return sourceType
  }
}

function showNotice(message: string): void {
  notice.value = message
  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }
  noticeTimer = window.setTimeout(() => {
    notice.value = ''
  }, 6000)
}
</script>

<style scoped>
.pigo-sync {
  padding: 14px 16px 28px;
  box-sizing: border-box;
}

.pigo-sync__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pigo-sync__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pigo-sync__danger {
  color: #fff;
  background: var(--b3-theme-error, #d23f31);
  border: 0;
}

.pigo-sync__danger:disabled {
  opacity: 0.5;
}

.pigo-sync__safety {
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--b3-theme-on-surface-light, #999);
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
  font-size: 12px;
  line-height: 1.7;
}

.pigo-sync__progress {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
  font-size: 12px;
}

.pigo-sync__progress-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--b3-theme-on-background, #dfe0e1);
  font-weight: 600;
}

.pigo-sync__progress-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
}

.pigo-sync__progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--b3-theme-primary, #3573f0);
  transition: width 0.2s ease;
}

.pigo-sync__progress-current {
  margin-top: 4px;
  overflow: hidden;
  color: var(--b3-theme-on-surface-light, #999);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-sync__notice {
  position: sticky;
  top: 0;
  z-index: 1;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--b3-theme-primary, #3573f0);
  background: var(--b3-theme-primary-lightest, rgba(53, 115, 240, 0.12));
  font-size: 12px;
  line-height: 1.6;
}

.pigo-sync__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 10px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
}

.pigo-sync__meta code {
  color: var(--b3-theme-on-surface, #c9c9c9);
}

.pigo-sync__warning {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--b3-theme-error, #d23f31);
  background: rgba(210, 63, 49, 0.12);
  font-size: 12px;
  line-height: 1.6;
}

.pigo-sync__result {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
  font-size: 12px;
  line-height: 1.7;
}

.pigo-sync__result ul {
  max-height: 160px;
  margin: 4px 0 0;
  padding-left: 18px;
  overflow: auto;
}

.pigo-sync__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.pigo-sync__card {
  padding: 9px 10px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  color: inherit;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
  cursor: pointer;
  text-align: left;
}

.pigo-sync__card--success {
  border-color: rgba(103, 194, 58, 0.3);
  background: rgba(103, 194, 58, 0.1);
}

.pigo-sync__card--warning {
  border-color: rgba(230, 162, 60, 0.32);
  background: rgba(230, 162, 60, 0.1);
}

.pigo-sync__card--danger {
  border-color: rgba(210, 63, 49, 0.32);
  background: rgba(210, 63, 49, 0.1);
}

.pigo-sync__card--active {
  outline: 2px solid var(--b3-theme-primary, #3573f0);
  outline-offset: -1px;
}

.pigo-sync__card-value {
  color: var(--b3-theme-on-background, #dfe0e1);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

.pigo-sync__card-label {
  margin-top: 2px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  font-size: 12px;
}

.pigo-sync__empty {
  padding: 40px 16px;
  text-align: center;
}

.pigo-sync__empty--small {
  padding: 20px 8px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 13px;
}

.pigo-sync__empty-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 600;
}

.pigo-sync__empty-desc {
  max-width: 540px;
  margin: 0 auto;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 13px;
  line-height: 1.7;
}

.pigo-sync__list-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pigo-sync__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pigo-sync__filter {
  padding: 3px 9px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.6;
}

.pigo-sync__filter--active {
  color: var(--b3-theme-primary, #3573f0);
  border-color: rgba(53, 115, 240, 0.4);
  background: rgba(53, 115, 240, 0.1);
}

.pigo-sync__filter-count {
  margin-left: 4px;
  color: var(--b3-theme-on-surface-light, #999);
}

.pigo-sync__search {
  width: 220px;
  height: 28px;
  font-size: 12px;
}

.pigo-sync__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pigo-sync__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
}

.pigo-sync__row-main {
  min-width: 0;
  flex: 1 1 auto;
}

.pigo-sync__row-title {
  overflow: hidden;
  color: var(--b3-theme-on-background, #dfe0e1);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-sync__row-url {
  margin-top: 2px;
  overflow: hidden;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-sync__row-meta {
  margin-top: 2px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 11px;
  line-height: 1.6;
}

.pigo-sync__row-actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.pigo-sync__more {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

@media (max-width: 640px) {
  .pigo-sync__search {
    width: 100%;
  }
}
</style>
