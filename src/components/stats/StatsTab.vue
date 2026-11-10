<template>
  <div class="pigo-stats">
    <!-- 范围与操作 -->
    <section class="pigo-stats__toolbar">
      <div class="pigo-stats__toolbar-row">
        <div class="pigo-stats__scope" role="tablist" aria-label="统计范围">
          <button
            class="pigo-stats__scope-btn"
            :class="{ 'pigo-stats__scope-btn--active': scope === 'doc' }"
            type="button"
            role="tab"
            :aria-selected="scope === 'doc'"
            :disabled="running"
            @click="switchScope('doc')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>当前文档</span>
          </button>
          <button
            class="pigo-stats__scope-btn"
            :class="{ 'pigo-stats__scope-btn--active': scope === 'all' }"
            type="button"
            role="tab"
            :aria-selected="scope === 'all'"
            :disabled="running"
            @click="switchScope('all')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="8" rx="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            <span>全库</span>
          </button>
        </div>

        <pigo-button variant="secondary" size="sm" :loading="running && progress?.phase === 'scanning'" :disabled="running" @click="scanStats(scope)">
          <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
            <path d="M518.217143 432.64V73.142857A73.142857 73.142857 0 0 1 603.428571 1.097143 512 512 0 0 1 1022.902857 420.571429 73.142857 73.142857 0 0 1 950.857143 505.782857H591.36a73.142857 73.142857 0 0 1-73.142857-73.142857z"></path>
            <path d="M493.714286 566.857143h340.297143a73.142857 73.142857 0 0 1 73.142857 85.577143A457.142857 457.142857 0 1 1 371.565714 117.76a73.142857 73.142857 0 0 1 85.577143 73.142857V530.285714a36.571429 36.571429 0 0 0 36.571429 36.571429z"></path>
          </svg>
          开始统计
        </pigo-button>
        <pigo-button v-if="running" variant="outline" size="sm" @click="cancel">
          取消
        </pigo-button>

        <span class="pigo-stats__spacer"></span>

        <pigo-button
          variant="outline"
          size="sm"
          class="pigo-stats__repair"
          :title="repairTitle"
          :disabled="running || !snapshot || (stats?.uploadedButNotReplaced ?? 0) === 0"
          @click="handleRepair"
        >
          <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
            <path d="M262.4 1017.6c-64 0-128-25.6-179.2-76.8-102.4-102.4-102.4-262.4 0-364.8l134.4-134.4 89.6 89.6-134.4 134.4c-51.2 51.2-51.2 128 0 179.2 51.2 51.2 128 51.2 179.2 0l179.2-179.2c25.6-25.6 38.4-57.6 38.4-89.6S556.8 512 537.6 486.4L467.2 422.4l89.6-89.6 70.4 70.4C672 448 697.6 512 697.6 582.4c0 70.4-25.6 134.4-76.8 179.2l-179.2 179.2C396.8 992 326.4 1017.6 262.4 1017.6z"></path>
            <path d="M467.2 691.2 396.8 627.2c-102.4-102.4-102.4-262.4 0-364.8l179.2-179.2c102.4-102.4 262.4-102.4 364.8 0 102.4 102.4 102.4 262.4 0 364.8l-134.4 134.4-89.6-89.6 134.4-134.4c51.2-51.2 51.2-128 0-179.2-51.2-51.2-134.4-51.2-179.2 0L486.4 352c-51.2 51.2-51.2 128 0 179.2l70.4 70.4L467.2 691.2z"></path>
          </svg>
          {{ scope === 'all' ? '修复全库S3链接' : '修复S3链接' }}
        </pigo-button>

        <pigo-button
          variant="primary"
          size="sm"
          :disabled="running || !snapshot || (stats?.local ?? 0) === 0"
          @click="handleUploadUnuploaded"
        >
          <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
            <path d="M469.333333 682.666667V42.666667c0-23.466667 19.2-42.666667 42.666667-42.666667s42.666667 19.2 42.666667 42.666667v640c0 23.466667-19.2 42.666667-42.666667 42.666666s-42.666667-19.2-42.666667-42.666666"></path>
            <path d="M226.210133 268.0576L481.826133 12.433067a42.7776 42.7776 0 0 1 60.330667 0c16.597333 16.597333 16.597333 43.776 0 60.330666L286.5408 328.388267a42.7776 42.7776 0 0 1-60.330667 0 42.7776 42.7776 0 0 1 0-60.330667"></path>
            <path d="M542.0544 12.4416l255.616 255.616a42.7776 42.7776 0 0 1 0 60.330667c-16.597333 16.605867-43.776 16.605867-60.330667 0L481.723733 72.789333a42.7776 42.7776 0 0 1 0-60.330666 42.7776 42.7776 0 0 1 60.330667 0M896 1024H128c-70.570667 0-128-57.429333-128-128V640c0-23.594667 19.072-42.666667 42.666667-42.666667s42.666667 19.072 42.666666 42.666667v256c0 23.552 19.114667 42.666667 42.666667 42.666667h768c23.552 0 42.666667-19.114667 42.666667-42.666667V640c0-23.594667 19.072-42.666667 42.666666-42.666667s42.666667 19.072 42.666667 42.666667v256c0 70.570667-57.429333 128-128 128"></path>
          </svg>
          {{ scope === 'all' ? '上传全库本地图片' : '上传本地图片' }}
        </pigo-button>

        <pigo-button
          variant="ghost"
          size="sm"
          class="pigo-stats__export"
          :disabled="!snapshot"
          title="导出 CSV 报表"
          aria-label="导出 CSV 报表"
          @click="exportCsv"
        >
          <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
            <path d="M738.8751591 953.16515795H148.53109306c-78.24915548 0-141.88583414-63.63667862-141.88583413-141.85950529V220.93525777c0-78.22282671 63.63667862-141.85950533 141.88583413-141.85950532h397.67000147c21.19467369 0 38.38737172 17.19269802 38.38737171 38.38737171s-17.19269802 38.38737172-38.38737171 38.38737171H148.53109306c-35.88613695 0-65.08476193 29.19862498-65.08476195 65.0847619v590.37039489c0 35.88613695 29.19862498 65.08476193 65.08476195 65.08476189h590.34406604c35.88613695 0 65.08476193-29.19862498 65.08476191-65.08476189V504.12769263c0-21.22100244 17.19269802-38.38737172 38.38737169-38.38737169s38.38737172 17.19269802 38.38737172 38.38737169v307.1516312c0.02632879 78.24915548-63.61034981 141.88583414-141.85950532 141.88583412z"></path>
            <path d="M368.56076748 782.15968523c-21.19467369 0-38.38737172-17.19269802-38.38737173-38.38737173v-49.55077743c0-238.30185277 193.85885998-432.16071271 432.13438396-432.16071275h209.78777623c21.19467369 0 38.38737172 17.19269802 38.38737169 38.38737171s-17.19269802 38.38737172-38.38737169 38.38737169h-209.78777623c-195.93883415 0-355.35964055 159.42080636-355.35964053 355.35964054v49.55077748c0 21.24733122-17.19269802 38.41370053-38.3873717 38.41370049z"></path>
            <path d="M979.44128756 334.59663196c-9.05710281 0-18.14053437-3.18578325-25.43360843-9.66266485l-207.78678839-184.30151024c-15.87625868-14.05957233-17.32434196-38.33471417-3.23844084-54.184644 14.05957233-15.84992988 38.33471417-17.32434196 54.18464401-3.23844085l207.7867884 184.30151025c15.87625868 14.05957233 17.32434196 38.33471417 3.23844084 54.184644-7.55636192 8.53052707-18.14053437 12.9011057-28.75103559 12.90110569z"></path>
          </svg>
        </pigo-button>
      </div>

      <div class="pigo-stats__meta-row">
        <div class="pigo-stats__meta">
          <template v-if="snapshot">
            <span>扫描于 <b>{{ scannedAtText }}</b></span>
            <span class="pigo-stats__sep">·</span>
            <span>耗时 <b>{{ snapshot.durationMs }} ms</b></span>
            <template v-if="snapshot.scope === 'all'">
              <span class="pigo-stats__sep">·</span>
              <span>文档 <b>{{ stats?.totalDocs ?? 0 }}</b> 篇（含图 <b>{{ stats?.docs ?? 0 }}</b> 篇）</span>
            </template>
            <template v-else>
              <span class="pigo-stats__sep">·</span>
              <span>当前文档 <b>{{ currentDocTitle }}</b></span>
            </template>
            <span class="pigo-stats__sep">·</span>
            <span>资源文件 <b>{{ stats?.assetFiles ?? 0 }}</b></span>
            <span class="pigo-stats__sep">·</span>
            <span>题头图资源 <b>{{ stats?.titleAssets ?? 0 }}</b></span>
          </template>
          <template v-else>
            <span>{{ running ? progressText : '选择范围后点击「开始统计」' }}</span>
          </template>
        </div>

        <div class="pigo-stats__meta-right">
          <pigo-health-dot
            :state="healthState"
            :label="healthLabel"
            :title="health?.message || '点击重新检查 S3 连接'"
            clickable
            @click="checkHealth(true)"
          />
        </div>
      </div>

    </section>

    <!-- KPI -->
    <section v-if="stats" class="pigo-stats__kpis">
      <div v-for="item in kpis" :key="item.key" class="pigo-stats__kpi" :class="`pigo-stats__kpi--${item.tone}`">
        <div class="pigo-stats__kpi-head">
          <span class="pigo-stats__kpi-label">{{ item.label }}</span>
          <span class="pigo-stats__kpi-dot" aria-hidden="true"></span>
        </div>
        <div class="pigo-stats__kpi-value">
          {{ item.value }}
        </div>
        <div v-if="item.hint" class="pigo-stats__kpi-hint">
          {{ item.hint }}
        </div>
      </div>
    </section>

    <!-- 筛选 + 搜索 -->
    <section v-if="snapshot" class="pigo-stats__filters-row">
      <div class="pigo-stats__filters">
        <pigo-chip
          v-for="filter in filters"
          :key="filter.id"
          :tone="filter.tone"
          :count="filter.count"
          clickable
          :active="activeFilter === filter.id"
          @click="activeFilter = filter.id"
        >
          {{ filter.label }}
        </pigo-chip>
      </div>
      <label class="pigo-stats__search">
        <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
          <path d="M974.848 975.872c-24.064 24.064-60.416 24.064-84.48 0L702.976 788.48c-163.328 120.832-387.072 114.688-538.112-24.064-169.472-157.184-181.248-435.2-17.92-604.16s435.2-175.104 604.672-6.144c151.04 151.04 163.328 386.56 36.352 549.888l187.392 187.392c24.064 24.064 24.064 59.904-0.512 84.48zM690.688 274.944c-120.832-168.96-368.64-168.96-489.984 0-78.848 102.912-78.848 253.952 0 356.352 120.832 168.96 368.64 168.96 489.984 0 78.848-108.544 78.848-253.952 0-356.352z"></path>
        </svg>
        <input
          v-model="searchText"
          class="pigo-input pigo-stats__search-input"
          type="search"
          placeholder="搜索文档、地址或描述…"
        >
      </label>
    </section>

    <!-- 空态 -->
    <div v-if="!snapshot && !running" class="pigo-stats__empty">
      <div class="pigo-stats__empty-title">
        还没有统计数据
      </div>
      <div class="pigo-stats__empty-desc">
        选择「当前文档」或「全库」，然后点击「开始统计」。全库统计通过思源 SQL 读取图片引用，通常几秒内完成。
      </div>
    </div>

    <template v-if="snapshot">
      <div v-if="filteredRefs.length === 0" class="pigo-stats__empty pigo-stats__empty--small">
        当前筛选没有匹配的图片。
      </div>

      <section v-else class="pigo-stats__grid">
        <article v-for="ref in visibleRefs" :key="ref.id" class="pigo-stats__item" tabindex="-1">
          <div class="pigo-stats__item-main">
            <button
              class="pigo-stats__thumb"
              type="button"
              title="点击预览"
              :aria-label="`预览 ${fileName(ref)}`"
              @click="openPreview(ref)"
            >
              <img
                v-if="canPreview(ref) && !previewErrors.has(ref.id)"
                :src="previewUrl(ref)"
                :alt="ref.alt"
                loading="lazy"
                @error="markPreviewError(ref.id)"
              >
              <span v-else class="pigo-stats__thumb-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </span>
              <span v-if="extOf(ref) || sizeOf(ref)" class="pigo-stats__badge-strip">
                <span v-if="sizeOf(ref)" class="pigo-stats__badge-cell">{{ formatSizeBadge(sizeOf(ref)) }}</span>
                <span v-if="extOf(ref)" class="pigo-stats__badge-cell pigo-stats__badge-cell--ext">{{ extOf(ref) }}</span>
              </span>
            </button>

            <div class="pigo-stats__item-body">
              <div class="pigo-stats__badges">
                <pigo-chip :tone="sourceTone(ref)">{{ sourceLabel(ref) }}</pigo-chip>
                <pigo-chip v-if="ref.kind === 'title'" tone="title">题头图</pigo-chip>
                <pigo-chip v-if="isPending(ref)" tone="warning">已上传未替换</pigo-chip>
                <span class="pigo-stats__item-doc" :title="ref.docPath || ref.docId">{{ ref.docTitle || ref.docId }}</span>
              </div>

              <p class="pigo-stats__item-path" :title="ref.sourceType === 'data' ? 'Data URI' : ref.url">
                {{ displayPath(ref) }}
              </p>

              <div class="pigo-stats__item-meta">
                <span v-if="ref.kind === 'title'">文档题头图</span>
                <span v-else>块 {{ ref.blockId }}</span>
                <span v-if="ref.s3Key" :title="ref.s3Key">Key {{ shortKey(ref.s3Key) }}</span>
                <span v-if="ref.assetPath" :title="ref.assetPath">文件 {{ ref.assetPath }}</span>
              </div>
            </div>
          </div>

          <div class="pigo-stats__item-footer">
            <span class="pigo-stats__status" :class="`pigo-stats__status--${statusTone(ref)}`">
              <i aria-hidden="true"></i>
              {{ statusText(ref) }}
            </span>

            <div class="pigo-stats__item-actions">
              <pigo-button
                v-if="ref.sourceType === 'local' && ref.assetPath"
                variant="ghost"
                size="sm"
                @click="copyText(ref.assetPath, '路径已复制。')"
              >
                复制路径
              </pigo-button>
              <pigo-button
                v-if="ref.sourceType === 's3' || ref.sourceType === 'remote'"
                variant="ghost"
                size="sm"
                @click="copyText(ref.url, '链接已复制。')"
              >
                复制链接
              </pigo-button>
              <pigo-button variant="ghost" size="sm" @click="copyMarkdown(ref)">
                复制MD链接
              </pigo-button>

              <pigo-button
                v-if="ref.sourceType === 'local' || ref.sourceType === 'data'"
                variant="outline"
                size="sm"
                class="pigo-stats__action-primary"
                :loading="singleRunningId === ref.id"
                :disabled="running"
                @click="uploadOne(ref)"
              >
                立即上传
              </pigo-button>
              <pigo-button
                v-else-if="ref.sourceType === 'remote'"
                variant="outline"
                size="sm"
                class="pigo-stats__action-primary"
                :loading="singleRunningId === ref.id"
                :disabled="running"
                @click="uploadOne(ref)"
              >
                转存至S3
              </pigo-button>
              <pigo-button
                v-else
                variant="outline"
                size="sm"
                class="pigo-stats__action-primary"
                :loading="singleRunningId === ref.id"
                :disabled="running"
                @click="uploadOne(ref)"
              >
                重新上传
              </pigo-button>
            </div>
          </div>
        </article>
      </section>

      <div v-if="filteredRefs.length > visibleLimit" class="pigo-stats__more">
        <pigo-button variant="outline" size="sm" @click="visibleLimit += 300">
          加载更多（剩余 {{ filteredRefs.length - visibleLimit }}）
        </pigo-button>
      </div>
    </template>

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
import PigoButton from '@/components/ui/PigoButton.vue'
import PigoChip from '@/components/ui/PigoChip.vue'
import PigoHealthDot from '@/components/ui/PigoHealthDot.vue'
import PigoImagePreview from '@/components/ui/PigoImagePreview.vue'
import { getActiveDocId, subscribeActiveDoc } from '@/core/activeDoc'
import { configState, ensureConfigLoaded, ensureConfigReady, usePigoConfigStore } from '@/core/configStore'
import { toUserMessage } from '@/core/errors'
import { logError, logWarn } from '@/core/log'
import { checkS3Health, type S3HealthResult } from '@/core/s3/health'
import { describeStorage } from '@/core/s3/describe'
import { createS3Client } from '@/core/s3/client'
import type { ImageRef, ScanAllResult, ScanDocResult } from '@/core/scan/types'
import { extensionOf } from '@/core/stats/assetMeta'
import { fillRefSizes, formatSizeBadge } from '@/core/stats/refSize'
import { isUploadedButNotReplaced as hasUploadRecord } from '@/core/stats/aggregate'
import { buildStatsCsv, downloadTextFile, exportFileName } from '@/core/stats/export'
import {
  buildStatsSnapshot,
  type StatsScope,
  type StatsSnapshot,
} from '@/core/stats/service'
import { updateStatusBar } from '@/core/statusBar'
import { pushToast } from '@/core/toastStore'
import {
  uploadAllNotes,
  uploadCurrentDoc,
  uploadSingleRef,
  type PipelineProgress,
} from '@/core/upload/pipeline'
import { uiState } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin
}>()

