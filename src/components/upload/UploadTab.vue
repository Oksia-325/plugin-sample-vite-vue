<template>
  <div class="pigo-upload">
    <!-- 文档概览 -->
    <section class="pigo-upload__summary">
      <div class="pigo-upload__head">
        <div class="pigo-upload__doc">
          <div class="pigo-upload__crumbs">
            <span v-if="notebookName">{{ notebookName }}</span>
            <span v-if="notebookName" class="pigo-upload__dot">•</span>
            <span>ID: {{ currentDocId || '—' }}</span>
            <span class="pigo-upload__dot">•</span>
            <span>扫描于 {{ scanTimeText || '—' }}</span>
          </div>
          <div class="pigo-upload__title-row">
            <span class="pigo-upload__title">{{ docTitle }}</span>
            <pigo-chip :tone="readyTone">{{ readyText }}</pigo-chip>
          </div>
        </div>
        <pigo-button
          variant="ghost"
          size="sm"
          class="pigo-upload__refresh"
          :loading="loading"
          :disabled="running"
          title="刷新文档"
          aria-label="刷新文档"
          @click="refresh()"
        >
          <PigoIcon v-if="!loading" name="refresh" :size="13" />
        </pigo-button>
      </div>

      <div class="pigo-upload__chips">
        <pigo-chip tone="local" :count="stats?.local ?? 0">本地</pigo-chip>
        <pigo-chip tone="s3" :count="stats?.s3 ?? 0">S3 已同步</pigo-chip>
        <pigo-chip tone="remote" :count="stats?.remote ?? 0">网络外链</pigo-chip>
        <span class="pigo-upload__sep"></span>
        <span class="pigo-upload__meta">总数: <b>{{ stats?.totalRefs ?? 0 }}</b></span>
        <span class="pigo-upload__meta">唯一图片: <b>{{ stats?.uniqueRefs ?? 0 }}</b></span>
        <span class="pigo-upload__meta">扫描耗时: <b>{{ scanDuration }}ms</b></span>
        <span class="pigo-upload__spacer"></span>
        <span class="pigo-upload__sync" :class="syncClass">
          <PigoIcon v-if="syncPercent >= 100" name="check" :size="11" :stroke-width="2.4" />
          <span>同步进度 {{ syncDone }} / {{ syncTotal }} ({{ syncPercent }}%)</span>
        </span>
      </div>

      <div class="pigo-upload__bar">
        <div class="pigo-upload__bar-fill" :style="{ width: `${syncPercent}%` }"></div>
      </div>
    </section>

    <!-- 快速添加图片 -->
    <section class="pigo-upload__quick">
      <div class="pigo-upload__section-head">
        <span class="pigo-upload__section-title">
          <PigoIcon name="plus" :size="12" :stroke-width="2.4" />
          快速添加图片
        </span>
        <span class="pigo-upload__section-hint">支持批量拖放与剪贴板极速上传</span>
      </div>

      <div
        class="pigo-upload__dropzone"
        :class="{ 'pigo-upload__dropzone--active': dropActive }"
        tabindex="0"
        role="button"
        @click="openFilePicker"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input
          ref="fileInput"
          class="pigo-upload__file-input"
          type="file"
          accept="image/*"
          multiple
          @change="onFileChange"
        >
        <span class="pigo-upload__drop-icon" aria-hidden="true">
          <PigoIcon name="upload" :size="18" />
        </span>
        <span class="pigo-upload__drop-text">
          点击上传、拖拽图片，或直接 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴
        </span>
      </div>

      <div v-if="queue.length > 0" class="pigo-upload__queue">
        <div v-for="item in queue" :key="item.id" class="pigo-upload__queue-item">
          <img class="pigo-upload__queue-thumb" :src="item.previewUrl" alt="">
          <div class="pigo-upload__queue-info">
            <div class="pigo-upload__queue-name" :title="item.name">{{ item.name }}</div>
            <div class="pigo-upload__queue-meta">
              <span>{{ formatSize(item.size) }}</span>
              <span>·</span>
              <span v-if="item.status === 'pending'">待上传到 S3</span>
              <span v-else-if="item.status === 'uploading'">上传中…</span>
              <span v-else-if="item.status === 'done'" class="pigo-upload__ok">已上传</span>
              <span v-else class="pigo-upload__bad">{{ item.error || '上传失败' }}</span>
            </div>
            <div v-if="item.status === 'done' && item.url" class="pigo-upload__queue-url" :title="item.url">
              {{ item.url }}
            </div>
          </div>
          <div class="pigo-upload__queue-actions">
            <template v-if="item.status === 'done' && item.url">
              <pigo-button variant="ghost" size="sm" @click="copyText(item.url)">
                复制
              </pigo-button>
              <pigo-button variant="ghost" size="sm" @click="copyQueueMarkdown(item)">
                复制MD
              </pigo-button>
            </template>
            <pigo-button
              v-else
              variant="ghost"
              size="sm"
              :disabled="queueRunning"
              @click="removeQueueItem(item.id)"
            >
              取消
            </pigo-button>
            <pigo-button
              variant="ghost"
              size="sm"
              title="移除"
              aria-label="移除"
              @click="removeQueueItem(item.id)"
            >
              <PigoIcon name="x" :size="12" />
            </pigo-button>
          </div>
        </div>

        <div class="pigo-upload__queue-footer">
          <span class="pigo-upload__queue-summary">{{ queueSummary }}</span>
          <div class="pigo-upload__queue-buttons">
            <pigo-button variant="ghost" size="sm" :disabled="queueRunning" @click="clearQueue">
              清空列表
            </pigo-button>
            <pigo-button v-if="queueRunning" variant="outline" size="sm" @click="cancelQueue">
              停止
            </pigo-button>
            <pigo-button
              v-else
              variant="primary"
              size="sm"
              :disabled="!hasPendingQueue"
              @click="startQueue"
            >
              开始上传
            </pigo-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 批量操作 -->
    <section class="pigo-upload__batch">
      <span class="pigo-upload__batch-label">当前页面批量操作:</span>
      <span class="pigo-upload__spacer"></span>
      <pigo-button
        variant="primary"
        size="sm"
        class="pigo-upload__btn"
        :class="{ 'pigo-upload__btn--progress': runningKind === 'local' }"
        :style="progressStyle('local')"
        :disabled="running || loading || !scanResult"
        @click="handleUploadLocal"
      >
        <PigoIcon name="upload" :size="13" />
        <span>上传本地图片</span>
      </pigo-button>
      <pigo-button
        variant="secondary"
        size="sm"
        class="pigo-upload__btn"
        :class="{ 'pigo-upload__btn--progress': runningKind === 'force' }"
        :style="progressStyle('force')"
        :disabled="running || loading || !scanResult"
        @click="handleForceReupload"
      >
        <PigoIcon name="bolt" :size="13" />
        <span>强制重新上传</span>
      </pigo-button>
      <pigo-button
        variant="outline"
        size="sm"
        class="pigo-upload__btn"
        :class="{ 'pigo-upload__btn--progress': runningKind === 'repair' }"
        :style="progressStyle('repair')"
        :disabled="running || loading || !scanResult || pendingCount === 0"
        @click="handleRepair"
      >
        <PigoIcon name="link" :size="13" />
        <span>替换为S3链接<span v-if="pendingCount > 0"> ({{ pendingCount }})</span></span>
      </pigo-button>
    </section>

    <!-- 已解析图片 -->
    <section class="pigo-upload__list-section">
      <div class="pigo-upload__section-head">
        <span class="pigo-upload__section-title">已解析图片列表</span>
        <span class="pigo-upload__section-hint">{{ uniqueRefs.length }} 张唯一图片</span>
      </div>

      <div v-if="loading && !scanResult" class="pigo-upload__state">
        正在扫描当前文档…
      </div>
      <div v-else-if="error" class="pigo-upload__state pigo-upload__state--error">
        {{ error }}
      </div>
      <div v-else-if="!currentDocId" class="pigo-upload__state">
        请先打开一篇笔记。
      </div>
      <div v-else-if="uniqueRefs.length === 0" class="pigo-upload__state">
        本文档没有识别到图片。
      </div>

      <div v-else class="pigo-upload__grid">
        <article v-for="ref in pagedRefs" :key="ref.id" class="pigo-upload__item" tabindex="-1">
          <div
            class="pigo-upload__thumb"
            role="button"
            tabindex="0"
            title="点击预览"
            aria-label="点击预览图片"
            @click="openPreview(ref)"
            @keydown.enter.prevent="openPreview(ref)"
          >
            <img
              v-if="!previewErrors.has(ref.id)"
              :src="previewUrl(ref)"
              :alt="ref.alt"
              loading="lazy"
              decoding="async"
              @error="markPreviewError(ref.id)"
            >
            <span v-else class="pigo-upload__thumb-fallback">预览失败</span>
            <span v-if="extOf(ref) || sizeOf(ref)" class="pigo-upload__badge-strip">
              <span v-if="sizeOf(ref)" class="pigo-upload__badge-cell">{{ formatSizeBadge(sizeOf(ref)) }}</span>
              <span v-if="extOf(ref)" class="pigo-upload__badge-cell pigo-upload__badge-cell--ext">{{ extOf(ref) }}</span>
            </span>
          </div>

          <div class="pigo-upload__item-body">
            <div class="pigo-upload__item-head">
              <pigo-chip :tone="sourceTone(ref)">{{ sourceLabel(ref) }}</pigo-chip>
              <pigo-chip v-if="ref.kind === 'title'" tone="title">题头图</pigo-chip>
              <span class="pigo-upload__item-name" :title="fileName(ref)">{{ fileName(ref) }}</span>
              <span class="pigo-upload__spacer"></span>
              <pigo-chip :tone="statusTone(ref)">{{ statusText(ref) }}</pigo-chip>
            </div>

            <div class="pigo-upload__item-path" :title="ref.sourceType === 'data' ? 'Data URI' : ref.url">
              {{ displayPath(ref) }}
            </div>

            <div class="pigo-upload__item-meta">
              <span>块: {{ ref.blockId }}</span>
              <span v-if="sizeOf(ref)">· {{ formatSize(sizeOf(ref) || 0) }}</span>
              <span v-if="occurrenceCount(ref) > 1">· 引用 {{ occurrenceCount(ref) }} 次</span>
            </div>

            <div class="pigo-upload__item-actions">
              <pigo-button
                v-if="ref.sourceType === 'local' || ref.sourceType === 'data'"
                variant="outline"
                size="sm"
                :loading="singleRunningId === ref.id"
                :disabled="running"
                @click="handleUploadRef(ref, false)"
              >
                立即上传
              </pigo-button>
              <pigo-button
                v-else-if="ref.sourceType === 'remote'"
                variant="outline"
                size="sm"
                class="pigo-upload__action"
                :class="{ 'pigo-upload__action-invalid': invalidRefs.has(ref.id) }"
                :loading="singleRunningId === ref.id"
                :disabled="running || invalidRefs.has(ref.id)"
                @click="handleUploadRef(ref, true)"
              >
                {{ invalidRefs.has(ref.id) ? '图片失效' : '转存至S3' }}
              </pigo-button>
              <pigo-button
                v-else
                variant="outline"
                size="sm"
                :loading="singleRunningId === ref.id"
                :disabled="running"
                @click="handleUploadRef(ref, true)"
              >
                重新上传
              </pigo-button>

              <pigo-button variant="ghost" size="sm" @click="copyText(ref.url)">
                复制链接
              </pigo-button>
              <pigo-button variant="ghost" size="sm" @click="copyMarkdown(ref)">
                复制MD链接
              </pigo-button>
              <pigo-button
                v-if="ref.sourceType === 'local' && ref.assetPath"
                variant="ghost"
                size="sm"
                @click="copyPath(ref)"
              >
                复制路径
              </pigo-button>
            </div>
          </div>
        </article>
      </div>

      <pigo-pagination
        v-if="uniqueRefs.length > PAGE_SIZE"
        :total="uniqueRefs.length"
        :page="safePage"
        :page-size="PAGE_SIZE"
        @update:page="page = $event"
      />
    </section>

    <pigo-image-preview
      v-if="previewRef"
      :url="previewUrl(previewRef)"
      :label="fileName(previewRef)"
      @close="previewRef = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import { getActiveDocId, subscribeActiveDoc } from '@/core/activeDoc'
