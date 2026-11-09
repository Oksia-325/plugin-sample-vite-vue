<template>
  <div class="pigo-stats">
    <div class="pigo-stats__toolbar">
      <div class="pigo-stats__scope">
        <button
          class="pigo-stats__scope-btn"
          :class="{ 'pigo-stats__scope-btn--active': scope === 'doc' }"
          type="button"
          :disabled="running"
          @click="switchScope('doc')"
        >
          当前文档
        </button>
        <button
          class="pigo-stats__scope-btn"
          :class="{ 'pigo-stats__scope-btn--active': scope === 'all' }"
          type="button"
          :disabled="running"
          @click="switchScope('all')"
        >
          全库
        </button>
      </div>

      <div class="pigo-stats__actions">
        <button class="b3-button b3-button--outline" type="button" :disabled="running" @click="scanStats(scope)">
          {{ running && progress?.phase === 'scanning' ? '扫描中…' : '开始统计' }}
        </button>
        <button v-if="running" class="b3-button b3-button--outline" type="button" @click="cancel">
          取消
        </button>
        <button
          class="b3-button b3-button--outline"
          type="button"
          :disabled="running || !snapshot"
          @click="handleRepair"
        >
          修复未替换链接
        </button>
        <button
          class="b3-button b3-button--outline"
          type="button"
          :disabled="running || !snapshot"
          @click="handleUploadUnuploaded"
        >
          上传未上传图片
        </button>
        <button class="b3-button b3-button--text" type="button" :disabled="!snapshot" @click="exportJson">
          导出 JSON
        </button>
        <button class="b3-button b3-button--text" type="button" :disabled="!snapshot" @click="exportCsv">
          导出 CSV
        </button>
      </div>
    </div>

    <div v-if="progress" class="pigo-stats__progress">
      <div class="pigo-stats__progress-head">
        <span>{{ phaseLabel }}</span>
        <span v-if="progress.total > 0">{{ progress.done }} / {{ progress.total }}</span>
      </div>
      <div class="pigo-stats__progress-bar">
        <div class="pigo-stats__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <div v-if="progress.current" class="pigo-stats__progress-current">
        {{ progress.current }}
      </div>
    </div>

    <div v-if="snapshot" class="pigo-stats__meta">
      <span>扫描于 {{ scannedAtText }}</span>
      <span>耗时 {{ snapshot.durationMs }} ms</span>
      <span v-if="snapshot.scope === 'all'">文档 {{ allDocs }} 篇（含图 {{ snapshot.stats.docs }} 篇）</span>
      <span v-else>文档：{{ currentDocTitle }}</span>
      <span>资源文件 {{ snapshot.stats.assetFiles }}</span>
      <span>题头图资源 {{ snapshot.stats.titleAssets }}</span>
    </div>

    <div v-if="warning" class="pigo-stats__warning">
      {{ warning }}
    </div>

    <div v-if="notice" class="pigo-stats__notice">
      {{ notice }}
    </div>

    <div v-if="stats" class="pigo-stats__cards">
      <div v-for="card in cards" :key="card.key" class="pigo-stats__card" :class="card.className">
        <div class="pigo-stats__card-value">
          {{ card.value }}
        </div>
        <div class="pigo-stats__card-label">
          {{ card.label }}
        </div>
        <div v-if="card.hint" class="pigo-stats__card-hint">
          {{ card.hint }}
        </div>
      </div>
    </div>

    <div v-if="!snapshot && !running" class="pigo-stats__empty">
      <div class="pigo-stats__empty-title">
        还没有统计数据
      </div>
      <div class="pigo-stats__empty-desc">
        选择“当前文档”或“全库”，然后点击“开始统计”。全库统计会读取所有笔记的图片引用，通常几秒内完成。
      </div>
    </div>

    <template v-if="snapshot">
      <div class="pigo-stats__list-head">
        <div class="pigo-stats__filters">
          <button
            v-for="filter in filters"
            :key="filter.id"
            class="pigo-stats__filter"
            :class="{ 'pigo-stats__filter--active': activeFilter === filter.id }"
            type="button"
            @click="activeFilter = filter.id"
          >
            {{ filter.label }}
            <span class="pigo-stats__filter-count">{{ filter.count }}</span>
          </button>
        </div>
        <input
          v-model="searchText"
          class="b3-text-field pigo-stats__search"
          type="search"
          placeholder="搜索文档、地址或描述"
        >
      </div>

      <div v-if="filteredRefs.length === 0" class="pigo-stats__empty pigo-stats__empty--small">
        当前筛选没有匹配的图片。
      </div>

      <div v-else class="pigo-stats__list">
        <div v-for="ref in visibleRefs" :key="ref.id" class="pigo-stats__row">
          <div class="pigo-stats__row-main">
            <div class="pigo-stats__row-badges">
              <span class="pigo-stats__badge" :class="sourceClass(ref)">{{ sourceLabel(ref) }}</span>
              <span v-if="ref.kind === 'title'" class="pigo-stats__badge pigo-stats__badge--title">题头图</span>
              <span
                v-if="isUploadedButNotReplaced(ref)"
                class="pigo-stats__badge pigo-stats__badge--pending"
              >
                已上传未替换
              </span>
            </div>
            <div class="pigo-stats__row-doc" :title="ref.docPath">
              {{ ref.docTitle || ref.docId }}
            </div>
            <div class="pigo-stats__row-url" :title="ref.url">
              {{ displayUrl(ref.url) }}
            </div>
            <div class="pigo-stats__row-meta">
              <span>块 {{ ref.blockId }}</span>
              <span v-if="ref.s3Key">Key {{ ref.s3Key }}</span>
              <span v-if="ref.assetPath">文件 {{ ref.assetPath }}</span>
            </div>
          </div>
          <button class="b3-button b3-button--text pigo-stats__copy" type="button" @click="copyUrl(ref.url)">
            复制
          </button>
        </div>
      </div>

      <div v-if="filteredRefs.length > visibleLimit" class="pigo-stats__more">
        <button class="b3-button b3-button--outline" type="button" @click="visibleLimit += 300">
          加载更多（{{ filteredRefs.length - visibleLimit }}）
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import { getActiveDocId, subscribeActiveDoc } from '@/core/activeDoc'
import { ensureConfigLoaded, usePigoConfigStore } from '@/core/configStore'
import type { ImageRef, ScanAllResult, ScanDocResult } from '@/core/scan/types'
import { isUploadedButNotReplaced } from '@/core/stats/aggregate'
import {
  buildStatsCsv,
  buildStatsJson,
  downloadTextFile,
  exportFileName,
} from '@/core/stats/export'
import {
  buildStatsSnapshot,
  type StatsScope,
  type StatsSnapshot,
} from '@/core/stats/service'
import { updateStatusBar } from '@/core/statusBar'
import {
  uploadAllNotes,
  uploadCurrentDoc,
  type PipelineProgress,
} from '@/core/upload/pipeline'
import { uiState } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin
}>()

