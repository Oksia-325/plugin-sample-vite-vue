<template>
  <div class="pigo-sync">
    <!-- 操作栏 -->
    <section class="pigo-sync__toolbar">
      <div class="pigo-sync__toolbar-row">
        <pigo-button
          variant="secondary"
          size="sm"
          :loading="running"
          :disabled="running"
          @click="scan()"
        >
          <PigoIcon v-if="!running" name="refresh" :size="13" />
          {{ running ? '扫描中…' : (snapshot ? '重新扫描' : '扫描并对比') }}
        </pigo-button>
        <pigo-button v-if="running" variant="outline" size="sm" @click="cancel">
          取消
        </pigo-button>

        <span class="pigo-sync__spacer"></span>

        <pigo-button
          variant="ghost"
          size="sm"
          class="pigo-sync__export"
          :disabled="!snapshot || running"
          title="导出 CSV 报表"
          aria-label="导出 CSV 报表"
          @click="exportCsv"
        >
          <PigoIcon name="download" :size="13" />
        </pigo-button>

        <pigo-button
          variant="danger"
          size="sm"
          :disabled="running || cleanupPlan.count === 0"
          @click="openCleanup"
        >
          <PigoIcon name="trash" :size="13" />
          清除 S3 多余图片 ({{ cleanupPlan.count }})
        </pigo-button>
      </div>

      <div class="pigo-sync__safety">
        <PigoIcon name="info" :size="13" />
        <span>
          同步会扫描<strong>全部笔记</strong>和<strong>整个存储桶</strong>。清理只删除「仅 S3 存在、在上传前缀内、且不属于 <code>_pigo_test/</code>」的对象，删除后不可恢复。
        </span>
      </div>

      <div class="pigo-sync__meta-row">
        <div class="pigo-sync__meta">
          <template v-if="snapshot">
            <span>扫描于 <b>{{ scannedAtText }}</b></span>
            <span class="pigo-sync__sep">·</span>
            <span>耗时 <b>{{ snapshot.durationMs }} ms</b></span>
            <span class="pigo-sync__sep">·</span>
            <span>笔记 <b>{{ snapshot.report.summary.docCount }}</b> 篇</span>
            <span class="pigo-sync__sep">·</span>
            <span>S3 对象 <b>{{ snapshot.report.summary.totalObjects }}</b> 个</span>
            <span class="pigo-sync__sep">·</span>
            <span>上传前缀 <b :class="{ 'pigo-sync__prefix--empty': !snapshot.report.prefix }">{{ snapshot.report.prefix || '（空：整个桶）' }}</b></span>
          </template>
          <template v-else>
            <span>{{ running ? '正在读取笔记与存储桶…' : '还没有同步报告，点击「扫描并对比」开始。' }}</span>
          </template>
        </div>

        <pigo-health-dot
          :state="healthState"
          :label="healthLabel"
          :title="health?.message || '点击重新检查 S3 连接'"
          clickable
          @click="checkHealth(true)"
        />
      </div>
    </section>

    <!-- 5 张分类卡 -->
    <section v-if="snapshot" class="pigo-sync__kpis">
      <div v-for="card in cards" :key="card.id" class="pigo-sync__kpi" :class="`pigo-sync__kpi--${card.tone}`">
        <div class="pigo-sync__kpi-head">
          <span class="pigo-sync__kpi-label">{{ card.label }}</span>
          <span class="pigo-sync__kpi-dot" aria-hidden="true"></span>
        </div>
        <div class="pigo-sync__kpi-value">
          {{ formatNumber(card.value) }}
        </div>
        <div class="pigo-sync__kpi-hint">
          {{ card.hint }}
        </div>
      </div>
    </section>

    <!-- 空前缀强警告 -->
    <div v-if="snapshot && !snapshot.report.prefix" class="pigo-sync__alert">
      上传前缀为空，清理范围将覆盖<strong>整个存储桶</strong>，风险极高。建议先在设置中配置上传路径（例如 <code>siyuan/</code>）后再执行清理。
    </div>

    <!-- 空态 -->
    <div v-if="!snapshot && !running" class="pigo-sync__empty">
      <div class="pigo-sync__empty-title">
        还没有同步报告
      </div>
      <div class="pigo-sync__empty-desc">
        点击「扫描并对比」，读取全部笔记引用与 S3 对象，生成双向匹配报告。首次扫描对象较多时可能需要等待。
      </div>
    </div>

    <template v-if="snapshot">
      <!-- 筛选 + 搜索 -->
      <section class="pigo-sync__filters-row">
        <div class="pigo-sync__filters">
          <pigo-chip
            v-for="filter in filters"
            :key="filter.id"
            :tone="filter.tone"
            :count="filter.count"
            clickable
            :active="activeCategory === filter.id"
            @click="activeCategory = filter.id"
          >
            {{ filter.label }}
          </pigo-chip>
        </div>
        <label class="pigo-sync__search">
          <PigoIcon name="search" :size="13" />
          <input
            v-model="searchText"
            class="pigo-input pigo-sync__search-input"
            type="search"
            placeholder="搜索 key、地址或文档…"
          >
        </label>
      </section>

      <div v-if="filteredRows.length === 0" class="pigo-sync__empty pigo-sync__empty--small">
        当前分类没有记录。
      </div>

      <section v-else class="pigo-sync__grid">
        <article v-for="row in pagedRows" :key="row.id" class="pigo-sync__item" tabindex="-1">
          <div class="pigo-sync__item-main">
            <div class="pigo-sync__item-info">
              <div class="pigo-sync__badges">
                <pigo-chip :tone="row.badgeTone">{{ row.badgeLabel }}</pigo-chip>
                <span v-if="row.ext" class="pigo-sync__ext">{{ row.ext }}</span>
                <span class="pigo-sync__title" :title="row.title">{{ row.title }}</span>
              </div>
              <p class="pigo-sync__url" :title="row.url">
                {{ displayUrl(row.url) }}
              </p>
            </div>
            <div class="pigo-sync__item-actions">
              <pigo-button
                v-if="row.previewUrl"
                variant="ghost"
                size="sm"
                @click="openPreview(row)"
              >
                查看图片
              </pigo-button>
              <pigo-button
                v-if="row.url"
                variant="ghost"
                size="sm"
                @click="copyText(row.url, '链接已复制。')"
              >
                复制链接
              </pigo-button>
            </div>
          </div>

          <div class="pigo-sync__item-foot">
            <span class="pigo-sync__stat" :title="row.meta">{{ row.meta }}</span>
            <span class="pigo-sync__status" :class="`pigo-sync__status--${row.statusTone}`">
              <i aria-hidden="true"></i>
              {{ row.status }}
            </span>
          </div>
        </article>
      </section>

      <pigo-pagination
        v-if="filteredRows.length > PAGE_SIZE"
        :total="filteredRows.length"
        :page="safePage"
        :page-size="PAGE_SIZE"
        @update:page="page = $event"
      />
    </template>

    <pigo-image-preview
      v-if="preview"
      :url="preview.url"
      :label="preview.label"
      @close="preview = null"
    />

    <cleanup-modal
      v-if="cleanupOpen"
      :count="cleanupPlan.count"
      :prefix="snapshot?.report.prefix || ''"
      :loading="cleaning"
      :loading-text="cleanupLoadingText"
      @close="closeCleanup"
      @confirm="confirmCleanup"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import CleanupModal from '@/components/sync/CleanupModal.vue'