import { ensureConfigLoaded, ensureConfigReady, usePigoConfigStore } from '@/core/configStore'
import { toUserMessage } from '@/core/errors'
import { logError, logInfo, logWarn } from '@/core/log'
import { isPigoPanelPaste } from '@/core/paste/panelPaste'
import { createParsedImage } from '@/core/scan/parser'
import { scanDoc } from '@/core/scan/scanner'
import type { ImageRef, ScanDocResult } from '@/core/scan/types'
import { createS3Client } from '@/core/s3/client'
import { computeRefStats, countUploadedButNotReplaced } from '@/core/stats/aggregate'
import { extensionOf } from '@/core/stats/assetMeta'
import { fillRefSizes, formatSizeBadge } from '@/core/stats/refSize'
import { updateStatusBar } from '@/core/statusBar'
import { pushToast } from '@/core/toastStore'
import { loadFileMap, type FileMapEntry } from '@/core/upload/fileMap'
import {
  uploadCurrentDoc,
  uploadSingleRef,
  type PipelineProgress,
  type PipelineResult,
} from '@/core/upload/pipeline'
import {
  filterImageFiles,
  isImageFile,
  uploadFilesToS3,
} from '@/core/upload/standalone'
import { uiState } from '@/core/uiStore'
import PigoButton from '@/components/ui/PigoButton.vue'
import PigoChip from '@/components/ui/PigoChip.vue'
import PigoIcon from '@/components/ui/PigoIcon.vue'
import PigoImagePreview from '@/components/ui/PigoImagePreview.vue'
import PigoPagination from '@/components/ui/PigoPagination.vue'