type FilterId = 'all' | 'local' | 's3' | 'remote' | 'data' | 'title' | 'pending'
type Tone = 'default' | 'local' | 's3' | 'remote' | 'data' | 'title' | 'success' | 'warning' | 'danger' | 'muted'

interface StatsProgress {
  phase: 'scanning' | 'analyzing' | 'uploading' | 'replacing' | 'done'
  done: number
  total: number
  current?: string
}

interface KpiItem {
  key: string
  label: string
  value: number | string
  tone: 'neutral' | 'blue' | 'amber' | 'emerald' | 'cyan' | 'purple' | 'rose'
  hint?: string
}

const store = usePigoConfigStore()

const scope = ref<StatsScope>('all')
const allSnapshot = ref<StatsSnapshot | null>(null)
const docSnapshot = ref<StatsSnapshot | null>(null)
const docSnapshotDocId = ref('')
const currentDocId = ref('')
const running = ref(false)
const progress = ref<StatsProgress | null>(null)
const activeFilter = ref<FilterId>('all')
const searchText = ref('')
const visibleLimit = ref(300)
const singleRunningId = ref('')
const previewRef = ref<ImageRef | null>(null)
const previewErrors = ref(new Set<string>())
const sizeMap = reactive(new Map<string, number | null>())

const health = ref<S3HealthResult | null>(null)
const healthChecking = ref(false)

