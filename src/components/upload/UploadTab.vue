<template>
  <div class="pigo-upload">
    <div class="pigo-upload__toolbar">
      <div class="pigo-upload__doc">
        <div class="pigo-upload__doc-title">
          {{ doc?.title || (currentDocId ? '正在读取文档…' : '未选择文档') }}
        </div>
        <div class="pigo-upload__doc-meta">
          <span v-if="doc?.path">{{ doc.path }}</span>
          <span v-if="currentDocId">ID: {{ currentDocId }}</span>
          <span v-if="lastScanAt">扫描于 {{ scanTimeText }}</span>
        </div>
      </div>
      <div class="pigo-upload__actions">
        <button class="b3-button b3-button--outline" type="button" :disabled="loading" @click="refresh()">
          {{ loading ? '扫描中…' : '刷新' }}
        </button>
        <button class="b3-button b3-button--outline" type="button" disabled title="Phase 4 接入">
          上传本文档全部（Phase 4）
        </button>
      </div>
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
              <button class="b3-button b3-button--outline" type="button" disabled title="Phase 4 接入">
                上传（Phase 4）
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
import type { DocMeta, ImageRef, ScanStats } from '@/core/scan/types'
import { uiState } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin
}>()

const store = usePigoConfigStore()

const currentDocId = ref('')
const doc = ref<DocMeta | null>(null)
const refs = ref<ImageRef[]>([])
const uniqueRefs = ref<ImageRef[]>([])
const stats = ref<ScanStats | null>(null)
const lastScanAt = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const previewErrors = ref(new Set<string>())

let scanGeneration = 0
let refreshTimer: number | undefined
let unsubscribeActiveDoc: (() => void) | null = null
let noticeTimer: number | undefined

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

onMounted(async () => {
  currentDocId.value = getActiveDocId()
  unsubscribeActiveDoc = subscribeActiveDoc(props.plugin, (change) => {
    currentDocId.value = change.docId
    if (uiState.popupVisible && uiState.activeTab === 'upload') {
      scheduleRefresh(change.docId)
    }
  })

  await ensureConfigLoaded(props.plugin)
  if (uiState.popupVisible && uiState.activeTab === 'upload') {
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
    if (visible && uiState.activeTab === 'upload') {
      scheduleRefresh(getActiveDocId())
    }
  }
)

watch(
  () => uiState.activeTab,
  (tab) => {
    if (tab === 'upload' && uiState.popupVisible) {
      scheduleRefresh(getActiveDocId())
    }
  }
)

async function refresh(docId: string = getActiveDocId()): Promise<void> {
  if (!docId) {
    currentDocId.value = ''
    doc.value = null
    refs.value = []
    uniqueRefs.value = []
    stats.value = null
    error.value = '请先打开一篇笔记。'
    return
  }

  const generation = ++scanGeneration
  currentDocId.value = docId
  loading.value = true
  error.value = ''
  previewErrors.value.clear()

  if (doc.value?.id !== docId) {
    doc.value = null
    refs.value = []
    uniqueRefs.value = []
    stats.value = null
  }

  try {
    await ensureConfigLoaded(props.plugin)
    const result = await scanDoc(docId, store.config)
    if (generation !== scanGeneration) {
      return
    }
    doc.value = result.doc
    refs.value = result.refs
    uniqueRefs.value = result.uniqueRefs
    stats.value = result.stats
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
  if (ref.sourceType === 'data') {
    return 'data:image/...'
  }
  return ref.url.length > 160 ? `${ref.url.slice(0, 157)}...` : ref.url
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