import PigoButton from '@/components/ui/PigoButton.vue'
import PigoChip from '@/components/ui/PigoChip.vue'
import PigoHealthDot from '@/components/ui/PigoHealthDot.vue'
import PigoIcon from '@/components/ui/PigoIcon.vue'
import PigoPagination from '@/components/ui/PigoPagination.vue'
import PigoImagePreview from '@/components/ui/PigoImagePreview.vue'
import { configState, ensureConfigLoaded, ensureConfigReady, usePigoConfigStore } from '@/core/configStore'
import { toUserMessage } from '@/core/errors'
import { logError, logInfo } from '@/core/log'
import { checkS3Health, type S3HealthResult } from '@/core/s3/health'
import { describeStorage } from '@/core/s3/describe'
import { buildPublicUrl } from '@/core/s3/url'
import type { ImageRef } from '@/core/scan/types'
import { extensionOf } from '@/core/stats/assetMeta'
import { downloadTextFile, exportFileName } from '@/core/stats/export'
import { updateStatusBar } from '@/core/statusBar'
import { buildSyncCsv } from '@/core/sync/export'
import { buildCleanupPlan } from '@/core/sync/report'
import {
  buildSyncSnapshot,
  cleanupSyncObjects,
  revalidateCleanupPlan,
  type SyncSnapshot,
} from '@/core/sync/service'
import { pushToast } from '@/core/toastStore'
import { uiState } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin
}>()