type FilterId = 'all' | 'local' | 's3' | 'remote' | 'data' | 'title' | 'pending'

interface StatsProgress {
  phase: 'scanning' | 'analyzing' | 'uploading' | 'replacing' | 'done'
  done: number
  total: number
  current?: string
}

const store = usePigoConfigStore()

const scope = ref<StatsScope>('doc')
const allSnapshot = ref<StatsSnapshot | null>(null)
const docSnapshot = ref<StatsSnapshot | null>(null)
const docSnapshotDocId = ref('')
const currentDocId = ref('')
const running = ref(false)
const progress = ref<StatsProgress | null>(null)
const notice = ref('')
const activeFilter = ref<FilterId>('all')
const searchText = ref('')
const visibleLimit = ref(300)

let cancelRequested = false
let noticeTimer: number | undefined
let unsubscribeActiveDoc: (() => void) | null = null

const snapshot = computed<StatsSnapshot | null>(() => {
  if (scope.value === 'all') {
    return allSnapshot.value
  }
  if (!docSnapshot.value || docSnapshotDocId.value !== currentDocId.value) {
    return null
  }
  return docSnapshot.value
})

const stats = computed(() => snapshot.value?.stats ?? null)
const allDocs = computed(() => {
  const result = allSnapshot.value?.result
  return result && 'docs' in result ? (result as ScanAllResult).docs.length : 0
})
const currentDocTitle = computed(() => {
  const doc = currentDocId.value ? findDocMeta(currentDocId.value) : ''
  return doc || currentDocId.value || '未打开文档'
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
      return '扫描笔记'
    case 'analyzing':
      return '读取 fileMap / assets'
    case 'uploading':
      return '上传图片'
    case 'replacing':
      return '替换文档链接'
    case 'done':
      return '完成'
    default:
      return ''
  }
})