let cancelRequested = false
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

const currentDocTitle = computed(() => {
  const fromAll = findDocMeta(currentDocId.value)
  if (fromAll) {
    return fromAll
  }
  return currentDocId.value || '未打开文档'
})

const scannedAtText = computed(() => {
  if (!snapshot.value) {
    return ''
  }
  const date = new Date(snapshot.value.scannedAt)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
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

const progressText = computed(() => {
  const value = progress.value
  if (!value) {
    return ''
  }
  const parts = [phaseLabel.value]
  if (value.total > 0) {
    parts.push(`${value.done}/${value.total}`)
  }
  if (value.current) {
    parts.push(value.current)
  }
  return parts.join(' · ')
})

const repairTitle = computed(() => {
  const pending = stats.value?.uploadedButNotReplaced ?? 0
  if (pending <= 0) {
    return '没有需要替换的链接'
  }
  return `根据 fileMap 中已有的上传记录替换 ${pending} 张图片的链接（不会重新上传对象）`
})

const healthState = computed<'ok' | 'error' | 'checking'>(() => {
  if (healthChecking.value || !health.value) {
    return 'checking'
  }
  return health.value.ok ? 'ok' : 'error'
})

const healthLabel = computed(() => {
  if (healthChecking.value || !health.value) {
    return '正在检查 S3 连接…'
  }
  const vendor = describeStorage(store.config.s3).vendor || 'S3'
  return health.value.ok ? `${vendor} 节点连接正常` : `${vendor} 节点连接失败`
})

const kpis = computed<KpiItem[]>(() => {
  const value = stats.value
  if (!value) {
    return []
  }

  return [
    { key: 'total', label: '总引用', value: formatNumber(value.totalRefs), tone: 'neutral' },
    { key: 'unique', label: '唯一图片', value: formatNumber(value.uniqueRefs), tone: 'blue' },
    { key: 'local', label: '本地图片', value: formatNumber(value.local), tone: 'amber', hint: '仍是 assets/... 链接' },
    { key: 's3', label: '已上传 S3', value: formatNumber(value.s3), tone: 'emerald' },
    { key: 'remote', label: '网络图片', value: formatNumber(value.remote), tone: 'cyan' },
    { key: 'data', label: 'Data URI', value: formatNumber(value.data), tone: 'neutral' },
    { key: 'title', label: '题头图', value: formatNumber(value.title), tone: 'rose' },
    { key: 'pending', label: '已上传未替换', value: formatNumber(value.uploadedButNotReplaced), tone: 'purple' },
    { key: 'docs', label: '含图文档', value: formatNumber(value.docs), tone: 'neutral' },
    { key: 'assets', label: '资源文件', value: formatNumber(value.assetFiles), tone: 'neutral' },
  ]
})

const uniqueRefs = computed<ImageRef[]>(() => snapshot.value?.result.uniqueRefs ?? [])

const filters = computed(() => {
  const refs = uniqueRefs.value
  const pending = refs.filter((ref) => isPending(ref)).length
  return [
    { id: 'all' as FilterId, label: '全部', count: refs.length, tone: 'default' as Tone },
    { id: 'local' as FilterId, label: '本地', count: refs.filter((ref) => ref.sourceType === 'local').length, tone: 'local' as Tone },
    { id: 's3' as FilterId, label: 'S3', count: refs.filter((ref) => ref.sourceType === 's3').length, tone: 's3' as Tone },
    { id: 'remote' as FilterId, label: '网络', count: refs.filter((ref) => ref.sourceType === 'remote').length, tone: 'remote' as Tone },
    { id: 'data' as FilterId, label: 'Data', count: refs.filter((ref) => ref.sourceType === 'data').length, tone: 'data' as Tone },
    { id: 'title' as FilterId, label: '题头图', count: refs.filter((ref) => ref.kind === 'title').length, tone: 'title' as Tone },
    { id: 'pending' as FilterId, label: '已上传未替换', count: pending, tone: 'warning' as Tone },
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

// 配置保存后让旧快照失效：统计里的 S3 判定依赖 customUrl / 前缀等配置。
watch(
  () => configState.revision,
  () => {
    allSnapshot.value = null
    docSnapshot.value = null
    docSnapshotDocId.value = ''
    activeFilter.value = 'all'
    searchText.value = ''
    void checkHealth(true)
    if (uiState.popupVisible && uiState.activeTab === 'stats') {
      void ensureStatsForCurrentTab()
    }
  }
)

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

// 配置变化时健康状态失效（缓存按配置指纹自动失效，这里负责重新展示）。
watch(
  () => store.config.s3,
  () => {
    if (uiState.popupVisible && uiState.activeTab === 'stats') {
      void checkHealth(true)
    }
  },
  { deep: true }
)

watch([activeFilter, searchText], () => {
  visibleLimit.value = 300
})

watch(visibleRefs, () => {
  if (uiState.popupVisible) {
    void resolveVisibleSizes()
  }
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
  void checkHealth()

  if (scope.value === 'all') {
    if (!allSnapshot.value && !running.value) {
      await scanStats('all')
    }
    return
  }

  if (!currentDocId.value) {
    pushToast('error', '请先打开一篇笔记。')
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

  // 目标范围还没有快照时自动统计一次，避免切过去看到空页。
  if (uiState.popupVisible && !running.value) {
    await ensureStatsForCurrentTab()
  }
}

async function scanStats(target: StatsScope, silent = false): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  const ready = await ensureConfigReady(props.plugin)
  if (!ready.ok) {
    pushToast('error', '请先在设置页补全 S3 配置后再统计。')
    uiState.activeTab = 'settings'
    return
  }

  const docId = getActiveDocId()
  if (target === 'doc' && !docId) {
    pushToast('error', '请先打开一篇笔记。')
    return
  }

  running.value = true
  cancelRequested = false
  progress.value = { phase: 'scanning', done: 0, total: 0 }
  updateStatusBar('正在统计图片…')
  if (!silent) {
    void checkHealth()
  }

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
      pushToast('info', `统计完成，${next.stats.uploadedButNotReplaced} 张图片已上传但链接未替换。`)
    }
    else {
      pushToast('success', '统计完成。')
    }
    updateStatusBar('统计完成')
  }
  catch (error) {
    if (cancelRequested) {
      pushToast('info', '已取消统计，保留上次结果。')
      updateStatusBar('统计已取消')
    }
    else {
      const message = toUserMessage(error)
      logError('统计失败', error)
      pushToast('error', `统计失败：${message}`)
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
    ? '将扫描全部笔记并上传所有本地图片（含题头图），可能耗时较长。上传会修改笔记中的图片链接，是否继续？'
    : '将上传本文档中的所有本地图片（含题头图）并替换文档链接，是否继续？'
  if (!window.confirm(message)) {
    return
  }

  if (!(await ensureStatsReady())) {
    return
  }

  running.value = true
  cancelRequested = false
  progress.value = { phase: 'uploading', done: 0, total: 0 }
  updateStatusBar('正在上传图片…')

  try {
    if (target === 'all') {
      await uploadAllNotes(store.config, {
        sourceTypes: ['local'],
        isCancelled: () => cancelRequested,
        onProgress: applyPipelineProgress,
      })
    }
    else {
      await uploadCurrentDoc(snapshot.value.result as ScanDocResult, store.config, {
        sourceTypes: ['local'],
        isCancelled: () => cancelRequested,
        onProgress: applyPipelineProgress,
      })
    }

    pushToast(cancelRequested ? 'info' : 'success', cancelRequested ? '已停止上传，已完成的部分已保留。' : '上传完成，正在重新统计…')
    updateStatusBar('上传完成')
    running.value = false
    progress.value = null
    await sleep(600)
    await scanStats(target, true)
  }
  catch (error) {
    const message = toUserMessage(error)
    logError('统计页上传失败', error)
    pushToast('error', `上传失败：${message}`)
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

  if (!(await ensureStatsReady())) {
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

    pushToast(cancelRequested ? 'info' : 'success', cancelRequested ? '已停止修复，已完成的部分已保留。' : '修复完成，正在重新统计…')
    updateStatusBar('修复完成')
    running.value = false
    progress.value = null
    await sleep(600)
    await scanStats(target, true)
  }
  catch (error) {
    const message = toUserMessage(error)
    logError('统计页修复失败', error)
    pushToast('error', `修复失败：${message}`)
    updateStatusBar('修复失败')
  }
  finally {
    running.value = false
    progress.value = null
  }
}

async function uploadOne(ref: ImageRef): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  if (!(await ensureStatsReady())) {
    return
  }

  singleRunningId.value = ref.id
  running.value = true
  cancelRequested = false
  progress.value = { phase: 'uploading', done: 0, total: 1, current: fileName(ref) }
  updateStatusBar('正在上传图片…')

  let failed = false
  try {
    const result = await uploadSingleRef(ref, store.config, {
      force: true,
      includeTitleImage: true,
      includeRemoteImages: true,
      isCancelled: () => cancelRequested,
      onProgress: applyPipelineProgress,
    })
    failed = result.upload.results.some((item) => !item.ok)
    if (failed) {
      pushToast('error', ref.sourceType === 'remote' ? '图片加载失败，可能已失效。' : '上传失败，请查看日志。')
    }
    else {
      pushToast('success', '上传完成。')
    }
    updateStatusBar(failed ? '上传失败' : '上传完成')
  }
  catch (error) {
    failed = true
    const message = toUserMessage(error)
    logError('统计页单图上传失败', error)
    pushToast('error', `上传失败：${message}`)
    updateStatusBar('上传失败')
  }
  finally {
    singleRunningId.value = ''
    running.value = false
    progress.value = null
  }

  if (!failed) {
    await sleep(600)
    await scanStats(scope.value, true)
  }
}

async function checkHealth(force = false): Promise<void> {
  await ensureConfigLoaded(props.plugin)
  const ready = await ensureConfigReady(props.plugin)
  if (!ready.ok) {
    health.value = {
      ok: false,
      message: 'S3 配置不完整，请先在设置页补全。',
      error: '配置不完整',
      checkedAt: Date.now(),
      latencyMs: 0,
    }
    healthChecking.value = false
    return
  }

  healthChecking.value = true
  try {
    health.value = await checkS3Health(store.config.s3, { force })
  }
  finally {
    healthChecking.value = false
  }
}

async function ensureStatsReady(): Promise<boolean> {
  const ready = await ensureConfigReady(props.plugin)
  if (ready.ok) {
    return true
  }

  const message = ready.issues.map((issue) => issue.message).join('；')
  pushToast('error', `配置不完整：${message}`)
  uiState.activeTab = 'settings'
  return false
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
  pushToast('info', '正在停止…')
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
  return hasUploadRecord(ref, snapshot.value.fileMaps)
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
  if (isPending(ref)) {
    return '已上传未替换'
  }
  switch (ref.sourceType) {
    case 's3':
      return '链接已同步'
    case 'remote':
      return '外部网络图源'
    case 'data':
      return '内嵌 Data URI'
    default:
      return '未替换至云端'
  }
}

function statusTone(ref: ImageRef): string {
  if (isPending(ref)) {
    return 'purple'
  }
  switch (ref.sourceType) {
    case 's3':
      return 'emerald'
    case 'remote':
      return 'cyan'
    case 'data':
      return 'purple'
    default:
      return 'amber'
  }
}

function canPreview(ref: ImageRef): boolean {
  return ref.sourceType !== 'data'
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

function openPreview(ref: ImageRef): void {
  if (!canPreview(ref)) {
    return
  }
  previewRef.value = ref
}

function displayPath(ref: ImageRef): string {
  if (ref.sourceType === 's3' && ref.s3Key) {
    return ref.s3Key
  }
  if (ref.sourceType === 'local' && ref.assetPath) {
    return ref.assetPath
  }
  if (ref.sourceType === 'data') {
    return 'data:image/...'
  }
  const url = ref.url
  return url.length > 160 ? `${url.slice(0, 157)}...` : url
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

async function resolveVisibleSizes(): Promise<void> {
  const current = snapshot.value
  if (!current) {
    return
  }

  const targets = visibleRefs.value.filter((ref) => (
    !sizeMap.has(ref.id)
    && ref.sourceType !== 'data'
    && !previewErrors.value.has(ref.id)
  ))
  if (targets.length === 0) {
    return
  }

  try {
    const client = createS3Client(store.config.s3)
    await fillRefSizes(
      targets,
      client,
      (ref) => current.fileMaps.get(ref.docId),
      (id, size) => sizeMap.set(id, size ?? null)
    )
  }
  catch (error) {
    logWarn('读取统计图片大小失败', error)
  }
}

function shortKey(key: string): string {
  const parts = key.split('/').filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : key
}

function findDocMeta(docId: string): string {
  if (!docId) {
    return ''
  }
  const all = allSnapshot.value?.result
  if (all && 'docs' in all) {
    const doc = (all as ScanAllResult).docs.find((item) => item.id === docId)
    if (doc) {
      return doc.title || doc.path || docId
    }
  }
  const docResult = docSnapshot.value?.result as ScanDocResult | undefined
  if (docResult && docResult.doc.id === docId) {
    return docResult.doc.title || docResult.doc.path || docId
  }
  return ''
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
  pushToast('success', 'CSV 已导出。')
}

async function copyText(text: string | undefined, message: string): Promise<void> {
  if (!text) {
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    pushToast('success', message)
  }
  catch {
    pushToast('error', '复制失败，请手动复制。')
  }
}

async function copyMarkdown(ref: ImageRef): Promise<void> {
  const alt = (ref.alt || '').replace(/[[\]]/g, '')
  await copyText(`![${alt}](${ref.url})`, 'Markdown 链接已复制。')
}

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
</script>

<style scoped>
.pigo-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  padding: 14px 16px 28px;
}

/* ---------- 工具栏 ---------- */

.pigo-stats__toolbar {
  position: relative;
  padding: 10px 12px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-panel);
}

.pigo-stats__toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pigo-stats__scope {
  display: inline-flex;
  gap: 2px;
  box-sizing: border-box;
  padding: 2px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-bg);
}

.pigo-stats__scope-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  box-sizing: border-box;
  height: 24px;
  /* 补偿字体视觉基线，文字下移 1px */
  padding: 2px 9px 0;
  border: 0;
  border-radius: var(--pigo-radius-sm);
  color: var(--pigo-muted);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: var(--pigo-fs-xs);
  line-height: 1.4;
  transition: color 0.15s ease, background 0.15s ease;
}

.pigo-stats__scope-btn svg {
  width: 13px;
  height: 13px;
  transform: translateY(-1px);
  opacity: 0.8;
}

.pigo-stats__scope-btn:hover:not(:disabled) {
  color: var(--pigo-text);
}

.pigo-stats__scope-btn--active {
  color: var(--pigo-text);
  background: var(--pigo-surface-strong);
  box-shadow: var(--pigo-shadow-sm);
}

.pigo-stats__scope-btn--active svg {
  color: var(--pigo-accent);
  opacity: 1;
}

.pigo-stats__scope-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pigo-stats__spacer {
  flex: 1 1 auto;
}

.pigo-stats__toolbar-row .pigo-btn {
  gap: 5px;
}

.pigo-stats__toolbar-row .pigo-btn svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
}

.pigo-stats__repair {
  color: var(--pigo-purple);
  border-color: rgba(139, 92, 246, 0.38);
}

.pigo-stats__repair:hover:not(:disabled) {
  color: var(--pigo-purple);
  border-color: var(--pigo-purple);
  background: var(--pigo-purple-soft);
}

.pigo-stats__toolbar-row .pigo-stats__export {
  width: 28px;
  padding: 2px 0 0;
}

.pigo-stats__export svg {
  color: var(--pigo-emerald);
}

.pigo-stats__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px solid var(--pigo-border);
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-stats__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 5px;
  min-width: 0;
}

.pigo-stats__meta b {
  display: inline-block;
  overflow: hidden;
  max-width: 280px;
  color: var(--pigo-text-2);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-weight: 500;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.pigo-stats__sep {
  opacity: 0.6;
}

.pigo-stats__meta-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

/* ---------- KPI ---------- */

.pigo-stats__kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.pigo-stats__kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
}

.pigo-stats__kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.pigo-stats__kpi-label {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.4;
  white-space: nowrap;
}

.pigo-stats__kpi-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--pigo-muted);
  opacity: 0.55;
}