interface QueueItem {
  id: number
  file: File
  name: string
  size: number
  previewUrl: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}

const props = defineProps<{
  plugin: Plugin
}>()

const store = usePigoConfigStore()

const currentDocId = ref('')
const scanResult = ref<ScanDocResult | null>(null)
const lastScanAt = ref<number | null>(null)
const loading = ref(false)
const running = ref(false)
const runningKind = ref('')
const singleRunningId = ref('')
const error = ref('')
const previewErrors = ref(new Set<string>())
const PAGE_SIZE = 60
const page = ref(1)
const progress = ref<PipelineProgress | null>(null)
const pendingCount = ref(0)
const fileMap = ref<Record<string, FileMapEntry>>({})
const sizeMap = reactive(new Map<string, number | null>())
const dropActive = ref(false)
const previewRef = ref<ImageRef | null>(null)
/** 本次会话内加载失败的网络图片（不持久化，重开面板/刷新即重置）。 */
const invalidRefs = reactive(new Set<string>())
const fileInput = ref<HTMLInputElement | null>(null)

const queue = ref<QueueItem[]>([])
const queueRunning = ref(false)

/**
 * 已上传图片的本地预览地址缓存：S3 URL -> /assets/xxx。
 * 上传完成后列表会立刻变成 S3 链接，如果不复用本地预览，
 * 面板会重新下载并解码 60 张刚上传的图片，白白增加 CPU 与流量。
 */
const localPreviewByUrl = new Map<string, string>()
const pendingSizes = new Map<string, number | null>()
let sizeFlushHandle = 0

let scanGeneration = 0
let staleRetryTimer: number | undefined
/** 刚被替换掉的旧链接：SQL 索引未更新前，禁止把它当成“本地图片”提交到界面。 */
const pendingRemovals = new Map<string, number>()
let refreshTimer: number | undefined
let unsubscribeActiveDoc: (() => void) | null = null
let cancelRequested = false
let queueCancelRequested = false
let queueSequence = 0

const uniqueRefs = computed(() => scanResult.value?.uniqueRefs ?? [])
const refs = computed(() => scanResult.value?.refs ?? [])
const totalPages = computed(() => Math.max(1, Math.ceil(uniqueRefs.value.length / PAGE_SIZE)))
const safePage = computed(() => Math.min(Math.max(1, page.value), totalPages.value))
const pagedRefs = computed(() => uniqueRefs.value.slice(
  (safePage.value - 1) * PAGE_SIZE,
  safePage.value * PAGE_SIZE
))
const stats = computed(() => scanResult.value?.stats ?? null)

const docTitle = computed(() => scanResult.value?.doc.title || (currentDocId.value ? '正在读取文档…' : '未选择文档'))

const notebookName = computed(() => {
  const path = scanResult.value?.doc.path || ''
  const parts = path.split('/').filter(Boolean)
  return parts.length > 1 ? parts[0] : ''
})

const scanTimeText = computed(() => {
  if (!lastScanAt.value) {
    return ''
  }
  return new Date(lastScanAt.value).toLocaleTimeString()
})

const scanDuration = computed(() => scanResult.value?.durationMs ?? 0)

const readyTone = computed(() => (
  (stats.value?.local ?? 0) === 0 && pendingCount.value === 0 ? 'success' : 'warning'
))

const readyText = computed(() => (
  (stats.value?.local ?? 0) === 0 && pendingCount.value === 0 ? '已就绪' : '待处理'
))

const syncTotal = computed(() => {
  const unique = stats.value?.uniqueRefs ?? 0
  const data = stats.value?.data ?? 0
  return Math.max(0, unique - data)
})