const progressPercent = computed(() => {
  if (!progress.value || progress.value.total <= 0) {
    return progress.value?.phase === 'done' ? 100 : 0
  }
  return Math.min(100, Math.round((progress.value.done / progress.value.total) * 100))
})

const warning = computed(() => {
  if (!stats.value) {
    return ''
  }
  if (stats.value.uploadedButNotReplaced > 0) {
    return `检测到 ${stats.value.uploadedButNotReplaced} 张图片已有 S3 上传记录，但文档里仍是本地/网络链接。可以点击“修复未替换链接”批量替换。`
  }
  return ''
})

const cards = computed(() => {
  const value = stats.value
  if (!value) {
    return []
  }

  return [
    { key: 'total', label: '总引用', value: value.totalRefs, className: '' },
    { key: 'unique', label: '唯一图片', value: value.uniqueRefs, className: 'pigo-stats__card--primary' },
    { key: 'local', label: '本地图片', value: value.local, className: 'pigo-stats__card--warning', hint: '仍是 assets/... 链接' },
    { key: 's3', label: '已上传 S3', value: value.s3, className: 'pigo-stats__card--success' },
    { key: 'remote', label: '网络图片', value: value.remote, className: '' },
    { key: 'data', label: 'Data URI', value: value.data, className: '' },
    { key: 'title', label: '题头图', value: value.title, className: '' },
    { key: 'pending', label: '已上传未替换', value: value.uploadedButNotReplaced, className: 'pigo-stats__card--warning' },
    { key: 'docs', label: '含图文档', value: value.docs, className: '' },
    { key: 'assets', label: '资源文件', value: value.assetFiles, className: '' },
  ]
})

const uniqueRefs = computed<ImageRef[]>(() => snapshot.value?.result.uniqueRefs ?? [])

const filters = computed(() => {
  const refs = uniqueRefs.value
  const pending = refs.filter((ref) => isPending(ref)).length
  return [
    { id: 'all' as FilterId, label: '全部', count: refs.length },
    { id: 'local' as FilterId, label: '本地', count: refs.filter((ref) => ref.sourceType === 'local').length },
    { id: 's3' as FilterId, label: 'S3', count: refs.filter((ref) => ref.sourceType === 's3').length },
    { id: 'remote' as FilterId, label: '网络', count: refs.filter((ref) => ref.sourceType === 'remote').length },
    { id: 'data' as FilterId, label: 'Data', count: refs.filter((ref) => ref.sourceType === 'data').length },
    { id: 'title' as FilterId, label: '题头图', count: refs.filter((ref) => ref.kind === 'title').length },
    { id: 'pending' as FilterId, label: '已上传未替换', count: pending },
  ]
})

const filteredRefs = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return uniqueRefs.value.filter((ref) => {
    if (!matchesFilter(ref)) {
      return false
    }
    if (!keyword) {
      return true
    }
    return [
      ref.docTitle,
      ref.docPath,
      ref.url,
      ref.normalizedUrl,
      ref.alt,
      ref.s3Key || '',
      ref.assetPath || '',
    ].some((value) => value.toLowerCase().includes(keyword))
  })
})

const visibleRefs = computed(() => filteredRefs.value.slice(0, visibleLimit.value))

watch(
  () => uiState.popupVisible,
  (visible) => {
    if (visible && uiState.activeTab === 'stats') {
      void ensureStatsForCurrentTab()
    }
  }
)

watch(
  () => uiState.activeTab,
  (tab) => {
    if (tab === 'stats' && uiState.popupVisible) {
      void ensureStatsForCurrentTab()
    }
  }
)

watch(
  () => currentDocId.value,
  (docId) => {
    if (!docId) {
      return
    }
    if (uiState.popupVisible && uiState.activeTab === 'stats' && scope.value === 'doc' && !running.value) {
      void scanStats('doc')
    }
  }
)

watch([activeFilter, searchText], () => {
  visibleLimit.value = 300
})

onMounted(() => {
  currentDocId.value = getActiveDocId()
  unsubscribeActiveDoc = subscribeActiveDoc(props.plugin, (change) => {
    if (change.docId && change.docId !== currentDocId.value) {
      currentDocId.value = change.docId
    }
  })
})

onBeforeUnmount(() => {
  unsubscribeActiveDoc?.()
  unsubscribeActiveDoc = null
  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }
})

function refreshActiveDoc(): void {
  const docId = getActiveDocId()
  if (docId && docId !== currentDocId.value) {
    currentDocId.value = docId
  }
}