type CategoryId = 'onlyS3' | 'onlySiyuan' | 'notUploaded' | 'matched' | 'outsidePrefix'
type StatusTone = 'success' | 'warning' | 'danger' | 'muted' | 'amber'
type ChipTone = 'local' | 's3' | 'remote' | 'data' | 'title' | 'default'

interface SyncRow {
  id: string
  category: CategoryId
  key: string
  url: string
  previewUrl: string
  title: string
  ext: string
  meta: string
  status: string
  statusTone: StatusTone
  badgeLabel: string
  badgeTone: ChipTone
}

interface KpiCard {
  id: CategoryId
  label: string
  value: number
  hint: string
  tone: 'neutral' | 'emerald' | 'orange' | 'rose' | 'blue'
}

const store = usePigoConfigStore()

const snapshot = ref<SyncSnapshot | null>(null)
const running = ref(false)
const activeCategory = ref<CategoryId>('onlyS3')
const searchText = ref('')
const PAGE_SIZE = 60
const page = ref(1)
const cleanupOpen = ref(false)
const cleaning = ref(false)
const cleanupLoadingText = ref('正在删除…')
const health = ref<S3HealthResult | null>(null)
const healthChecking = ref(false)
const preview = ref<{ url: string, label: string } | null>(null)
/** 配置保存后旧报告失效，下次进入同步页时自动重扫一次。 */
const stale = ref(false)

let cancelRequested = false

const cleanupPlan = computed(() => (
  snapshot.value ? buildCleanupPlan(snapshot.value.report) : { items: [], keys: [], count: 0, prefix: '', protectedPrefix: '_pigo_test/*' }
))