const syncDone = computed(() => {
  if (running.value && progress.value && progress.value.total > 0) {
    return progress.value.done
  }
  return stats.value?.s3 ?? 0
})

const syncPercent = computed(() => {
  if (running.value && progress.value && progress.value.total > 0) {
    return Math.min(100, Math.round((progress.value.done / progress.value.total) * 100))
  }
  const total = syncTotal.value
  if (total <= 0) {
    return 100
  }
  return Math.min(100, Math.round(((stats.value?.s3 ?? 0) / total) * 100))
})

const occurrenceCounts = computed(() => {
  const counts = new Map<string, number>()
  refs.value.forEach((ref) => {
    counts.set(ref.normalizedUrl, (counts.get(ref.normalizedUrl) || 0) + 1)
  })
  return counts
})


const progressPercent = computed(() => {
  if (!progress.value || progress.value.total <= 0) {
    return 0
  }
  return Math.min(100, Math.round((progress.value.done / progress.value.total) * 100))
})

const syncClass = computed(() => {
  if (running.value) {
    return 'pigo-upload__sync--running'
  }
  return syncPercent.value >= 100 ? 'pigo-upload__sync--done' : 'pigo-upload__sync--idle'
})

function progressStyle(kind: string): Record<string, string> {
  const percent = runningKind.value === kind && progress.value ? progressPercent.value : 0
  return { '--pigo-progress': `${percent}%` }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}


const hasPendingQueue = computed(() => queue.value.some((item) => item.status === 'pending' || item.status === 'error'))

const queueSummary = computed(() => {
  const done = queue.value.filter((item) => item.status === 'done').length
  return `${done}/${queue.value.length} 已上传`
})

onMounted(async () => {
  currentDocId.value = getActiveDocId()
  unsubscribeActiveDoc = subscribeActiveDoc(props.plugin, (change) => {
    currentDocId.value = change.docId
    if (uiState.popupVisible && uiState.activeTab === 'upload' && !running.value) {
      scheduleRefresh(change.docId)
    }
  })

  document.addEventListener('paste', onDocumentPaste, true)

  await ensureConfigLoaded(props.plugin)
  if (uiState.popupVisible && uiState.activeTab === 'upload' && !running.value) {
    await refresh()
  }
})

onBeforeUnmount(() => {
  unsubscribeActiveDoc?.()
  unsubscribeActiveDoc = null
  document.removeEventListener('paste', onDocumentPaste, true)
  if (refreshTimer) {
    window.clearTimeout(refreshTimer)
  }
  if (staleRetryTimer) {
    window.clearTimeout(staleRetryTimer)
  }
  if (sizeFlushHandle) {
    cancelAnimationFrame(sizeFlushHandle)
    sizeFlushHandle = 0
  }
  pendingSizes.clear()
  queue.value.forEach((item) => {
    URL.revokeObjectURL(item.previewUrl)
  })
})

watch(
  () => uiState.popupVisible,
  (visible) => {
    if (!visible) {
      clearQueue()
      invalidRefs.clear()
      localPreviewByUrl.clear()
      return
    }
    if (uiState.activeTab === 'upload' && !running.value) {
      scheduleRefresh(getActiveDocId())
    }
  }
)

watch(pagedRefs, () => {
  if (uiState.popupVisible && uiState.activeTab === 'upload') {
    void resolveSizes()
  }
})

watch(
  () => currentDocId.value,
  () => {
    clearQueue()
    invalidRefs.clear()
    localPreviewByUrl.clear()
    page.value = 1
  }
)

watch(
  () => uiState.activeTab,
  (tab) => {
    if (tab === 'upload' && uiState.popupVisible && !running.value) {
      scheduleRefresh(getActiveDocId())
    }
  }
)

interface RefreshOptions {
  /** 这些旧链接必须已经从扫描结果里消失，否则视为 SQL 索引尚未更新，继续等待。 */
  guardUrls?: string[]
}

async function refresh(docId: string = getActiveDocId(), options: RefreshOptions = {}): Promise<void> {
  if (running.value) {
    return
  }

  if (!docId) {
    currentDocId.value = ''
    scanResult.value = null
    error.value = '请先打开一篇笔记。'
    return
  }

  const generation = ++scanGeneration
  const showLoading = guardUrlsLength(options) === 0 && pendingRemovals.size === 0
  currentDocId.value = docId
  if (showLoading) {
    loading.value = true
  }
  error.value = ''
  previewErrors.value.clear()

  if (scanResult.value?.doc.id !== docId) {
    scanResult.value = null
  }

  const guardUrls = options.guardUrls ?? []
  prunePendingRemovals()
  const guarding = guardUrls.length > 0 || pendingRemovals.size > 0
  const attempts = guarding ? 10 : 1

  try {
    await ensureConfigLoaded(props.plugin)
    for (let attempt = 0; attempt < attempts; attempt++) {
      const result = await scanDoc(docId, store.config)
      if (generation !== scanGeneration) {
        return
      }

      const stale = hasStaleRefs(result, guardUrls) || hasPendingStaleRefs(result)
      if (stale) {
        if (attempt < attempts - 1) {
          await sleep(300)
          continue
        }

        // 索引迟迟没更新：保留乐观结果，稍后再试，绝不把旧数据提交到界面。
        logWarn(`扫描结果仍包含刚替换的旧链接，稍后重试（${pendingRemovals.size} 条待确认）`)
        scheduleStaleRetry()
        return
      }

      pendingRemovals.clear()
      scanResult.value = result
      lastScanAt.value = result.scannedAt
      await loadDocState(docId, result)
      break
    }
  }
  catch (scanError) {
    if (generation !== scanGeneration) {
      return
    }
    error.value = toUserMessage(scanError)
  }
  finally {
    if (showLoading && generation === scanGeneration) {
      loading.value = false
    }
  }
}

function guardUrlsLength(options: RefreshOptions): number {
  return options.guardUrls?.length ?? 0
}