.pigo-stats__kpi-value {
  color: var(--pigo-text);
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.pigo-stats__kpi-hint {
  overflow: hidden;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-stats__kpi--blue {
  border-color: rgba(59, 130, 246, 0.32);
}

.pigo-stats__kpi--blue .pigo-stats__kpi-label,
.pigo-stats__kpi--blue .pigo-stats__kpi-value {
  color: #60a5fa;
}

.pigo-stats__kpi--blue .pigo-stats__kpi-dot {
  background: #60a5fa;
  opacity: 1;
}

.pigo-stats__kpi--amber {
  border-color: rgba(245, 158, 11, 0.34);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.06), transparent), var(--pigo-card);
}

.pigo-stats__kpi--amber .pigo-stats__kpi-label,
.pigo-stats__kpi--amber .pigo-stats__kpi-value {
  color: var(--pigo-amber);
}

.pigo-stats__kpi--amber .pigo-stats__kpi-dot {
  background: var(--pigo-amber);
  opacity: 1;
}

.pigo-stats__kpi--emerald {
  border-color: rgba(16, 185, 129, 0.32);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.06), transparent), var(--pigo-card);
}

.pigo-stats__kpi--emerald .pigo-stats__kpi-label,
.pigo-stats__kpi--emerald .pigo-stats__kpi-value {
  color: var(--pigo-emerald);
}