const scannedAtText = computed(() => {
  if (!snapshot.value) {
    return ''
  }
  const date = new Date(snapshot.value.scannedAt)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
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

const cards = computed<KpiCard[]>(() => {
  const summary = snapshot.value?.report.summary
  if (!summary) {
    return []
  }

  return [
    { id: 'matched', label: '双向匹配', value: summary.matched, hint: 'S3 与思源完全对齐', tone: 'emerald' },
    { id: 'onlyS3', label: '仅 S3 存在', value: summary.onlyS3, hint: '孤立待清理图片', tone: 'orange' },
    { id: 'onlySiyuan', label: '仅思源存在', value: summary.onlySiyuan, hint: '本地有引用但云端丢失', tone: 'rose' },
    { id: 'notUploaded', label: '未上传', value: summary.notUploaded, hint: '仍是本地 / 网络图片', tone: 'blue' },
    { id: 'outsidePrefix', label: '前缀外对象', value: summary.outsidePrefix, hint: '非配置前缀安全保留', tone: 'neutral' },
  ]
})

const filters = computed(() => {
  const summary = snapshot.value?.report.summary
  if (!summary) {
    return []
  }

  return [
    { id: 'onlyS3' as CategoryId, label: '仅 S3', count: summary.onlyS3, tone: 'warning' as ChipTone },
    { id: 'onlySiyuan' as CategoryId, label: '仅思源/失效', count: summary.onlySiyuan, tone: 'title' as ChipTone },
    { id: 'notUploaded' as CategoryId, label: '未上传', count: summary.notUploaded, tone: 'local' as ChipTone },
    { id: 'matched' as CategoryId, label: '双向匹配', count: summary.matched, tone: 's3' as ChipTone },
    { id: 'outsidePrefix' as CategoryId, label: '前缀外', count: summary.outsidePrefix, tone: 'default' as ChipTone },
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
          previewUrl: buildPublicUrl(config.s3, entry.key),
          title: entry.key,
          ext: extensionOf(entry.key),
          meta: `${formatSize(entry.object.size)} · ${formatTime(entry.object.lastModified)}`,
          status: `${docs.size} 篇文档 / ${entry.refs.length} 处引用`,
          statusTone: 'success',
          badgeLabel: 'S3',
          badgeTone: 's3',
        }
      })

    case 'onlySiyuan':
      return report.onlySiyuan.flatMap((entry) => entry.refs.map((ref) => ({
        id: `missing:${entry.key}:${ref.id}`,
        category: 'onlySiyuan' as CategoryId,
        key: entry.key,
        url: ref.url,
        previewUrl: '',
        title: entry.key,
        ext: extensionOf(entry.key),
        meta: `${ref.docTitle || ref.docId} · 块 ${ref.blockId} · ${ref.kind === 'title' ? '题头图' : '正文'}`,
        status: 'S3 对象不存在',
        statusTone: 'danger' as StatusTone,
        badgeLabel: 'S3',
        badgeTone: 's3' as ChipTone,
      })))

    case 'notUploaded':
      return report.notUploaded.map((ref) => ({
        id: `not-uploaded:${ref.id}`,
        category: 'notUploaded',
        key: '',
        url: ref.url,
        previewUrl: previewUrlForRef(ref),
        title: ref.docTitle || ref.docId,
        ext: extensionOf(ref.assetPath || ref.url),
        meta: `${ref.docPath || ''} · 块 ${ref.blockId} · ${ref.kind === 'title' ? '题头图' : '正文'}`,
        status: '待上传至 S3',
        statusTone: 'amber',
        badgeLabel: sourceLabel(ref.sourceType),
        badgeTone: sourceTone(ref.sourceType),
      }))

    case 'outsidePrefix':
      return report.outsidePrefix.map((object) => ({
        id: `outside:${object.key}`,
        category: 'outsidePrefix',
        key: object.key,
        url: buildPublicUrl(config.s3, object.key),
        previewUrl: buildPublicUrl(config.s3, object.key),
        title: object.key,
        ext: extensionOf(object.key),
        meta: `${formatSize(object.size)} · ${formatTime(object.lastModified)}`,
        status: '前缀外 · 安全保留',
        statusTone: 'muted',
        badgeLabel: 'S3',
        badgeTone: 's3',
      }))

    default:
      return report.onlyS3.map((object) => ({
        id: `orphan:${object.key}`,
        category: 'onlyS3',
        key: object.key,
        url: buildPublicUrl(config.s3, object.key),
        previewUrl: buildPublicUrl(config.s3, object.key),
        title: object.key,
        ext: extensionOf(object.key),
        meta: `${formatSize(object.size)} · ${formatTime(object.lastModified)}`,
        status: '未被笔记引用',
        statusTone: 'warning',
        badgeLabel: 'S3',
        badgeTone: 's3',
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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)))
const safePage = computed(() => Math.min(Math.max(1, page.value), totalPages.value))
const pagedRows = computed(() => filteredRows.value.slice(
  (safePage.value - 1) * PAGE_SIZE,
  safePage.value * PAGE_SIZE
))

watch([activeCategory, searchText], () => {
  page.value = 1
})

watch(cleanupPlan, (plan) => {
  uiState.cleanupCount = snapshot.value ? plan.count : null
}, { immediate: true })

watch(
  () => configState.revision,
  () => {
    snapshot.value = null
    stale.value = true
    preview.value = null
    uiState.cleanupCount = null
    void checkHealth(true)
    if (uiState.popupVisible && uiState.activeTab === 'sync' && !running.value) {
      void scan(true)
    }
  }
)

watch(
  () => store.config.s3,
  () => {
    if (uiState.popupVisible && uiState.activeTab === 'sync') {
      void checkHealth(true)
    }
  },
  { deep: true }
)

watch(
  () => uiState.popupVisible,
  (visible) => {
    if (!visible) {
      preview.value = null
      return
    }
    if (uiState.activeTab === 'sync') {
      void checkHealth()
    }
  }
)

watch(
  () => uiState.activeTab,
  (tab) => {
    if (tab === 'sync' && uiState.popupVisible) {
      void checkHealth()
      if (stale.value && !running.value) {
        void scan(true)
      }
    }
  }
)

onMounted(() => {
  void checkHealth()
})

onBeforeUnmount(() => {
  uiState.cleanupCount = null
})

async function scan(silent = false): Promise<void> {
  if (running.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  if (!(await ensureSyncReady())) {
    return
  }

  running.value = true
  cancelRequested = false
  updateStatusBar('正在同步 S3 与笔记…')
  void checkHealth()

  try {
    const next = await buildSyncSnapshot(store.config, {
      isCancelled: () => cancelRequested,
    })

    snapshot.value = next
    stale.value = false
    activeCategory.value = next.report.summary.onlyS3 > 0 ? 'onlyS3' : 'matched'
    searchText.value = ''
    page.value = 1

    if (!silent) {
      if (next.report.summary.onlySiyuan > 0) {
        pushToast('info', `同步完成：${next.report.summary.onlySiyuan} 个 S3 链接已失效，${next.report.summary.onlyS3} 个对象没有引用。`)
      }
      else {
        pushToast('success', `同步完成：双向匹配 ${next.report.summary.matched} 个，仅 S3 ${next.report.summary.onlyS3} 个。`)
      }
    }
    updateStatusBar('同步完成')
  }
  catch (error) {
    if (cancelRequested) {
      pushToast('info', '已取消同步，保留上次结果。')
      updateStatusBar('同步已取消')
    }
    else {
      const message = toUserMessage(error)
      logError('同步失败', error)
      pushToast('error', `同步失败：${message}`)
      updateStatusBar('同步失败')
    }
  }
  finally {
    running.value = false
  }
}

function cancel(): void {
  cancelRequested = true
  pushToast('info', '正在停止…')
  updateStatusBar('正在停止同步…')
}

function openCleanup(): void {
  if (cleanupPlan.value.count === 0 || running.value) {
    return
  }
  cleanupOpen.value = true
}

function closeCleanup(): void {
  if (cleaning.value) {
    return
  }
  cleanupOpen.value = false
}

async function confirmCleanup(): Promise<void> {
  if (!snapshot.value || cleaning.value) {
    return
  }

  await ensureConfigLoaded(props.plugin)
  if (!(await ensureSyncReady())) {
    return
  }

  const plan = cleanupPlan.value
  if (plan.count === 0) {
    return
  }

  cleaning.value = true
  cleanupLoadingText.value = '正在复核对象…'

  try {
    const revalidated = await revalidateCleanupPlan(store.config, plan, {
      onProgress: (done, total) => {
        cleanupLoadingText.value = `正在复核 ${done}/${total}…`
      },
    })

    if (revalidated.keys.length === 0) {
      pushToast('info', '待清理对象已变化或不存在，请重新扫描后再试。')
      cleanupOpen.value = false
      await scan(true)
      return
    }

    const skipped = revalidated.skipped.length
    cleanupLoadingText.value = `正在删除 ${revalidated.keys.length} 个…`

    const result = await cleanupSyncObjects(store.config, revalidated.keys, {
      onProgress: (value) => {
        cleanupLoadingText.value = `正在删除 ${value.done}/${value.total}…`
      },
    })

    logInfo(`S3 清理完成：删除 ${result.deleted} 个，失败 ${result.failed.length} 个`)
    result.failed.slice(0, 10).forEach((item) => logError(`删除失败：${item.key || '(未知 key)'}`, item.message || item.code || ''))

    const parts = [`删除 ${result.deleted} 个`]
    if (skipped > 0) {
      parts.push(`跳过 ${skipped} 个已变化对象`)
    }
    if (result.failed.length > 0) {
      parts.push(`失败 ${result.failed.length} 个`)
    }
    pushToast(result.failed.length > 0 ? 'error' : 'success', `清理完成：${parts.join('，')}。`)
    updateStatusBar('清理完成')

    cleanupOpen.value = false
    if (result.deleted > 0) {
      await scan(true)
    }
  }
  catch (error) {
    const message = toUserMessage(error)
    logError('S3 清理失败', error)
    pushToast('error', `清理失败：${message}。已删除的部分无法恢复，请重新扫描确认。`)
    updateStatusBar('清理失败')
  }
  finally {
    cleaning.value = false
  }
}

async function ensureSyncReady(): Promise<boolean> {
  const ready = await ensureConfigReady(props.plugin)
  if (ready.ok) {
    return true
  }

  const message = ready.issues.map((issue) => issue.message).join('；')
  pushToast('error', `配置不完整：${message}`)
  uiState.activeTab = 'settings'
  return false
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

function exportCsv(): void {
  if (!snapshot.value) {
    return
  }
  const text = buildSyncCsv(snapshot.value, store.config)
  downloadTextFile(exportFileName('sync', 'csv', snapshot.value.scannedAt), text, 'text/csv')
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

function previewUrlForRef(ref: ImageRef): string {
  if (ref.sourceType === 'local' && ref.assetPath) {
    return encodeURI(`/${ref.assetPath}`)
  }
  if (ref.sourceType === 'remote') {
    return ref.url
  }
  return ''
}

function openPreview(row: SyncRow): void {
  if (!row.previewUrl) {
    return
  }
  preview.value = { url: row.previewUrl, label: row.title }
}

function displayUrl(url: string): string {
  if (!url) {
    return '—'
  }
  if (url.startsWith('data:')) {
    return 'data:image/...'
  }
  return url.length > 150 ? `${url.slice(0, 147)}...` : url
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

function formatTime(value: string | undefined): string {
  if (!value) {
    return '未知时间'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('zh-CN')
}

function sourceLabel(sourceType: ImageRef['sourceType']): string {
  switch (sourceType) {
    case 'local':
      return '本地'
    case 'remote':
      return '网络'
    case 'data':
      return 'Data URI'
    default:
      return 'S3'
  }
}

function sourceTone(sourceType: ImageRef['sourceType']): ChipTone {
  switch (sourceType) {
    case 'local':
      return 'local'
    case 'remote':
      return 'remote'
    case 'data':
      return 'data'
    default:
      return 's3'
  }
}
</script>

<style scoped>
.pigo-sync {
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  padding: 14px 16px 28px;
}

/* ---------- 工具栏 ---------- */

.pigo-sync__toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-panel);
}

.pigo-sync__toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pigo-sync__spacer {
  flex: 1 1 auto;
}

.pigo-sync__toolbar-row .pigo-btn svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
}

.pigo-sync__toolbar-row .pigo-sync__export {
  width: 28px;
  padding: 2px 0 0;
}

.pigo-sync__export svg {
  color: var(--pigo-emerald);
}

.pigo-sync__safety {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-muted);
  background: var(--pigo-surface);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.6;
}

.pigo-sync__safety svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  margin-top: 2px;
  color: var(--pigo-amber);
}

.pigo-sync__safety strong {
  color: var(--pigo-text-2);
  font-weight: 500;
}

.pigo-sync__safety code {
  padding: 0 4px;
  border-radius: 4px;
  color: var(--pigo-text-2);
  background: var(--pigo-card);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
}

.pigo-sync__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  padding-top: 7px;
  border-top: 1px solid var(--pigo-border);
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-sync__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 5px;
  min-width: 0;
}

.pigo-sync__meta b {
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

.pigo-sync__sep {
  opacity: 0.6;
}

.pigo-sync__prefix--empty {
  color: var(--pigo-rose);
}

/* ---------- KPI ---------- */

.pigo-sync__kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.pigo-sync__kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
}

.pigo-sync__kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.pigo-sync__kpi-label {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.4;
  white-space: nowrap;
}

.pigo-sync__kpi-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--pigo-muted);
  opacity: 0.55;
}