function hasStaleRefs(result: ScanDocResult, guardUrls: string[]): boolean {
  return result.refs.some((ref) => ref.sourceType !== 's3' && guardUrls.includes(ref.url))
}

function markPendingRemovals(urls: string[]): void {
  const now = Date.now()
  urls.forEach((url) => {
    if (url) {
      pendingRemovals.set(url, now)
    }
  })
}

function hasPendingStaleRefs(result: ScanDocResult): boolean {
  if (pendingRemovals.size === 0) {
    return false
  }
  return result.refs.some((ref) => ref.sourceType !== 's3' && pendingRemovals.has(ref.url))
}

function prunePendingRemovals(): void {
  // 20 秒还没确认，说明替换确实没成功，不再继续拦截刷新。
  const cutoff = Date.now() - 20000
  pendingRemovals.forEach((createdAt, url) => {
    if (createdAt < cutoff) {
      pendingRemovals.delete(url)
    }
  })
}

function scheduleStaleRetry(): void {
  if (staleRetryTimer) {
    return
  }
  staleRetryTimer = window.setTimeout(() => {
    staleRetryTimer = undefined
    void refresh(getActiveDocId())
  }, 1200)
}

async function loadDocState(docId: string, result: ScanDocResult): Promise<void> {
  try {
    const map = await loadFileMap(docId)
    fileMap.value = map
    pendingCount.value = countUploadedButNotReplaced(result.uniqueRefs, new Map([[docId, map]]))
  }
  catch {
    fileMap.value = {}
    pendingCount.value = 0
  }

  void resolveSizes()
}

let sizeResolving = false

async function resolveSizes(): Promise<void> {
  if (sizeResolving) {
    return
  }

  // 只读取当前页的 60 张，避免大文档一次性发起几百个 HEAD / Range 请求。
  const targets = pagedRefs.value.filter((ref) => (
    !sizeMap.has(ref.id)
    && ref.sourceType !== 'data'
    && !previewErrors.value.has(ref.id)
  ))
  if (targets.length === 0) {
    return
  }

  sizeResolving = true
  const sizeCountBefore = sizeMap.size
  try {
    const client = createS3Client(store.config.s3)
    await fillRefSizes(
      targets,
      client,
      () => fileMap.value,
      (id, size) => queueSize(id, size)
    )
  }
  catch (error) {
    // 尺寸只是展示信息，失败不影响主流程。
    logWarn('读取图片大小失败', error)
  }
  finally {
    sizeResolving = false
  }

  flushSizes()

  // 读取期间切换到新页时，补读新页尚未处理的图片。
  const hasPending = sizeMap.size > sizeCountBefore && pagedRefs.value.some((ref) => (
    !sizeMap.has(ref.id)
    && ref.sourceType !== 'data'
    && !previewErrors.value.has(ref.id)
  ))
  if (hasPending) {
    void resolveSizes()
  }
}


function queueSize(id: string, size: number | undefined): void {
  pendingSizes.set(id, size ?? null)
  if (sizeFlushHandle) {
    return
  }
  sizeFlushHandle = window.requestAnimationFrame(() => {
    sizeFlushHandle = 0
    flushSizes()
  })
}

function flushSizes(): void {
  if (pendingSizes.size === 0) {
    return
  }
  pendingSizes.forEach((value, key) => sizeMap.set(key, value))
  pendingSizes.clear()
}

function scheduleRefresh(docId: string): void {
  if (refreshTimer) {
    window.clearTimeout(refreshTimer)
  }
  if (staleRetryTimer) {
    window.clearTimeout(staleRetryTimer)
  }
  refreshTimer = window.setTimeout(() => {
    void refresh(docId)
  }, 150)
}

async function handleUploadRef(ref: ImageRef, force: boolean): Promise<void> {
  if (running.value) {
    return
  }

  if (!(await ensureReady())) {
    return
  }

  singleRunningId.value = ref.id
  const outcome = await runPipeline('single', () => uploadSingleRef(ref, store.config, {
    force,
    onProgress: (value) => {
      progress.value = value
    },
    isCancelled: () => cancelRequested,
  }))

  if (!outcome) {
    return
  }

  const failed = outcome.upload.results.find((item) => !item.ok)
  if (failed) {
    if (ref.sourceType === 'remote') {
      invalidRefs.add(ref.id)
      pushToast('error', '图片加载失败，可能已失效。')
    }
    else {
      pushToast('error', '上传失败，请查看日志。')
    }
    return
  }

  pushToast('success', '上传完成。')
}

async function handleUploadLocal(): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  await refresh()
  const currentScan = scanResult.value
  if (!currentScan) {
    return
  }

  if (!(await ensureReady())) {
    return
  }

  await runPipeline('local', () => uploadCurrentDoc(currentScan, store.config, {
    sourceTypes: ['local'],
    onProgress: (value) => {
      progress.value = value
    },
    isCancelled: () => cancelRequested,
  }))
}

async function handleForceReupload(): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  await refresh()
  const currentScan = scanResult.value
  if (!currentScan) {
    return
  }

  if (!window.confirm('将强制重新上传本文档所有图片（包括已上传 S3），会生成新的对象，是否继续？')) {
    return
  }

  if (!(await ensureReady())) {
    return
  }

  await runPipeline('force', () => uploadCurrentDoc(currentScan, store.config, {
    force: true,
    onProgress: (value) => {
      progress.value = value
    },
    isCancelled: () => cancelRequested,
  }))
}

async function handleRepair(): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  await refresh()
  const currentScan = scanResult.value
  if (!currentScan) {
    return
  }

  if (!(await ensureReady())) {
    return
  }

  await runPipeline('repair', () => uploadCurrentDoc(currentScan, store.config, {
    repairOnly: true,
    replaceLink: true,
    includeTitleImage: true,
    includeRemoteImages: true,
    onProgress: (value) => {
      progress.value = value
    },
    isCancelled: () => cancelRequested,
  }))
}

