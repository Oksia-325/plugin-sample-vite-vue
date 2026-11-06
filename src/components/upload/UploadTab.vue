<template>
  <div class="pigo-upload">
    <div class="pigo-upload__toolbar">
      <div class="pigo-upload__doc">
        <div class="pigo-upload__doc-title">
          {{ scanResult?.doc.title || (currentDocId ? '正在读取文档…' : '未选择文档') }}
        </div>
        <div class="pigo-upload__doc-meta">
          <span v-if="scanResult?.doc.path">{{ scanResult.doc.path }}</span>
          <span v-if="currentDocId">ID: {{ currentDocId }}</span>
          <span v-if="lastScanAt">扫描于 {{ scanTimeText }}</span>
        </div>
      </div>
      <div class="pigo-upload__actions">
        <button class="b3-button b3-button--text" type="button" :disabled="loading || running" @click="refresh()">
          {{ loading ? '扫描中…' : '刷新' }}
        </button>
        <button class="b3-button b3-button--outline" type="button" :disabled="loading || running || !scanResult" @click="handleUploadAll(false)">
          上传未上传图片
        </button>
        <button class="b3-button b3-button--outline" type="button" :disabled="loading || running || !scanResult" @click="handleUploadAll(true)">
          强制重新上传
        </button>
        <button class="b3-button b3-button--outline" type="button" :disabled="loading || running || !scanResult" @click="handleRepair">
          修复未替换链接
        </button>
        <button class="b3-button b3-button--outline" type="button" :disabled="loading || running" @click="handleUploadAllNotes">
          上传全部笔记
        </button>
        <button v-if="running" class="b3-button b3-button--outline" type="button" @click="cancelUpload">
          停止
        </button>
      </div>
    </div>

    <div v-if="progress" class="pigo-upload__progress">
      <div class="pigo-upload__progress-head">
        <span>{{ phaseLabel }}</span>
        <span>{{ progress.done }} / {{ progress.total }}</span>
      </div>
      <div class="pigo-upload__progress-bar">
        <div class="pigo-upload__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <div class="pigo-upload__progress-meta">
        <span>上传 {{ progress.uploaded }}</span>
        <span>复用 {{ progress.reused }}</span>
        <span>跳过 {{ progress.skipped }}</span>
        <span>失败 {{ progress.failed }}</span>
      </div>
      <div v-if="progress.current" class="pigo-upload__progress-current">
        {{ displayText(progress.current) }}
      </div>
    </div>

    <div v-if="lastPipeline && !running" class="pigo-upload__result">
      <div class="pigo-upload__result-summary">
        上传 {{ lastPipeline.upload.uploaded }} · 复用 {{ lastPipeline.upload.reused }} · 跳过 {{ lastPipeline.upload.skipped }} · 失败 {{ lastPipeline.upload.failed }}
        · 替换块 {{ lastPipeline.replace.replacedBlocks }} · 题头图 {{ lastPipeline.replace.replacedTitleImages }} · 未替换 {{ lastPipeline.replace.notReplaced }} · 耗时 {{ lastPipeline.elapsedMs }}ms
      </div>
      <div v-if="lastPipeline.upload.cancelled || lastPipeline.replace.cancelled" class="pigo-upload__result-warning">
        任务已停止，已完成的部分已保留。
      </div>
      <details v-if="pipelineErrors.length > 0" class="pigo-upload__result-errors">
        <summary>失败/错误 {{ pipelineErrors.length }} 条</summary>
        <ul>
          <li v-for="item in pipelineErrors" :key="item">{{ item }}</li>
        </ul>
      </details>
    </div>

    <div v-if="loading" class="pigo-upload__state">
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

    <template v-else>
      <div class="pigo-upload__stats">
        <span class="pigo-upload__stat">总数 <b>{{ stats?.totalRefs ?? 0 }}</b></span>
        <span class="pigo-upload__stat">唯一 <b>{{ stats?.uniqueRefs ?? 0 }}</b></span>
        <span class="pigo-upload__stat pigo-upload__stat--local">本地 <b>{{ stats?.local ?? 0 }}</b></span>
        <span class="pigo-upload__stat pigo-upload__stat--s3">S3 <b>{{ stats?.s3 ?? 0 }}</b></span>
        <span class="pigo-upload__stat pigo-upload__stat--remote">网络 <b>{{ stats?.remote ?? 0 }}</b></span>
        <span class="pigo-upload__stat" v-if="stats?.data">Data <b>{{ stats.data }}</b></span>
        <span class="pigo-upload__stat" v-if="stats?.title">题头图 <b>{{ stats.title }}</b></span>
      </div>

      <div class="pigo-upload__list">
        <div v-for="ref in uniqueRefs" :key="ref.id" class="pigo-upload__item">
          <div class="pigo-upload__thumb">
            <img
              v-if="!previewErrors.has(ref.id)"
              :src="previewUrl(ref)"
              :alt="ref.alt"
              loading="lazy"
              @error="markPreviewError(ref.id)"
            >
            <div v-else class="pigo-upload__thumb-fallback">
              预览失败
            </div>
          </div>

          <div class="pigo-upload__info">
            <div class="pigo-upload__line">
              <span
                v-for="badge in badges(ref)"
                :key="badge.text"
                class="pigo-upload__badge"
                :class="badge.className"
              >
                {{ badge.text }}
              </span>
              <span class="pigo-upload__alt">{{ ref.alt || '（无描述）' }}</span>
            </div>

            <div class="pigo-upload__url" :title="ref.sourceType === 'data' ? 'Data URI' : ref.url">
              {{ displayUrl(ref) }}
            </div>

            <div class="pigo-upload__meta">
              <span>块 {{ ref.blockId }}</span>
              <span v-if="ref.assetPath">文件 {{ ref.assetPath }}</span>
              <span v-if="ref.s3Key">Key {{ ref.s3Key }}</span>
              <span v-if="occurrenceCount(ref) > 1">引用 {{ occurrenceCount(ref) }} 次</span>
            </div>

            <div class="pigo-upload__item-actions">
              <button class="b3-button b3-button--text" type="button" @click="copyUrl(ref)">
                复制链接
              </button>
              <button
                class="b3-button b3-button--outline"
                type="button"
                :disabled="running"
                @click="handleUploadRef(ref, ref.sourceType === 's3' || ref.sourceType === 'remote')"
              >
                {{ uploadButtonLabel(ref) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="notice" class="pigo-upload__notice">
      {{ notice }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import { getActiveDocId, subscribeActiveDoc } from '@/core/activeDoc'
import { ensureConfigLoaded, usePigoConfigStore } from '@/core/configStore'
import { scanDoc } from '@/core/scan/scanner'
import type { ImageRef, ScanDocResult, ScanStats } from '@/core/scan/types'
import {
  uploadAllNotes,
  uploadCurrentDoc,
  uploadSingleRef,
  type PipelineProgress,
  type PipelineResult,
} from '@/core/upload/pipeline'
import { uiState } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin
}>()

const store = usePigoConfigStore()

const currentDocId = ref('')
const scanResult = ref<ScanDocResult | null>(null)
const lastScanAt = ref<number | null>(null)
const loading = ref(false)
const running = ref(false)
const error = ref('')
const notice = ref('')
const previewErrors = ref(new Set<string>())
const progress = ref<PipelineProgress | null>(null)
const lastPipeline = ref<PipelineResult | null>(null)

let scanGeneration = 0
let refreshTimer: number | undefined
let unsubscribeActiveDoc: (() => void) | null = null
let noticeTimer: number | undefined
let cancelRequested = false

const uniqueRefs = computed(() => scanResult.value?.uniqueRefs ?? [])
const refs = computed(() => scanResult.value?.refs ?? [])
const stats = computed<ScanStats | null>(() => scanResult.value?.stats ?? null)

const scanTimeText = computed(() => {
  if (!lastScanAt.value) {
    return ''
  }
  return new Date(lastScanAt.value).toLocaleTimeString()
})

const occurrenceCounts = computed(() => {
  const counts = new Map<string, number>()
  refs.value.forEach((ref) => {
    counts.set(ref.normalizedUrl, (counts.get(ref.normalizedUrl) || 0) + 1)
  })
  return counts
})

const phaseLabel = computed(() => {
  switch (progress.value?.phase) {
    case 'scanning':
      return '扫描全部笔记'
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
    return 0
  }
  return Math.min(100, Math.round((progress.value.done / progress.value.total) * 100))
})

const pipelineErrors = computed(() => {
  if (!lastPipeline.value) {
    return []
  }

  const errors: string[] = []
  lastPipeline.value.upload.results.forEach((result) => {
    if (!result.ok && result.error) {
      errors.push(`${displayText(result.ref.url)}：${result.error}`)
    }
  })
  errors.push(...lastPipeline.value.replace.errors)
  return errors
})

onMounted(async () => {
  currentDocId.value = getActiveDocId()
  unsubscribeActiveDoc = subscribeActiveDoc(props.plugin, (change) => {
    currentDocId.value = change.docId
    if (uiState.popupVisible && uiState.activeTab === 'upload' && !running.value) {
      scheduleRefresh(change.docId)
    }
  })

  await ensureConfigLoaded(props.plugin)
  if (uiState.popupVisible && uiState.activeTab === 'upload' && !running.value) {
    await refresh()
  }
})

onBeforeUnmount(() => {
  unsubscribeActiveDoc?.()
  unsubscribeActiveDoc = null
  if (refreshTimer) {
    window.clearTimeout(refreshTimer)
  }
  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }
})

watch(
  () => uiState.popupVisible,
  (visible) => {
    if (visible && uiState.activeTab === 'upload' && !running.value) {
      scheduleRefresh(getActiveDocId())
    }
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

async function refresh(docId: string = getActiveDocId()): Promise<void> {
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
  currentDocId.value = docId
  loading.value = true
  error.value = ''
  previewErrors.value.clear()

  if (scanResult.value?.doc.id !== docId) {
    scanResult.value = null
  }

  try {
    await ensureConfigLoaded(props.plugin)
    const result = await scanDoc(docId, store.config)
    if (generation !== scanGeneration) {
      return
    }
    scanResult.value = result
    lastScanAt.value = result.scannedAt
  }
  catch (scanError) {
    if (generation !== scanGeneration) {
      return
    }
    error.value = scanError instanceof Error ? scanError.message : String(scanError)
  }
  finally {
    if (generation === scanGeneration) {
      loading.value = false
    }
  }
}

function scheduleRefresh(docId: string): void {
  if (refreshTimer) {
    window.clearTimeout(refreshTimer)
  }
  refreshTimer = window.setTimeout(() => {
    void refresh(docId)
  }, 150)
}

async function handleUploadRef(ref: ImageRef, force: boolean): Promise<void> {
  if (running.value) {
    return
  }

  if (force && !window.confirm('该图片已经是网络/已上传图片，是否重新上传？')) {
    return
  }

  await runPipeline(() => uploadSingleRef(ref, store.config, {
    force,
    onProgress: (value) => {
      progress.value = value
    },
    isCancelled: () => cancelRequested,
  }))
}

async function handleUploadAll(force: boolean): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  if (!scanResult.value) {
    await refresh()
  }
  const currentScan = scanResult.value
  if (!currentScan) {
    return
  }

  const message = force
    ? '将强制重新上传本文档所有图片（包括已上传 S3），会生成新的对象，是否继续？'
    : '将上传本文档中未上传的图片（本地/网络），并替换文档链接，是否继续？'
  if (!window.confirm(message)) {
    return
  }

  await runPipeline(() => uploadCurrentDoc(currentScan, store.config, {
    force,
    includeTitleImage: store.config.behavior.includeTitleImage,
    includeRemoteImages: store.config.behavior.includeRemoteImages,
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
  if (!scanResult.value) {
    await refresh()
  }
  const currentScan = scanResult.value
  if (!currentScan) {
    return
  }

  await runPipeline(() => uploadCurrentDoc(currentScan, store.config, {
    repairOnly: true,
    includeTitleImage: true,
    includeRemoteImages: true,
    onProgress: (value) => {
      progress.value = value
    },
    isCancelled: () => cancelRequested,
  }))
}

async function handleUploadAllNotes(): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  if (!window.confirm('将扫描全部笔记并上传未上传图片，可能耗时较长，是否继续？')) {
    return
  }

  await runPipeline(() => uploadAllNotes(store.config, {
    includeTitleImage: store.config.behavior.includeTitleImage,
    includeRemoteImages: store.config.behavior.includeRemoteImages,
    onProgress: (value) => {
      progress.value = value
    },
    isCancelled: () => cancelRequested,
  }))
}

async function runPipeline(task: () => Promise<PipelineResult>): Promise<void> {
  running.value = true
  cancelRequested = false
  progress.value = null
  lastPipeline.value = null
  error.value = ''

  try {
    await ensureConfigLoaded(props.plugin)
    const result = await task()
    lastPipeline.value = result
    const failed = result.upload.failed + result.replace.errors.length
    showNotice(failed > 0 ? '上传完成，但有失败项，请查看结果。' : '上传完成。')
  }
  catch (pipelineError) {
    error.value = pipelineError instanceof Error ? pipelineError.message : String(pipelineError)
    showNotice('上传失败。')
  }
  finally {
    running.value = false
    await refresh()
  }
}

function cancelUpload(): void {
  cancelRequested = true
  showNotice('正在停止…')
}

function previewUrl(ref: ImageRef): string {
  if (ref.sourceType === 'local' && ref.assetPath) {
    return encodeURI(`/${ref.assetPath}`)
  }
  return ref.url
}

function markPreviewError(id: string): void {
  previewErrors.value.add(id)
}

function displayUrl(ref: ImageRef): string {
  return displayText(ref.url, ref.sourceType === 'data')
}

function displayText(value: string, isData = false): string {
  if (isData || value.startsWith('data:')) {
    return 'data:image/...'
  }
  return value.length > 160 ? `${value.slice(0, 157)}...` : value
}

function badges(ref: ImageRef): Array<{ text: string, className: string }> {
  const result: Array<{ text: string, className: string }> = []
  if (ref.kind === 'title') {
    result.push({ text: '题头图', className: 'pigo-upload__badge--title' })
  }

  switch (ref.sourceType) {
    case 'local':
      result.push({ text: '本地', className: 'pigo-upload__badge--local' })
      break
    case 's3':
      result.push({ text: 'S3', className: 'pigo-upload__badge--s3' })
      break
    case 'data':
      result.push({ text: 'Data URI', className: 'pigo-upload__badge--data' })
      break
    default:
      result.push({ text: '网络', className: 'pigo-upload__badge--remote' })
  }

  return result
}

function uploadButtonLabel(ref: ImageRef): string {
  if (ref.sourceType === 's3') {
    return '重新上传'
  }
  if (ref.sourceType === 'remote') {
    return '上传到 S3'
  }
  return '上传'
}

function occurrenceCount(ref: ImageRef): number {
  return occurrenceCounts.value.get(ref.normalizedUrl) || 1
}

async function copyUrl(ref: ImageRef): Promise<void> {
  try {
    await navigator.clipboard.writeText(ref.url)
    showNotice('链接已复制')
  }
  catch {
    showNotice('复制失败，请手动复制')
  }
}

function showNotice(message: string): void {
  notice.value = message
  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
  }
  noticeTimer = window.setTimeout(() => {
    notice.value = ''
  }, 1800)
}
</script>

<style scoped>
.pigo-upload {
  padding: 14px 16px 24px;
  box-sizing: border-box;
}

.pigo-upload__toolbar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 12px;
}

.pigo-upload__doc {
  min-width: 0;
}

.pigo-upload__doc-title {
  overflow: hidden;
  color: var(--b3-theme-on-background, #dfe0e1);
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 4px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
}

.pigo-upload__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 0 0 auto;
}

.pigo-upload__state {
  padding: 28px 8px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 13px;
}

.pigo-upload__state--error {
  color: var(--b3-theme-error, #d23f31);
}

.pigo-upload__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.pigo-upload__stat {
  padding: 2px 8px;
  border-radius: 10px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.12));
  font-size: 12px;
  line-height: 1.6;
}

.pigo-upload__stat b {
  color: var(--b3-theme-on-background, #dfe0e1);
}

.pigo-upload__stat--local b {
  color: var(--b3-theme-warning, #e6a23c);
}

.pigo-upload__stat--s3 b {
  color: var(--b3-theme-primary, #3573f0);
}

.pigo-upload__stat--remote b {
  color: var(--b3-theme-success, #67c23a);
}

.pigo-upload__progress {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
  font-size: 12px;
}

.pigo-upload__progress-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--b3-theme-on-background, #dfe0e1);
  font-weight: 600;
}

.pigo-upload__progress-bar {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
}

.pigo-upload__progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--b3-theme-primary, #3573f0);
  transition: width 0.2s ease;
}

.pigo-upload__progress-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 6px;
  color: var(--b3-theme-on-surface-light, #999);
}

.pigo-upload__progress-current {
  margin-top: 4px;
  overflow: hidden;
  color: var(--b3-theme-on-surface-light, #999);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__result {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
  font-size: 12px;
  line-height: 1.7;
}

.pigo-upload__result-summary {
  color: var(--b3-theme-on-background, #dfe0e1);
}

.pigo-upload__result-warning {
  margin-top: 4px;
  color: var(--b3-theme-warning, #e6a23c);
}

.pigo-upload__result-errors {
  margin-top: 6px;
  color: var(--b3-theme-error, #d23f31);
}

.pigo-upload__result-errors ul {
  max-height: 180px;
  margin: 4px 0 0;
  padding-left: 18px;
  overflow: auto;
}

.pigo-upload__result-errors li {
  overflow-wrap: anywhere;
}

.pigo-upload__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pigo-upload__item {
  display: flex;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.08));
}

.pigo-upload__thumb {
  flex: 0 0 132px;
  width: 132px;
  height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 6px;
  background: var(--b3-theme-background, #1f1f1f);
}

.pigo-upload__thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.pigo-upload__thumb-fallback {
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
}

.pigo-upload__info {
  min-width: 0;
  flex: 1 1 auto;
}

.pigo-upload__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pigo-upload__badge {
  padding: 1px 7px;
  border-radius: 9px;
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
}

.pigo-upload__badge--local {
  color: #a86b00;
  background: rgba(230, 162, 60, 0.18);
}

.pigo-upload__badge--s3 {
  color: #2f6fdc;
  background: rgba(53, 115, 240, 0.16);
}

.pigo-upload__badge--remote {
  color: #2f8f4e;
  background: rgba(103, 194, 58, 0.16);
}

.pigo-upload__badge--data {
  color: #8a5cd6;
  background: rgba(138, 92, 214, 0.16);
}

.pigo-upload__badge--title {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.16);
}

.pigo-upload__alt {
  overflow: hidden;
  color: var(--b3-theme-on-background, #dfe0e1);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__url {
  margin-top: 4px;
  overflow: hidden;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-upload__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 4px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 11px;
}

.pigo-upload__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.pigo-upload__notice {
  position: sticky;
  bottom: 0;
  margin-top: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--b3-theme-primary, #3573f0);
  background: var(--b3-theme-primary-lightest, rgba(53, 115, 240, 0.12));
  font-size: 12px;
}

@media (max-width: 640px) {
  .pigo-upload__toolbar {
    flex-direction: column;
  }

  .pigo-upload__item {
    flex-direction: column;
  }

  .pigo-upload__thumb {
    width: 100%;
    height: 160px;
    flex-basis: auto;
  }
}
</style>