.pigo-sync__kpi-value {
  color: var(--pigo-text);
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.pigo-sync__kpi-hint {
  overflow: hidden;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-sync__kpi--emerald {
  border-color: rgba(16, 185, 129, 0.32);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.06), transparent), var(--pigo-card);
}

.pigo-sync__kpi--emerald .pigo-sync__kpi-label,
.pigo-sync__kpi--emerald .pigo-sync__kpi-value {
  color: var(--pigo-emerald);
}

.pigo-sync__kpi--emerald .pigo-sync__kpi-dot {
  background: var(--pigo-emerald);
  opacity: 1;
}

.pigo-sync__kpi--orange {
  border-color: rgba(249, 115, 22, 0.5);
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.08), transparent), var(--pigo-card);
}

.pigo-sync__kpi--orange .pigo-sync__kpi-label,
.pigo-sync__kpi--orange .pigo-sync__kpi-value {
  color: var(--pigo-accent);
}

.pigo-sync__kpi--orange .pigo-sync__kpi-dot {
  background: var(--pigo-accent);
  opacity: 1;
}

.pigo-sync__kpi--rose {
  border-color: rgba(244, 63, 94, 0.32);
}

.pigo-sync__kpi--rose .pigo-sync__kpi-label,
.pigo-sync__kpi--rose .pigo-sync__kpi-value {
  color: #fb7185;
}