async function runPipeline(kind: string, task: () => Promise<PipelineResult>): Promise<PipelineResult | null> {
  running.value = true
  runningKind.value = kind
  cancelRequested = false
  progress.value = null
  error.value = ''
  updateStatusBar('正在处理图片…')

  let replaced = 0
  let replacedUrls: string[] = []
  let outcome: PipelineResult | null = null
  try {
    await ensureConfigLoaded(props.plugin)
    const result = await task()
    outcome = result
    replaced = result.replace.replacedUrls.length
    replacedUrls = result.replace.replacedUrls
    if (replaced > 0) {
      markPendingRemovals(replacedUrls)
      applyOptimisticUpload(result, replacedUrls)
      logInfo(`已乐观更新 ${replacedUrls.length} 张图片为 S3，等待索引确认`)
    }
    const failed = result.upload.failed + result.replace.errors.length
    if (kind !== 'single') {
      if (failed > 0) {
        pushToast('error', `上传完成，但有 ${failed} 条失败，请查看日志。`)
      }
      else if (result.upload.uploaded > 0 && !store.config.behavior.replaceLink) {
        pushToast('info', `已上传 ${result.upload.uploaded} 张图片，按设置未替换文档链接；可在统计页点击「修复S3链接」。`)
      }
      else {
        pushToast('success', '上传完成。')
      }
    }
    updateStatusBar(failed > 0 ? '上传完成，有失败项' : '上传完成')
  }
  catch (pipelineError) {
    error.value = toUserMessage(pipelineError)
    logError('上传任务失败', pipelineError)
    pushToast('error', '上传失败，请查看日志。')
    updateStatusBar('上传失败')
  }
  finally {
    running.value = false
    runningKind.value = ''
    singleRunningId.value = ''

    // 思源的 SQL 索引在 updateBlock 之后有短暂延迟：替换后稍等再扫描，
    // 否则列表会继续显示旧的本地链接。
    await sleep(replaced > 0 ? 200 : 150)
    await refresh(getActiveDocId(), { guardUrls: replaced > 0 ? replacedUrls : [] })
  }

  return outcome
}

/**
 * 乐观更新：上传成功且已替换链接时，先把本地 ref 直接改成 S3，
 * 避免思源 SQL 索引延迟导致页面停在 50%。
 */
function applyOptimisticUpload(result: PipelineResult, replacedUrls: string[]): void {
  const scan = scanResult.value
  if (!scan) {
    return
  }

  const replaced = new Set(replacedUrls)
  const urlMap = new Map<string, string>()
  result.upload.results.forEach((item) => {
    if (item.ok && item.url && !item.skipped && replaced.has(item.ref.url)) {
      urlMap.set(item.ref.normalizedUrl, item.url)
      if (item.ref.sourceType === 'local' && item.ref.assetPath && !localPreviewByUrl.has(item.url)) {
        localPreviewByUrl.set(item.url, encodeURI(`/${item.ref.assetPath}`))
      }
    }
  })
  if (urlMap.size === 0) {
    return
  }

  let changed = false
  scan.refs.forEach((ref) => {
    const nextUrl = urlMap.get(ref.normalizedUrl)
    if (!nextUrl || ref.sourceType === 's3') {
      return
    }
    const parsed = createParsedImage(nextUrl, ref.alt, ref.title, ref.kind, store.config.s3)
    ref.url = parsed.url
    ref.sourceType = parsed.sourceType
    ref.normalizedUrl = parsed.normalizedUrl
    ref.s3Key = parsed.s3Key
    ref.assetPath = parsed.assetPath
    changed = true
  })

  if (changed) {
    scan.stats = computeRefStats(scan.refs, scan.uniqueRefs)
    pendingCount.value = 0
  }
}

async function ensureReady(): Promise<boolean> {
  const ready = await ensureConfigReady(props.plugin)
  if (ready.ok) {
    return true
  }

  const message = ready.issues.map((issue) => issue.message).join('；')
  error.value = `配置不完整：${message}`
  pushToast('error', '请先在设置页补全 S3 配置后再上传。')
  uiState.activeTab = 'settings'
  return false
}


/* ---------- 快速添加图片 ---------- */

function openFilePicker(): void {
  fileInput.value?.click()
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files || []))
  input.value = ''
}

function onDragOver(): void {
  dropActive.value = true
}

function onDragLeave(): void {
  dropActive.value = false
}

function onDrop(event: DragEvent): void {
  dropActive.value = false
  addFiles(Array.from(event.dataTransfer?.files || []))
}

function onDocumentPaste(event: ClipboardEvent): void {
  if (!uiState.popupVisible || uiState.activeTab !== 'upload') {
    return
  }
  if (!isPigoPanelPaste(event.target, document.activeElement)) {
    return
  }

  const files = collectClipboardImages(event.clipboardData)
  if (files.length === 0) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  addFiles(files)
}

function collectClipboardImages(data: DataTransfer | null): File[] {
  if (!data) {
    return []
  }

  const files: File[] = []
  Array.from(data.items || []).forEach((item) => {
    if (item.kind !== 'file') {
      return
    }
    const file = item.getAsFile()
    if (file && isImageFile(file)) {
      files.push(file)
    }
  })

  if (files.length === 0 && data.files) {
    files.push(...filterImageFiles(Array.from(data.files)))
  }

  return files
}

function addFiles(files: File[]): void {
  const images = filterImageFiles(files)
  if (images.length === 0) {
    pushToast('error', '没有识别到图片文件。')
    return
  }

  images.forEach((file) => {
    queue.value.push({
      id: ++queueSequence,
      file,
      name: file.name || `screenshot-${queueSequence}.png`,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    })
  })

  pushToast('info', `已加入 ${images.length} 张图片，点击「开始上传」上传到 S3。`)
}

function removeQueueItem(id: number): void {
  const index = queue.value.findIndex((item) => item.id === id)
  if (index < 0) {
    return
  }
  URL.revokeObjectURL(queue.value[index].previewUrl)
  queue.value.splice(index, 1)
}