async function ensureStatsForCurrentTab(): Promise<void> {
  await ensureConfigLoaded(props.plugin)
  refreshActiveDoc()

  if (scope.value === 'all') {
    if (!allSnapshot.value && !running.value) {
      await scanStats('all')
    }
    return
  }

  if (!currentDocId.value) {
    showNotice('请先打开一篇笔记。')
    return
  }

  if (!snapshot.value && !running.value) {
    await scanStats('doc')
  }
}

async function switchScope(next: StatsScope): Promise<void> {
  if (scope.value === next) {
    return
  }
  scope.value = next
  activeFilter.value = 'all'
  searchText.value = ''
  visibleLimit.value = 300

  if (next === 'doc') {
    refreshActiveDoc()
  }
}

async function scanStats(target: StatsScope, silent = false): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  const docId = getActiveDocId()
  if (target === 'doc' && !docId) {
    showNotice('请先打开一篇笔记。')
    return
  }

  running.value = true
  cancelRequested = false
  progress.value = { phase: 'scanning', done: 0, total: 0 }
  if (!silent) {
    notice.value = ''
  }
  updateStatusBar('正在统计图片…')

  try {
    const next = await buildStatsSnapshot(target, store.config, {
      docId,
      isCancelled: () => cancelRequested,
      onProgress: (scanProgress) => {
        progress.value = {
          phase: 'scanning',
          done: scanProgress.processed,
          total: scanProgress.total,
          current: scanProgress.docTitle,
        }
      },
    })

    progress.value = { phase: 'analyzing', done: 1, total: 1 }

    if (target === 'all') {
      allSnapshot.value = next
    }
    else {
      docSnapshot.value = next
      docSnapshotDocId.value = docId
    }

    if (next.stats.uploadedButNotReplaced > 0) {
      showNotice(`统计完成，${next.stats.uploadedButNotReplaced} 张图片已上传但链接未替换。`)
    }
    else {
      showNotice('统计完成。')
    }
    updateStatusBar('统计完成')
  }
  catch (error) {
    if (cancelRequested) {
      showNotice('已取消统计，保留上次结果。')
      updateStatusBar('统计已取消')
    }
    else {
      const message = error instanceof Error ? error.message : String(error)
      showNotice(`统计失败：${message}`)
      updateStatusBar('统计失败')
    }
  }
  finally {
    running.value = false
    progress.value = null
  }
}