.pigo-sync__kpi--rose .pigo-sync__kpi-dot {
  background: #fb7185;
  opacity: 1;
}

.pigo-sync__kpi--blue .pigo-sync__kpi-label,
.pigo-sync__kpi--blue .pigo-sync__kpi-value {
  color: #60a5fa;
}

.pigo-sync__kpi--blue .pigo-sync__kpi-dot {
  background: #60a5fa;
  opacity: 1;
}

/* ---------- 警告 / 空态 ---------- */

.pigo-sync__alert {
  padding: 8px 10px;
  border: 1px solid rgba(244, 63, 94, 0.4);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-rose);
  background: var(--pigo-rose-soft);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.6;
}

.pigo-sync__alert code {
  padding: 0 4px;
  border-radius: 4px;
  background: var(--pigo-card);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
}

.pigo-sync__empty {
  padding: 40px 16px;
  text-align: center;
}

.pigo-sync__empty--small {
  padding: 24px 8px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-xs);
}

.pigo-sync__empty-title {
  margin-bottom: 6px;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-md);
  font-weight: 600;
}

.pigo-sync__empty-desc {
  max-width: 520px;
  margin: 0 auto;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-xs);
  line-height: 1.7;
}

/* ---------- 筛选 ---------- */

.pigo-sync__filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pigo-sync__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pigo-sync__search {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 240px;
  max-width: 100%;
}