.pigo-stats__kpi--emerald .pigo-stats__kpi-dot {
  background: var(--pigo-emerald);
  opacity: 1;
}

.pigo-stats__kpi--cyan {
  border-color: rgba(6, 182, 212, 0.3);
}

.pigo-stats__kpi--cyan .pigo-stats__kpi-label,
.pigo-stats__kpi--cyan .pigo-stats__kpi-value {
  color: #22d3ee;
}

.pigo-stats__kpi--cyan .pigo-stats__kpi-dot {
  background: #22d3ee;
  opacity: 1;
}

.pigo-stats__kpi--purple {
  border-color: rgba(139, 92, 246, 0.34);
}

.pigo-stats__kpi--purple .pigo-stats__kpi-label,
.pigo-stats__kpi--purple .pigo-stats__kpi-value {
  color: #a78bfa;
}

.pigo-stats__kpi--purple .pigo-stats__kpi-dot {
  background: #a78bfa;
  opacity: 1;
}

.pigo-stats__kpi--rose {
  border-color: rgba(244, 63, 94, 0.3);
}

.pigo-stats__kpi--rose .pigo-stats__kpi-label,
.pigo-stats__kpi--rose .pigo-stats__kpi-value {
  color: #fb7185;
}

.pigo-stats__kpi--rose .pigo-stats__kpi-dot {
  background: #fb7185;
  opacity: 1;
}