async function handleUploadUnuploaded(): Promise<void> {
  if (running.value || !snapshot.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  const target = scope.value
  const message = target === 'all'
    ? '将扫描全部笔记并上传未上传的图片，可能耗时较长。上传会修改笔记中的图片链接，是否继续？'
    : '将上传本文档中未上传的图片，并替换文档链接，是否继续？'
  if (!window.confirm(message)) {
    return
  }

  running.value = true
  cancelRequested = false
  progress.value = { phase: 'uploading', done: 0, total: 0 }
  updateStatusBar('正在上传图片…')

  try {
    if (target === 'all') {
      await uploadAllNotes(store.config, {
        includeTitleImage: store.config.behavior.includeTitleImage,
        includeRemoteImages: store.config.behavior.includeRemoteImages,
        isCancelled: () => cancelRequested,
        onProgress: applyPipelineProgress,
      })
    }
    else {
      await uploadCurrentDoc(snapshot.value.result as ScanDocResult, store.config, {
        includeTitleImage: store.config.behavior.includeTitleImage,
        includeRemoteImages: store.config.behavior.includeRemoteImages,
        isCancelled: () => cancelRequested,
        onProgress: applyPipelineProgress,
      })
    }

    showNotice(cancelRequested ? '已停止上传，已完成的部分已保留。' : '上传完成，正在重新统计…')
    updateStatusBar('上传完成')
    running.value = false
    progress.value = null
    await scanStats(target, true)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showNotice(`上传失败：${message}`)
    updateStatusBar('上传失败')
  }
  finally {
    running.value = false
    progress.value = null
  }
}

async function handleRepair(): Promise<void> {
  if (running.value || !snapshot.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  const target = scope.value
  if (!window.confirm('将根据 fileMap 中已有的上传记录，替换文档中仍未替换的图片链接。不会重新上传对象，是否继续？')) {
    return
  }

  running.value = true
  cancelRequested = false
  progress.value = { phase: 'uploading', done: 0, total: 0 }
  updateStatusBar('正在修复图片链接…')

  try {
    if (target === 'all') {
      await uploadAllNotes(store.config, {
        repairOnly: true,
        includeTitleImage: true,
        includeRemoteImages: true,
        isCancelled: () => cancelRequested,
        onProgress: applyPipelineProgress,
      })
    }
    else {
      await uploadCurrentDoc(snapshot.value.result as ScanDocResult, store.config, {
        repairOnly: true,
        includeTitleImage: true,
        includeRemoteImages: true,
        isCancelled: () => cancelRequested,
        onProgress: applyPipelineProgress,
      })
    }

    showNotice(cancelRequested ? '已停止修复，已完成的部分已保留。' : '修复完成，正在重新统计…')
    updateStatusBar('修复完成')
    running.value = false
    progress.value = null
    await scanStats(target, true)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showNotice(`修复失败：${message}`)
    updateStatusBar('修复失败')
  }
  finally {
    running.value = false
    progress.value = null
  }
}

function applyPipelineProgress(value: PipelineProgress): void {
  progress.value = {
    phase: value.phase,
    done: value.done,
    total: value.total,
    current: value.current,
  }
}

function cancel(): void {
  cancelRequested = true
  showNotice('正在停止…')
  updateStatusBar('正在停止…')
}

function matchesFilter(ref: ImageRef): boolean {
  switch (activeFilter.value) {
    case 'local':
    case 's3':
    case 'remote':
    case 'data':
      return ref.sourceType === activeFilter.value
    case 'title':
      return ref.kind === 'title'
    case 'pending':
      return isPending(ref)
    default:
      return true
  }
}

function isPending(ref: ImageRef): boolean {
  if (!snapshot.value) {
    return false
  }
  return isUploadedButNotReplaced(ref, snapshot.value.fileMaps)
}

function sourceLabel(ref: ImageRef): string {
  switch (ref.sourceType) {
    case 'local':
      return '本地'
    case 's3':
      return 'S3'
    case 'data':
      return 'Data URI'
    default:
      return '网络'
  }
}

function sourceClass(ref: ImageRef): string {
  return `pigo-stats__badge--${ref.sourceType}`
}

function displayUrl(url: string): string {
  if (url.startsWith('data:')) {
    return 'data:image/...'
  }
  return url.length > 180 ? `${url.slice(0, 177)}...` : url
}

function exportJson(): void {
  if (!snapshot.value) {
    return
  }
  const text = buildStatsJson({
    scope: scope.value,
    stats: snapshot.value.stats,
    refs: snapshot.value.result.refs,
    scannedAt: snapshot.value.scannedAt,
    isUploadedButNotReplaced: (ref) => isPending(ref),
  })
  downloadTextFile(exportFileName('stats', 'json', snapshot.value.scannedAt), text, 'application/json')
  showNotice('JSON 已导出。')
}

function exportCsv(): void {
  if (!snapshot.value) {
    return
  }
  const text = buildStatsCsv({
    scope: scope.value,
    stats: snapshot.value.stats,
    refs: snapshot.value.result.refs,
    scannedAt: snapshot.value.scannedAt,
    isUploadedButNotReplaced: (ref) => isPending(ref),
  })
  downloadTextFile(exportFileName('stats', 'csv', snapshot.value.scannedAt), text, 'text/csv')
  showNotice('CSV 已导出。')
}

async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
    showNotice('链接已复制。')
  }
  catch {
    showNotice('复制失败，请手动复制。')
  }
}

function findDocMeta(docId: string): string {
  const all = allSnapshot.value?.result
  if (all && 'docs' in all) {
    const doc = (all as ScanAllResult).docs.find((item) => item.id === docId)
    if (doc) {
      return doc.title || doc.path || docId
    }
  }
  const doc = docSnapshot.value?.result as ScanDocResult | undefined
  if (doc && doc.doc.id === docId) {
    return doc.doc.title || doc.doc.path || docId
  }
  return ''
}

function showNotice(message: string): void {
  notice.value = message
  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }
  noticeTimer = window.setTimeout(() => {
    notice.value = ''
  }, 4000)
}
</script>

<style scoped>
.pigo-stats {
  padding: 14px 16px 28px;
  box-sizing: border-box;
}

.pigo-stats__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  margin-bottom: 12px;
}

.pigo-stats__scope {
  display: inline-flex;
  padding: 2px;
  border-radius: 7px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.12));
}