async function startQueue(): Promise<void> {
  const pending = queue.value.filter((item) => item.status === 'pending' || item.status === 'error')
  if (pending.length === 0) {
    return
  }

  if (!(await ensureReady())) {
    return
  }

  queueRunning.value = true
  queueCancelRequested = false
  pending.forEach((item) => {
    item.status = 'uploading'
    item.error = undefined
  })

  try {
    const result = await uploadFilesToS3(pending.map((item) => item.file), store.config, {
      isCancelled: () => queueCancelRequested,
      onFileDone: (uploaded, _file, index) => {
        const item = pending[index]
        if (!item) {
          return
        }
        item.status = 'done'
        item.url = uploaded.url
      },
      onFileError: (message, _file, index) => {
        const item = pending[index]
        if (!item) {
          return
        }
        item.status = 'error'
        item.error = message
      },
    })

    if (result.cancelled) {
      pending.forEach((item) => {
        if (item.status === 'uploading') {
          item.status = 'pending'
        }
      })
      pushToast('info', '已停止上传。')
    }
    else if (result.errors.length > 0) {
      pushToast('error', `上传完成，失败 ${result.errors.length} 张。`)
    }
    else {
      pushToast('success', `已上传 ${result.results.length} 张图片到 S3。`)
    }
  }
  catch (uploadError) {
    pending.forEach((item) => {
      if (item.status === 'uploading') {
        item.status = 'error'
        item.error = toUserMessage(uploadError)
      }
    })
    pushToast('error', `上传失败：${toUserMessage(uploadError)}`)
  }
  finally {
    queueRunning.value = false
  }
}

function cancelQueue(): void {
  queueCancelRequested = true
  pushToast('info', '正在停止…')
}

function clearQueue(): void {
  queue.value.forEach((item) => {
    URL.revokeObjectURL(item.previewUrl)
  })
  queue.value.splice(0, queue.value.length)
}

async function copyQueueMarkdown(item: QueueItem): Promise<void> {
  if (!item.url) {
    return
  }
  const alt = (item.name || 'image').replace(/[[\]\r\n]/g, ' ')
  await copyText(`![${alt}](${item.url})`)
}

/* ---------- 展示辅助 ---------- */

function openPreview(ref: ImageRef): void {
  previewRef.value = ref
}

function previewUrl(ref: ImageRef): string {
  if (ref.sourceType === 'local' && ref.assetPath) {
    return encodeURI(`/${ref.assetPath}`)
  }
  const cached = localPreviewByUrl.get(ref.url)
  if (cached) {
    return cached
  }
  return ref.url
}

function markPreviewError(id: string): void {
  previewErrors.value.add(id)
}

function displayText(value: string, isData = false): string {
  if (isData || value.startsWith('data:')) {
    return 'data:image/...'
  }
  return value.length > 160 ? `${value.slice(0, 157)}...` : value
}

function displayPath(ref: ImageRef): string {
  if (ref.sourceType === 's3' && ref.s3Key) {
    return ref.s3Key
  }
  if (ref.sourceType === 'local' && ref.assetPath) {
    return ref.assetPath
  }
  return displayText(ref.url, ref.sourceType === 'data')
}

function fileName(ref: ImageRef): string {
  const source = ref.s3Key || ref.assetPath || ref.url
  const last = (source.split('?')[0].split('/').pop() || '').trim()
  if (!last) {
    return ref.alt || '未命名图片'
  }
  try {
    return decodeURIComponent(last)
  }
  catch {
    return last
  }
}

function extOf(ref: ImageRef): string {
  return extensionOf(ref.assetPath || ref.s3Key || ref.url)
}

function sizeOf(ref: ImageRef): number | undefined {
  const value = sizeMap.get(ref.id)
  return typeof value === 'number' ? value : undefined
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

function sourceTone(ref: ImageRef): 'local' | 's3' | 'remote' | 'data' {
  return ref.sourceType
}

function statusText(ref: ImageRef): string {
  switch (ref.sourceType) {
    case 's3':
      return '已替换'
    case 'remote':
      return '外部网络图源'
    case 'data':
      return 'Data URI'
    default:
      return '未替换'
  }
}

function statusTone(ref: ImageRef): 'success' | 'warning' | 'remote' | 'data' {
  switch (ref.sourceType) {
    case 's3':
      return 'success'
    case 'remote':
      return 'remote'
    case 'data':
      return 'data'
    default:
      return 'warning'
  }
}

function occurrenceCount(ref: ImageRef): number {
  return occurrenceCounts.value.get(ref.normalizedUrl) || 1
}

function formatSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return '—'
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function copyText(text: string | undefined): Promise<void> {
  if (!text) {
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    pushToast('success', '已复制。')
  }
  catch {
    pushToast('error', '复制失败，请手动复制。')
  }
}

async function copyPath(ref: ImageRef): Promise<void> {
  await copyText(ref.assetPath)
}

async function copyMarkdown(ref: ImageRef): Promise<void> {
  const alt = (ref.alt || fileName(ref)).replace(/[[\]\r\n]/g, ' ')
  await copyText(`![${alt}](${ref.url})`)
}
</script>

<style scoped>
.pigo-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px 24px;
  box-sizing: border-box;
}

.pigo-upload__spacer {
  flex: 1 1 auto;
}

.pigo-upload__summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
}

.pigo-upload__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  justify-content: space-between;
}

.pigo-upload__doc {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pigo-upload__crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__dot {
  opacity: 0.6;
}

.pigo-upload__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pigo-upload__title {
  overflow: hidden;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-md);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__sep {
  width: 1px;
  height: 12px;
  background: var(--pigo-border-strong);
}

.pigo-upload__meta {
  color: var(--pigo-muted);
}

.pigo-upload__meta b {
  color: var(--pigo-text-2);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.pigo-upload__sync {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pigo-upload__sync--idle {
  color: var(--pigo-muted);
}

.pigo-upload__sync--running {
  color: var(--pigo-accent);
}

.pigo-upload__sync--done {
  color: var(--pigo-emerald);
}

.pigo-upload__bar {
  height: 4px;
  overflow: hidden;
  border: 1px solid var(--pigo-border);
  border-radius: 999px;
  background: var(--pigo-surface);
}

.pigo-upload__bar-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--pigo-accent), var(--pigo-emerald));
  transition: width 0.25s ease;
}