.pigo-sync__search svg {
  position: absolute;
  left: 8px;
  width: 13px;
  height: 13px;
  color: var(--pigo-muted);
  pointer-events: none;
}

.pigo-sync__search .pigo-sync__search-input {
  height: 26px;
  /* 补偿字体视觉基线，输入文字下移 1px；左侧留给搜索图标 */
  padding: 2px 9px 0 28px;
  font-size: var(--pigo-fs-xs);
}

/* ---------- 列表 ---------- */

.pigo-sync__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  scrollbar-gutter: stable;
}

.pigo-sync__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pigo-sync__item:hover {
  border-color: var(--pigo-border-strong);
  box-shadow: var(--pigo-shadow-sm);
}

.pigo-sync__item-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.pigo-sync__item-info {
  min-width: 0;
  flex: 1 1 auto;
}

.pigo-sync__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.pigo-sync__ext {
  padding: 1px 5px;
  border-radius: var(--pigo-radius-sm);
  color: var(--pigo-text-2);
  background: var(--pigo-surface);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  text-transform: uppercase;
}

.pigo-sync__title {
  overflow: hidden;
  min-width: 0;
  margin-left: 2px;
  color: var(--pigo-text);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-xs);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-sync__url {
  overflow: hidden;
  margin: 0;
  color: var(--pigo-muted);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: all;
}

.pigo-sync__item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex: 0 0 auto;
}

.pigo-sync__item-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 7px;
  border-top: 1px solid var(--pigo-border);
}

.pigo-sync__stat {
  overflow: hidden;
  min-width: 0;
  color: var(--pigo-muted);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-sync__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.4;
  white-space: nowrap;
}

.pigo-sync__status i {
  position: relative;
  top: -1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentcolor;
}

.pigo-sync__status--success {
  color: var(--pigo-emerald);
}

.pigo-sync__status--warning,
.pigo-sync__status--amber {
  color: var(--pigo-amber);
}

.pigo-sync__status--danger {
  color: var(--pigo-rose);
}

.pigo-sync__status--muted {
  color: var(--pigo-muted);
}


/* ---------- 响应式 ---------- */

@media (max-width: 860px) {
  .pigo-sync__kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .pigo-sync__grid {
    grid-template-columns: 1fr;
  }

  .pigo-sync__search {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .pigo-sync__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