.pigo-stats__scope-btn {
  padding: 3px 12px;
  border: 0;
  border-radius: 5px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.6;
}

.pigo-stats__scope-btn--active {
  color: var(--b3-theme-on-background, #dfe0e1);
  background: var(--b3-theme-background, #1f1f1f);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

.pigo-stats__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pigo-stats__progress {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
  font-size: 12px;
}

.pigo-stats__progress-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--b3-theme-on-background, #dfe0e1);
  font-weight: 600;
}

.pigo-stats__progress-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
}

.pigo-stats__progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--b3-theme-primary, #3573f0);
  transition: width 0.2s ease;
}

.pigo-stats__progress-current {
  margin-top: 4px;
  overflow: hidden;
  color: var(--b3-theme-on-surface-light, #999);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-stats__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 10px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
}

.pigo-stats__warning {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--b3-theme-warning, #e6a23c);
  background: rgba(230, 162, 60, 0.12);
  font-size: 12px;
  line-height: 1.6;
}

.pigo-stats__notice {
  position: sticky;
  top: 0;
  z-index: 1;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--b3-theme-primary, #3573f0);
  background: var(--b3-theme-primary-lightest, rgba(53, 115, 240, 0.12));
  font-size: 12px;
}

.pigo-stats__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.pigo-stats__card {
  padding: 9px 10px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
}

.pigo-stats__card--primary {
  border-color: rgba(53, 115, 240, 0.36);
  background: rgba(53, 115, 240, 0.12);
}

.pigo-stats__card--warning {
  border-color: rgba(230, 162, 60, 0.32);
  background: rgba(230, 162, 60, 0.1);
}

.pigo-stats__card--success {
  border-color: rgba(103, 194, 58, 0.3);
  background: rgba(103, 194, 58, 0.1);
}

.pigo-stats__card-value {
  color: var(--b3-theme-on-background, #dfe0e1);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

.pigo-stats__card-label {
  margin-top: 2px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  font-size: 12px;
}

.pigo-stats__card-hint {
  margin-top: 2px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 11px;
}

.pigo-stats__empty {
  padding: 40px 16px;
  text-align: center;
}

.pigo-stats__empty--small {
  padding: 20px 8px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 13px;
}

.pigo-stats__empty-title {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 600;
}

.pigo-stats__empty-desc {
  max-width: 520px;
  margin: 0 auto;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 13px;
  line-height: 1.7;
}

.pigo-stats__list-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pigo-stats__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pigo-stats__filter {
  padding: 3px 9px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.6;
}

.pigo-stats__filter--active {
  color: var(--b3-theme-primary, #3573f0);
  border-color: rgba(53, 115, 240, 0.4);
  background: rgba(53, 115, 240, 0.1);
}

.pigo-stats__filter-count {
  margin-left: 4px;
  color: var(--b3-theme-on-surface-light, #999);
}

.pigo-stats__search {
  width: 200px;
  height: 28px;
  font-size: 12px;
}

.pigo-stats__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pigo-stats__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
}

.pigo-stats__row-main {
  min-width: 0;
  flex: 1 1 auto;
}

.pigo-stats__row-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 3px;
}

.pigo-stats__badge {
  padding: 0 7px;
  border-radius: 9px;
  font-size: 11px;
  line-height: 1.7;
  white-space: nowrap;
}

.pigo-stats__badge--local {
  color: #a86b00;
  background: rgba(230, 162, 60, 0.18);
}

.pigo-stats__badge--s3 {
  color: #2f6fdc;
  background: rgba(53, 115, 240, 0.16);
}

.pigo-stats__badge--remote {
  color: #2f8f4e;
  background: rgba(103, 194, 58, 0.16);
}

.pigo-stats__badge--data {
  color: #8a5cd6;
  background: rgba(138, 92, 214, 0.16);
}

.pigo-stats__badge--title {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.16);
}

.pigo-stats__badge--pending {
  color: #a86b00;
  background: rgba(230, 162, 60, 0.18);
}

.pigo-stats__row-doc {
  overflow: hidden;
  color: var(--b3-theme-on-background, #dfe0e1);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-stats__row-url {
  margin-top: 2px;
  overflow: hidden;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-stats__row-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 2px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 11px;
}

.pigo-stats__copy {
  flex: 0 0 auto;
}

.pigo-stats__more {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

@media (max-width: 640px) {
  .pigo-stats__search {
    width: 100%;
  }
}
</style>