/* ---------- 筛选 ---------- */

.pigo-stats__filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pigo-stats__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.pigo-stats__search {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 240px;
  max-width: 100%;
}

.pigo-stats__search svg {
  position: absolute;
  left: 8px;
  width: 13px;
  height: 13px;
  color: var(--pigo-muted);
  pointer-events: none;
}

.pigo-stats__search .pigo-stats__search-input {
  height: 26px;
  /* 补偿字体视觉基线，输入文字下移 1px；左侧留给搜索图标 */
  padding: 2px 9px 0 28px;
  font-size: var(--pigo-fs-xs);
}

.pigo-stats__search-input::-webkit-search-cancel-button {
  cursor: pointer;
}

/* ---------- 空态 ---------- */

.pigo-stats__empty {
  padding: 40px 16px;
  text-align: center;
}

.pigo-stats__empty--small {
  padding: 24px 8px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-xs);
}

.pigo-stats__empty-title {
  margin-bottom: 6px;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-md);
  font-weight: 600;
}

.pigo-stats__empty-desc {
  max-width: 520px;
  margin: 0 auto;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-xs);
  line-height: 1.7;
}

/* ---------- 卡片网格 ---------- */

.pigo-stats__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  scrollbar-gutter: stable;
}

.pigo-stats__item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pigo-stats__item:hover {
  border-color: var(--pigo-border-strong);
  box-shadow: var(--pigo-shadow-sm);
}