/* ---------- 快速添加图片 ---------- */

.pigo-upload__quick {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pigo-upload__section-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pigo-upload__section-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-sm);
  font-weight: 600;
}

.pigo-upload__section-hint {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 22px 16px;
  border: 1px dashed var(--pigo-border-strong);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.pigo-upload__dropzone:hover,
.pigo-upload__dropzone:focus-visible {
  border-color: rgba(249, 115, 22, 0.45);
  background: var(--pigo-accent-soft);
  outline: none;
}

.pigo-upload__dropzone--active {
  border-color: var(--pigo-accent);
  background: var(--pigo-accent-soft);
}

.pigo-upload__file-input {
  display: none;
}

.pigo-upload__drop-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-accent);
  background: var(--pigo-accent-soft);
}

.pigo-upload__drop-icon svg {
  width: 18px;
  height: 18px;
}

.pigo-upload__drop-text {
  color: var(--pigo-text-2);
  font-size: var(--pigo-fs-xs);
}

.pigo-upload__drop-text kbd {
  padding: 2px 4px 0;
  border: 1px solid var(--pigo-border-strong);
  border-radius: 4px;
  background: var(--pigo-surface);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__drop-hint {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__queue {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
}

.pigo-upload__queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-bg);
}

.pigo-upload__queue-thumb {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: var(--pigo-radius-sm);
  object-fit: cover;
  background: var(--pigo-surface);
}

.pigo-upload__queue-info {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pigo-upload__queue-name {
  overflow: hidden;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__queue-meta {
  display: flex;
  gap: 5px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__queue-url {
  overflow: hidden;
  color: var(--pigo-blue);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__ok {
  color: var(--pigo-emerald);
}

.pigo-upload__bad {
  color: var(--pigo-rose);
}

.pigo-upload__queue-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
}

.pigo-upload__queue-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 0;
}

.pigo-upload__queue-summary {
  flex: 1 1 auto;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__queue-buttons {
  display: flex;
  gap: 6px;
}

/* ---------- 批量操作 ---------- */

.pigo-upload__batch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
}

.pigo-upload__batch-label {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__btn svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
}

.pigo-upload__btn--progress {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.pigo-upload__btn--progress::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  z-index: -1;
  width: var(--pigo-progress, 0%);
  /* 纯橙填充：从透明底逐渐覆盖为橙色 */
  background: var(--pigo-accent);
  transition: width 0.2s ease;
}

/*
 * 主按钮平时是橙色渐变，橙色进度层会与底色混在一起。
 * 运行中把主按钮底色切到中性灰，橙色充电层才清晰可见。
 */
.pigo-upload__btn--progress.pigo-btn--primary {
  color: var(--pigo-text);
  background: var(--pigo-surface-strong);
  border-color: rgba(249, 115, 22, 0.55);
}

/* 运行中按钮处于 disabled，但充电动画需要保持清晰 */
.pigo-upload__btn--progress:disabled {
  opacity: 1;
}

.pigo-upload__refresh :deep(svg) {
  width: 16px;
  height: 16px;
}




/* ---------- 图片列表 ---------- */

.pigo-upload__list-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pigo-upload__state {
  padding: 20px;
  border: 1px dashed var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-xs);
  text-align: center;
}

.pigo-upload__state--error {
  color: var(--pigo-rose);
  border-color: rgba(244, 63, 94, 0.4);
}

.pigo-upload__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pigo-upload__item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
  transition: border-color 0.15s ease;
}

.pigo-upload__item:hover {
  border-color: var(--pigo-border-strong);
}

.pigo-upload__item:focus {
  outline: none;
}

.pigo-upload__thumb {
  position: relative;
  width: 108px;
  height: 108px;
  flex: 0 0 108px;
  overflow: hidden;
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-surface);
  cursor: zoom-in;
  transition: box-shadow 0.15s ease;
}

.pigo-upload__thumb:hover,
.pigo-upload__thumb:focus-visible {
  box-shadow: 0 0 0 2px var(--pigo-accent);
  outline: none;
}

.pigo-upload__thumb:hover img {
  transform: scale(1.04);
}

.pigo-upload__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.15s ease;
}

.pigo-upload__thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--pigo-muted);
  font-size: 10px;
}

.pigo-upload__badge-strip {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 16px;
  overflow: hidden;
  color: #fff;
  background: rgba(38, 38, 42, 0.82);
  font-size: 9px;
  line-height: 16px;
}

.pigo-upload__badge-cell {
  min-width: 0;
  flex: 1 1 0;
  padding: 0 2px;
  overflow: hidden;
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__badge-cell + .pigo-upload__badge-cell {
  border-left: 1px solid rgba(255, 255, 255, 0.22);
}

.pigo-upload__badge-cell--ext {
  text-transform: uppercase;
}

.pigo-upload__item-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pigo-upload__item-head {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.pigo-upload__item-name {
  overflow: hidden;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-xs);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__item-path {
  overflow: hidden;
  color: var(--pigo-muted);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-upload__item-actions .pigo-upload__action-invalid {
  color: var(--pigo-rose);
  border-color: rgba(244, 63, 94, 0.45);
}

.pigo-upload__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 2px;
}

@media (max-width: 820px) {
  .pigo-upload__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .pigo-upload {
    padding: 12px 12px 20px;
  }

  .pigo-upload__chips {
    gap: 4px;
  }

  .pigo-upload__sync {
    flex-basis: 100%;
  }
}
</style>