.pigo-stats__item-main {
  display: flex;
  gap: 9px;
  min-width: 0;
}

.pigo-stats__thumb {
  position: relative;
  width: 96px;
  height: 96px;
  flex: 0 0 96px;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-bg);
  cursor: zoom-in;
}

.pigo-stats__thumb:focus-visible {
  outline: 2px solid var(--pigo-accent);
  outline-offset: 1px;
}

.pigo-stats__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pigo-stats__thumb-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--pigo-muted);
}

.pigo-stats__thumb-icon svg {
  width: 20px;
  height: 20px;
}

.pigo-stats__badge-strip {
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

.pigo-stats__badge-cell {
  min-width: 0;
  flex: 1 1 0;
  padding: 0 2px;
  overflow: hidden;
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-stats__badge-cell + .pigo-stats__badge-cell {
  border-left: 1px solid rgba(255, 255, 255, 0.22);
}

.pigo-stats__badge-cell--ext {
  text-transform: uppercase;
}

.pigo-stats__item-body {
  min-width: 0;
  flex: 1 1 auto;
}

.pigo-stats__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.pigo-stats__item-doc {
  overflow: hidden;
  min-width: 0;
  margin-left: 2px;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-xs);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-stats__item-path {
  overflow: hidden;
  margin: 0;
  color: var(--pigo-text-2);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: all;
}

.pigo-stats__item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  margin-top: 3px;
  overflow: hidden;
  color: var(--pigo-muted);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
}

.pigo-stats__item-meta span {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-stats__item-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 7px;
  border-top: 1px solid var(--pigo-border);
}

.pigo-stats__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.4;
  white-space: nowrap;
}

.pigo-stats__status i {
  position: relative;
  top: -1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentcolor;
}

.pigo-stats__status--amber {
  color: var(--pigo-amber);
}

.pigo-stats__status--emerald {
  color: var(--pigo-emerald);
}

.pigo-stats__status--cyan {
  color: #22d3ee;
}

.pigo-stats__status--purple {
  color: #a78bfa;
}

.pigo-stats__status--rose {
  color: #fb7185;
}

.pigo-stats__item-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.pigo-stats__action-primary {
  color: var(--pigo-accent);
  border-color: rgba(249, 115, 22, 0.35);
}

.pigo-stats__action-primary:hover:not(:disabled) {
  color: var(--pigo-accent);
  border-color: var(--pigo-accent);
  background: var(--pigo-accent-soft);
}

.pigo-stats__more {
  display: flex;
  justify-content: center;
  padding: 10px 0 2px;
}

/* ---------- 响应式 ---------- */

@media (max-width: 860px) {
  .pigo-stats__kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .pigo-stats__grid {
    grid-template-columns: 1fr;
  }

  .pigo-stats__search {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .pigo-stats__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pigo-stats__spacer {
    display: none;
  }
}
</style>
