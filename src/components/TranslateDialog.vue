<template>
  <div class="tr2">
    <!-- ============================================================ 工作台(待翻译) -->
    <section
      v-if="phase === 'input'"
      class="tw"
    >
      <!-- 全局状态条 -->
      <div class="tw-status">
        <span class="tw-status__icon"><Icon
          name="sparkle"
          :size="15"
        /></span>
        <div class="tw-status__text">
          <div class="tw-status__line">
            <span class="tw-status__title">工作台就绪</span>
            <span class="tw-status__dot" />
            <span class="tw-status__api">{{ apiLabel }}</span>
          </div>
          <div class="tw-status__sub">
            选择目标页面与写入策略后开始翻译
          </div>
        </div>
        <span class="tr2-chip">{{ writeModeLabel }}</span>
      </div>

      <!-- 目标页面 -->
      <div class="tr2-card tw-card">
        <div class="tw-card__head">
          <Icon
            name="dataset"
            :size="16"
          />
          <span class="tr2-card__title">选择翻译目标页面</span>
        </div>

        <div class="tw-tabs">
          <button
            class="tw-tab"
            :class="{ 'is-active': targetTab === 'current' }"
            type="button"
            :disabled="!currentDocId"
            @click="targetTab = 'current'"
          >
            <Icon
              name="doc"
              :size="14"
            />
            当前打开的文档
            <span
              v-if="currentInfo?.translatable"
              class="tw-tab__dot"
            />
          </button>
          <button
            class="tw-tab"
            :class="{ 'is-active': targetTab === 'custom' }"
            type="button"
            @click="targetTab = 'custom'"
          >
            <Icon
              name="link"
              :size="14"
            />
            指定其他页面
          </button>
        </div>

        <!-- 当前文档 -->
        <div
          v-if="targetTab === 'current'"
          class="tw-doc"
        >
          <template v-if="currentDocId">
            <div class="tw-doc__head">
              <span class="tw-doc__badge"><Icon
                name="doc"
                :size="18"
              /></span>
              <div class="tw-doc__meta">
                <div
                  class="tw-doc__title"
                  :title="currentTitle"
                >
                  {{ currentTitle || '未命名文档' }}
                </div>
                <div class="tw-doc__id">
                  ID: {{ currentDocId }}
                </div>
              </div>
              <button
                class="tr2-btn is-ghost is-sm"
                type="button"
                :disabled="currentLoading"
                title="重新扫描当前文档"
                @click="scanCurrent"
              >
                <span
                  v-if="currentLoading"
                  class="tr2-spin"
                /><Icon
                  v-else
                  name="refresh"
                  :size="13"
                />
                刷新
              </button>
            </div>

            <div
              v-if="currentError"
              class="tw-msg is-err"
            >
              <Icon
                name="alert"
                :size="14"
              />
              <span>{{ currentError }}</span>
            </div>

            <div class="tw-metrics">
              <div class="tw-metric">
                <div class="tw-metric__k">
                  <span>文档总块数</span>
                  <Icon
                    name="layers"
                    :size="13"
                  />
                </div>
                <div class="tw-metric__v">
                  {{ currentLoading ? '—' : (currentInfo?.totalBlocks ?? '—') }}<span v-if="!currentLoading && currentInfo">块</span>
                </div>
                <div class="tw-metric__note">
                  含 {{ currentInfo?.skippedNonText ?? '—' }} 块非文本或空行
                </div>
              </div>
              <div class="tw-metric is-primary">
                <div class="tw-metric__k">
                  <span>待处理块数</span>
                  <Icon
                    name="translate"
                    :size="13"
                  />
                </div>
                <div class="tw-metric__v">
                  {{ currentLoading ? '—' : (currentInfo?.translatable ?? '—') }}<span v-if="!currentLoading && currentInfo">块</span>
                </div>
                <div class="tw-metric__note">
                  已跳过 {{ currentInfo?.skippedAlready ?? '—' }} 块已翻译
                </div>
              </div>
            </div>

            <div class="tw-chips">
              <span class="tr2-chip">
                <Icon
                  name="language"
                  :size="12"
                />{{ sourceLabel }}
              </span>
              <Icon
                name="arrowRight"
                :size="12"
                class="tw-chips__arrow"
              />
              <span class="tr2-chip is-primary">{{ targetLabel }}</span>
              <span class="tr2-chip is-ok">
                <Icon
                  name="split"
                  :size="12"
                />{{ writeModeLabel }}
              </span>
            </div>
          </template>

          <div
            v-else
            class="tw-empty"
          >
            未检测到打开的文档,请切换到「指定其他页面」
          </div>
        </div>

        <!-- 指定页面 -->
        <div
          v-else
          class="tw-doc"
        >
          <div class="tw-input-row">
            <div class="tw-input">
              <Icon
                name="search"
                :size="15"
              />
              <input
                v-model="inputStr"
                placeholder="20260529110932-dubkz1x 或 siyuan://blocks/..."
                spellcheck="false"
                @keydown.enter="parseCustom"
              >
            </div>
            <button
              class="tr2-btn is-primary"
              type="button"
              :disabled="parsing"
              @click="parseCustom"
            >
              <span
                v-if="parsing"
                class="tr2-spin"
              /><Icon
                v-else
                name="verified"
                :size="14"
              />
              {{ parsing ? '解析中' : '解析验证' }}
            </button>
          </div>

          <div
            v-if="parseMsg"
            class="tw-msg"
            :class="parseErr ? 'is-err' : 'is-ok'"
          >
            <Icon
              :name="parseErr ? 'alert' : 'checkCircle'"
              :size="14"
            />
            <span>{{ parseMsg }}</span>
          </div>

          <div
            v-if="parsedInfo"
            class="tw-msg is-ok"
          >
            <div>
              <div class="tw-msg__title">
                {{ parsedInfo.hpath }}
              </div>
              <div class="tw-msg__sub">
                ID: {{ parsedInfo.docId }} · {{ parsedInfo.translatable }} 块待翻
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主行动卡 -->
      <div class="tw-action">
        <span class="tw-action__icon"><Icon
          name="bolt"
          :size="18"
        /></span>
        <div class="tw-action__text">
          <div class="tw-action__title">
            {{ canStart ? '翻译管线已就绪' : '选择目标页面后开始' }}
          </div>
          <div class="tw-action__chips">
            <span class="tr2-chip">并发 ×{{ activeConcurrency }}</span>
            <span class="tr2-chip is-ok">块内追加</span>
          </div>
        </div>
        <button
          class="tw-go"
          type="button"
          :disabled="!canStart"
          @click="start"
        >
          <Icon
            name="translate"
            :size="16"
          />
          立即开始翻译
        </button>
      </div>

      <!-- 就绪提示 -->
      <div class="tw-ready">
        <span class="tw-ready__icon"><Icon
          name="hourglass"
          :size="18"
        /></span>
        <div>
          <div class="tw-ready__title">
            等待发起翻译任务
          </div>
          <div class="tw-ready__sub">
            确认目标文档与写入模式后,点击「立即开始翻译」执行管线
          </div>
        </div>
        <span class="tw-ready__port">内核 :{{ kernelPort }}</span>
      </div>
    </section>

    <!-- ======================================================= 翻译中页 -->
    <section
      v-else-if="phase === 'running'"
      class="tw"
    >
      <div class="tr2-card tw-run">
        <div class="tw-run__head">
          <span class="tw-run__pulse" />
          <span class="tr2-card__title">正在进行异步翻译</span>
          <span class="tr2-chip is-primary">任务进行中</span>
        </div>

        <!-- 当前块 -->
        <div class="tw-run__block">
          <div class="tw-run__block-top">
            <span>正在请求块节点</span>
            <span class="tw-mono">Block {{ currentIndex || '—' }} of {{ total || '—' }}</span>
          </div>
          <div class="tw-run__block-id">
            <Icon
              name="sync"
              :size="14"
              class="tw-run__sync"
            />
            <span class="tw-mono">{{ currentBlockId || '准备中…' }}</span>
          </div>
        </div>

        <!-- 进度 -->
        <div class="tw-run__progress">
          <div class="tw-run__progress-top">
            <span class="tw-run__count">{{ stats.translated }} / {{ total || '—' }} 块 ({{ progressPct }})</span>
            <span class="tr2-hint">已耗时 {{ elapsedText }}</span>
          </div>
          <div class="tw-bar">
            <div
              class="tw-bar__fill"
              :style="{ width: progressPct }"
            />
          </div>
          <div class="tw-run__progress-foot">
            <span>共需翻译 {{ total || '—' }} 个块 (跳过 {{ stats.skipped_non_text }} 非文本, {{ stats.skipped_already_translated }} 已翻译)</span>
            <span class="tw-ok-text">速率: {{ speedText }} 块/秒</span>
          </div>
        </div>

        <!-- 实时日志 -->
        <div class="tw-log">
          <div class="tw-log__head">
            <span>实时内核流水线日志</span>
            <span class="tw-log__dot" />
          </div>
          <div
            v-if="!visibleLogs.length"
            class="tw-log__empty"
          >
            等待首个块返回…
          </div>
          <div
            v-for="(line, i) in visibleLogs"
            :key="`${line.blockId}-${line.kind}-${i}`"
            class="tw-log__line"
            :class="`is-${line.kind}`"
          >
            <span class="tw-log__mark">{{ logMark(line.kind) }}</span>
            <span class="tw-mono tw-log__id">[{{ line.blockId }}]</span>
            <span class="tw-log__msg">{{ line.message }}<template v-if="line.tokens"> ({{ line.tokens }} tokens)</template></span>
          </div>
        </div>

        <div class="tw-run__actions">
          <button
            class="tr2-btn is-ghost is-sm"
            type="button"
            @click="cancel"
          >
            <Icon
              name="close"
              :size="13"
            />
            取消翻译任务
          </button>
          <span class="tr2-hint tw-ellipsis">{{ statusText }}</span>
        </div>
      </div>
    </section>

    <!-- ======================================================= 完成页 -->
    <section
      v-else
      class="tw"
    >
      <div class="tr2-card tw-done">
        <div class="tw-run__head">
          <span
            class="tw-done__badge"
            :class="doneTone"
          ><Icon
            :name="doneIcon"
            :size="17"
          /></span>
          <div class="tw-done__text">
            <div class="tr2-card__title">{{ doneTitle }}</div>
            <div class="tr2-hint">{{ doneSub }}</div>
          </div>
          <span
            class="tr2-chip"
            :class="doneChipClass"
          >{{ doneRateText }}</span>
        </div>

        <div class="tw-metrics tw-metrics--4">
          <div class="tw-metric">
            <div class="tw-metric__k">
              <span>总耗时</span>
              <Icon
                name="clock"
                :size="13"
              />
            </div>
            <div class="tw-metric__v">
              {{ stats.elapsed.toFixed(1) }}<span>s</span>
            </div>
            <div class="tw-metric__note">
              {{ engineType === 'llm' ? 'LLM 引擎' : 'Qwen-MT 引擎' }}
            </div>
          </div>
          <div class="tw-metric">
            <div class="tw-metric__k">
              <span>已翻译块数</span>
              <Icon
                name="checkCircle"
                :size="13"
              />
            </div>
            <div class="tw-metric__v">
              {{ stats.translated }}<span>块</span>
            </div>
            <div class="tw-metric__note">
              跳过非文本 {{ stats.skipped_non_text }}
            </div>
          </div>
          <div
            class="tw-metric"
            :class="{ 'is-err': stats.api_failed > 0 }"
          >
            <div class="tw-metric__k">
              <span>API 成功 / 失败</span>
              <Icon
                name="cloud"
                :size="13"
              />
            </div>
            <div class="tw-metric__v">
              {{ stats.api_success }}<span>/ {{ stats.api_failed }}</span>
            </div>
            <div class="tw-metric__note">
              请求 {{ stats.api_total }} 次
            </div>
          </div>
          <div
            class="tw-metric"
            :class="{ 'is-err': stats.write_failed > 0 }"
          >
            <div class="tw-metric__k">
              <span>写入成功 / 失败</span>
              <Icon
                name="save"
                :size="13"
              />
            </div>
            <div class="tw-metric__v">
              {{ stats.write_success }}<span>/ {{ stats.write_failed }}</span>
            </div>
            <div class="tw-metric__note">
              写回本地笔记本
            </div>
          </div>
        </div>

        <div
          v-if="authFailed"
          class="tw-msg is-err"
        >
          <Icon
            name="alert"
            :size="14"
          />
          <span>当前引擎({{ engineLabel }})的 API Key 无效或尚未保存:请到「插件设置」核对 Key 与端点,保存后点「重新翻译」。</span>
        </div>

        <div
          v-if="engineType === 'llm'"
          class="tw-token"
        >
          <span>Token 消耗量</span>
          <span class="tw-mono">输入 {{ formatM(stats.prompt_tokens) }} · 输出 {{ formatM(stats.completion_tokens) }} · 缓存命中 {{ formatHitRate(stats.cached_tokens, stats.prompt_tokens, stats.cache_reported) }}</span>
        </div>

        <div
          v-if="stats.skipped_non_text || stats.skipped_already_translated"
          class="tr2-hint"
        >
          跳过:非文本 {{ stats.skipped_non_text }} · 已翻译 {{ stats.skipped_already_translated }}
        </div>

        <div
          v-if="stats.api_errors.length"
          class="tw-log tw-log--err"
        >
          <div class="tw-log__head">
            <span>翻译失败明细 ({{ stats.api_errors.length }})</span>
          </div>
          <div
            v-for="(e, i) in stats.api_errors.slice(0, 8)"
            :key="i"
            class="tw-log__line is-err"
          >
            <span class="tw-log__mark">✕</span>
            <span class="tw-mono tw-log__id">{{ e.status != null ? `HTTP ${e.status}` : '网络错误' }}</span>
            <span class="tw-log__msg tw-ellipsis">{{ e.message }}</span>
          </div>
        </div>

        <div class="tw-done__actions">
          <button
            class="tr2-btn is-ghost"
            type="button"
            @click="retranslate"
          >
            <Icon
              name="replay"
              :size="14"
            />
            重新翻译
          </button>
          <button
            class="tr2-btn is-primary"
            type="button"
            @click="close"
          >
            完成
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Dialog } from 'siyuan'
import Icon from '@/components/ui/Icon.vue'
import { usePlugin } from '@/main'
import { loadConfig } from '@/trans/config'
import { langLabel } from '@/trans/languages'
import { TranslationEngine } from '@/trans/engine'
import { accumulateLlmStats, formatHitRate, formatM } from '@/trans/llm_stats'
import { emptyStats, type EngineType, type ScanResult, type TransConfig, type TranslationLogEntry, type TranslationStats } from '@/trans/types'
import { workbenchBusy, workbenchTab } from '@/store/workbench'

const props = defineProps<{
  docId?: string | null
  allowInput?: boolean
  dialog: Dialog
}>()

const plugin = usePlugin()

const phase = ref<'input' | 'running' | 'done'>('input')
const config = ref<TransConfig | null>(null)

/* ------------------------------ 目标选择 ------------------------------ */

type TargetTab = 'current' | 'custom'

/** 当前打开的文档(由宿主传入,只读) */
const currentDocId = ref<string | null>(props.docId ?? null)
const currentInfo = ref<ScanResult | null>(null)
const currentLoading = ref(false)
const currentError = ref('')

/** 指定页面 */
const targetTab = ref<TargetTab>(props.docId ? 'current' : 'custom')
const inputStr = ref('')
const parsedId = ref<string | null>(null)
const parsedInfo = ref<ScanResult | null>(null)
const parsing = ref(false)
const parseMsg = ref('')
const parseErr = ref(false)

/** 最终要翻译的文档 */
const resolvedId = computed(() =>
  targetTab.value === 'current' ? currentDocId.value : parsedId.value,
)
const resolvedInfo = computed(() =>
  targetTab.value === 'current' ? currentInfo.value : parsedInfo.value,
)
/** 顶部展示用标题(取 hpath 末段) */
const docTitle = computed(() => tailPath(resolvedInfo.value?.hpath))
const currentTitle = computed(() => tailPath(currentInfo.value?.hpath) || '')
const canStart = computed(
  () => !!resolvedId.value && !currentLoading.value && !parsing.value,
)

/** 写入模式 / 引擎的展示文案 */
const WRITE_MODE_LABELS: Record<string, string> = {
  append: '双语对照追加',
  replace: '替换原文',
  new_doc: '新建译文文档',
}

const sourceLabel = computed(() => langLabel(config.value?.source_lang ?? 'English'))
const targetLabel = computed(() => langLabel(config.value?.target_lang ?? 'Chinese'))
const writeModeLabel = computed(
  () => WRITE_MODE_LABELS[config.value?.write_mode ?? 'append'] ?? '双语对照追加',
)
const apiLabel = computed(() => {
  const c = config.value
  if (!c) {
    return 'API: —'
  }
  const model = c.engine === 'llm' ? c.llm_model_name : c.model_name
  return `API: ${model || '未配置模型'}`
})
const activeConcurrency = computed(() => {
  const c = config.value
  if (!c) {
    return 4
  }
  return c.engine === 'llm' ? (c.llm_concurrency ?? c.concurrency) : c.concurrency
})
/** 内核端口(浏览器地址栏端口,默认 6806) */
const kernelPort = computed(() => location.port || '6806')

function tailPath(hpath?: string | null): string {
  if (!hpath) {
    return ''
  }
  return hpath.split('/').filter(Boolean).pop() ?? ''
}

/* ------------------------------ 翻译运行态 ------------------------------ */

const statusText = ref('')
const stats = ref<TranslationStats>(emptyStats())
const total = ref(0)
const cancelled = ref(false)
const fatalError = ref(false)
/** 当前使用的翻译引擎(决定是否展示/累计 LLM token 统计) */
const engineType = ref<EngineType>('qwen_mt')

/** 当前正在处理的块(逐块事件驱动) */
const currentBlockId = ref('')
const currentIndex = ref(0)
/** 逐块流水日志(只保留最近 60 条) */
const logs = ref<TranslationLogEntry[]>([])
/** 运行计时(秒) */
const elapsed = ref(0)
let timerId = 0
let startedAt = 0

let engine: TranslationEngine | null = null

const progressPct = computed(() => {
  if (total.value <= 0) {
    return '0%'
  }
  return `${Math.min(100, Math.round((stats.value.translated / total.value) * 100))}%`
})

/** 实时日志只展示最近 6 条,避免面板跳动 */
const visibleLogs = computed(() => logs.value.slice(-6))
const elapsedText = computed(() => `${elapsed.value.toFixed(1)}s`)
const speedText = computed(() => {
  if (elapsed.value < 0.2) {
    return '—'
  }
  return (stats.value.translated / elapsed.value).toFixed(1)
})

/** 完成态文案 */
const doneTitle = computed(() =>
  fatalError.value ? '翻译出错' : cancelled.value ? '翻译已取消' : '翻译执行完毕',
)
const doneSub = computed(() => {
  if (fatalError.value) {
    return statusText.value || '执行过程中出现错误'
  }
  if (cancelled.value) {
    return '任务被手动取消,已写入的块会保留'
  }
  return '全部内容块已写回本地思源笔记'
})
const doneIcon = computed(() =>
  fatalError.value ? 'alert' : cancelled.value ? 'close' : 'checkCircle',
)
const doneTone = computed(() =>
  fatalError.value ? 'is-err' : cancelled.value ? 'is-warn' : 'is-ok',
)
const doneChipClass = computed(() => (!fatalError.value && !cancelled.value ? 'is-ok' : ''))
/** 鉴权失败(401/403):多半是 Key 未保存、填错或切错了引擎 */
const authFailed = computed(() =>
  stats.value.api_errors.some(e => e.status === 401 || e.status === 403),
)
const engineLabel = computed(() => (engineType.value === 'llm' ? 'LLM' : 'Qwen-MT'))
const doneRateText = computed(() => {
  const ok = stats.value.api_success
  const fail = stats.value.api_failed
  const all = ok + fail
  if (!all) {
    return cancelled.value ? '已取消' : '—'
  }
  return `${Math.round((ok / all) * 100)}% 成功`
})

/** 日志行首符号 */
function logMark(kind: TranslationLogEntry['kind']): string {
  switch (kind) {
    case 'start':
      return '…'
    case 'ok':
      return '✓'
    case 'err':
      return '✕'
    case 'write':
      return '!'
    default:
      return '·'
  }
}

function startTimer(): void {
  stopTimer()
  startedAt = Date.now()
  elapsed.value = 0
  timerId = window.setInterval(() => {
    elapsed.value = (Date.now() - startedAt) / 1000
  }, 200)
}

function stopTimer(): void {
  if (timerId) {
    window.clearInterval(timerId)
    timerId = 0
  }
}

onMounted(async () => {
  await loadFreshConfig()
  if (currentDocId.value) {
    await scanCurrent()
  }
})

// 从「插件设置」切回工作台时重新读配置(可能刚保存了 Key / 写入模式 / 语言对)
watch(
  () => workbenchTab.value,
  async (tab) => {
    if (tab !== 'translate') {
      return
    }
    await loadFreshConfig()
    if (phase.value === 'input' && currentDocId.value) {
      await scanCurrent()
    }
  },
)

onBeforeUnmount(() => {
  engine?.cancel()
  stopTimer()
  workbenchBusy.value = false
})

/** 扫描当前文档块数(不发起翻译) */
async function scanCurrent(): Promise<void> {
  const id = currentDocId.value
  if (!id) {
    return
  }
  currentLoading.value = true
  currentError.value = ''
  try {
    currentInfo.value = await scanDoc(id)
  } catch (e) {
    currentInfo.value = null
    currentError.value = `扫描失败:${(e as Error).message}`
  } finally {
    currentLoading.value = false
  }
}

/** 解析指定页面输入并扫描 */
async function parseCustom(): Promise<void> {
  parseMsg.value = ''
  parseErr.value = false
  parsedInfo.value = null
  parsedId.value = null
  const id = extractDocId(inputStr.value.trim())
  if (!id) {
    parseErr.value = true
    parseMsg.value = '无法解析文档 ID,请输入文档 ID 或 siyuan://blocks/... 链接'
    return
  }
  parsing.value = true
  try {
    const info = await scanDoc(id)
    if (!info.hpath) {
      throw new Error('文档不存在或已被删除')
    }
    parsedId.value = id
    parsedInfo.value = info
    parseMsg.value = `已解析:${info.hpath}`
  } catch (e) {
    parseErr.value = true
    parseMsg.value = `解析失败:${(e as Error).message}`
  } finally {
    parsing.value = false
  }
}

/** 重新读取插件存储中的配置
 *  设置页与工作台在同一个窗口里,若只在挂载时读一次,保存后翻译页会继续用旧配置
 *  (典型表现:设置里检查 Key 通过,真正翻译却 401)。 */
async function loadFreshConfig(): Promise<TransConfig> {
  const cfg = await loadConfig(plugin)
  config.value = cfg
  return cfg
}

/** 复用翻译引擎的块分类逻辑做只读扫描 */
async function scanDoc(id: string): Promise<ScanResult> {
  const cfg = await loadFreshConfig()
  return await new TranslationEngine(cfg).scan(id)
}

async function start() {
  const docId = resolvedId.value
  if (!docId) {
    return
  }
  const cfg = await loadFreshConfig()

  phase.value = 'running'
  workbenchBusy.value = true
  stats.value = emptyStats()
  total.value = 0
  cancelled.value = false
  fatalError.value = false
  statusText.value = '准备中…'
  currentBlockId.value = ''
  currentIndex.value = 0
  logs.value = []
  startTimer()

  const key = cfg.engine === 'llm' ? cfg.llm_api_key : cfg.api_key
  if (!key) {
    workbenchBusy.value = false
    statusText.value = '未配置 API Key,请先在设置中填写并保存'
    fatalError.value = true
    phase.value = 'done'
    return
  }
  engineType.value = cfg.engine
  engine = new TranslationEngine(cfg)
  try {
    await engine.run(docId, {
      onProgress: (done, t) => {
        total.value = t
        stats.value.translated = done
      },
      onBlockStart: (block, index, t) => {
        total.value = t
        currentIndex.value = index
        currentBlockId.value = block.id
      },
      onLog: (entry) => {
        logs.value.push(entry)
        if (logs.value.length > 60) {
          logs.value.splice(0, logs.value.length - 60)
        }
      },
      onStatus: (s) => {
        statusText.value = s
      },
      onComplete: async (s, c) => {
        stopTimer()
        stats.value = s
        cancelled.value = c
        elapsed.value = s.elapsed
        if (s.total_blocks) {
          total.value = s.total_blocks
        }
        // LLM 引擎:把本次运行的 token/缓存增量并入跨会话累计统计
        if (engineType.value === 'llm') {
          await accumulateLlmStats(plugin, {
            calls: s.api_success,
            input_tokens: s.prompt_tokens,
            output_tokens: s.completion_tokens,
            cached_tokens: s.cached_tokens,
            cache_reported: s.cache_reported,
          })
        }
        workbenchBusy.value = false
        phase.value = 'done'
      },
    })
  } catch (e) {
    stopTimer()
    workbenchBusy.value = false
    statusText.value = `错误:${(e as Error).message}`
    fatalError.value = true
    phase.value = 'done'
  }
}

/** 从完成页重新翻译当前文档(回到 running 页) */
function retranslate() {
  void start()
}

function cancel() {
  engine?.cancel()
}

function close() {
  props.dialog.destroy()
}

/** 解析文档 ID:接受纯 ID 或 siyuan://blocks/<id> 链接 */
function extractDocId(input: string): string | null {
  if (!input) {
    return null
  }
  const m = input.match(/siyuan:\/\/blocks\/([0-9]{14}-[a-z0-9]+)/)
  if (m) {
    return m[1]
  }
  if (/^[0-9]{14}-[a-z0-9]+$/.test(input)) {
    return input
  }
  const fallback = input.trim().split(/[/\s]+/).pop() ?? ''
  return /^[0-9]{14}-[a-z0-9]+$/.test(fallback) ? fallback : null
}
</script>

<style lang="scss" scoped>
/* ==========================================================================
   工作台待翻译态(紧凑单列)
   ========================================================================== */
.tw {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 顶部状态条 */
.tw-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--tr2-line);
  border-radius: var(--tr2-r-lg);
  background: var(--tr2-card);
  box-shadow: var(--tr2-shadow-1);
}

.tw-status__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 9px;
  background: var(--tr2-primary-soft);
  color: var(--tr2-primary-deep);
}

.tw-status__text {
  min-width: 0;
  flex: 1;
}

.tw-status__line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
}

.tw-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--tr2-ok);
}

.tw-status__api {
  overflow: hidden;
  font-family: var(--tr2-mono);
  font-size: 10.5px;
  font-weight: 400;
  color: var(--tr2-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tw-status__sub {
  margin-top: 1px;
  font-size: 10.5px;
  color: var(--tr2-muted);
}

.tw-card__head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  color: var(--tr2-primary-deep);
}

.tw-card__head .tr2-card__title {
  color: var(--tr2-text);
}

/* 页签 */
.tw-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  margin-bottom: 10px;
  padding: 3px;
  border-radius: var(--tr2-r);
  background: var(--tr2-inset);
}

.tw-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  border: 0;
  border-radius: var(--tr2-r-sm);
  background: none;
  color: var(--tr2-text-2);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &.is-active {
    background: var(--tr2-card);
    color: var(--tr2-primary-deep);
    box-shadow: var(--tr2-shadow-1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.tw-tab__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--tr2-primary);
}

/* 文档卡 */
.tw-doc {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.tw-doc__head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.tw-doc__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 10px;
  background: var(--tr2-primary-soft);
  color: var(--tr2-primary-deep);
}

.tw-doc__meta {
  min-width: 0;
  flex: 1;
}

.tw-doc__title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tw-doc__id {
  overflow: hidden;
  margin-top: 1px;
  font-family: var(--tr2-mono);
  font-size: 10.5px;
  color: var(--tr2-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 指标块 */
.tw-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tw-metric {
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--tr2-inset);

  &.is-primary {
    border-color: var(--tr2-primary-soft);

    .tw-metric__v {
      color: var(--tr2-primary-deep);
    }
  }
}

.tw-metric__k {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10.5px;
  color: var(--tr2-muted);
}

.tw-metric__v {
  margin-top: 2px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;

  span {
    margin-left: 2px;
    font-size: 11px;
    font-weight: 400;
    color: var(--tr2-muted);
  }
}

.tw-metric__note {
  overflow: hidden;
  margin-top: 2px;
  font-size: 10px;
  color: var(--tr2-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* chips */
.tw-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tw-chips__arrow {
  color: var(--tr2-placeholder);
}

/* 指定页面输入 */
.tw-input-row {
  display: flex;
  gap: 8px;
}

.tw-input {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  height: 34px;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid var(--tr2-line-strong);
  border-radius: var(--tr2-r);
  background: var(--tr2-card);
  color: var(--tr2-muted);

  &:focus-within {
    border-color: var(--tr2-primary);
    box-shadow: 0 0 0 3px var(--tr2-primary-soft);
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: none;
    font-family: var(--tr2-mono);
    font-size: 11.5px;
    color: var(--tr2-text);
  }
}

/* 提示 / 解析结果 */
.tw-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--tr2-r);
  background: var(--tr2-inset);
  color: var(--tr2-text-2);
  font-size: 11.5px;

  &.is-ok {
    background: var(--tr2-ok-soft);
    color: var(--tr2-ok);
  }

  &.is-err {
    background: var(--tr2-err-soft);
    color: var(--tr2-err);
  }
}

.tw-msg__title {
  font-weight: 500;
  color: var(--tr2-text);
}

.tw-msg__sub {
  margin-top: 1px;
  font-family: var(--tr2-mono);
  font-size: 10.5px;
  color: var(--tr2-muted);
}

.tw-empty {
  padding: 16px;
  border-radius: var(--tr2-r);
  background: var(--tr2-inset);
  color: var(--tr2-muted);
  font-size: 11.5px;
  text-align: center;
}

/* 主行动卡 */
.tw-action {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--tr2-primary-soft);
  border-radius: var(--tr2-r-lg);
  background: linear-gradient(90deg, var(--tr2-card), var(--tr2-inset));
  box-shadow: var(--tr2-shadow-1);
}

.tw-action__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--tr2-primary), var(--tr2-primary-deep));
  color: #fff;
  box-shadow: 0 2px 8px var(--tr2-primary-soft);
}

.tw-action__text {
  min-width: 0;
  flex: 1;
}

.tw-action__title {
  font-size: 12.5px;
  font-weight: 600;
}

.tw-action__chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 3px;
}

.tw-go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--tr2-r);
  background: var(--tr2-primary);
  box-shadow: 0 4px 12px var(--tr2-primary-soft);
  color: var(--tr2-on-primary);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;

  &:hover:not(:disabled) {
    background: var(--tr2-primary-deep);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    box-shadow: none;
    cursor: not-allowed;
  }
}

/* 就绪提示 */
.tw-ready {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px dashed var(--tr2-line-strong);
  border-radius: var(--tr2-r-lg);
  color: var(--tr2-muted);
}

.tw-ready__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 9px;
  background: var(--tr2-inset);
}

.tw-ready__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--tr2-text-2);
}

.tw-ready__sub {
  margin-top: 1px;
  font-size: 10.5px;
}

.tw-ready__port {
  margin-left: auto;
  font-family: var(--tr2-mono);
  font-size: 10.5px;
  white-space: nowrap;
}
/* ==========================================================================
   运行中 / 完成态
   ========================================================================== */
.tw-mono {
  font-family: var(--tr2-mono);
  font-size: 10.5px;
  color: var(--tr2-muted);
}

.tw-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tw-ok-text {
  color: var(--tr2-ok);
}

.tw-run__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  > .tr2-chip {
    margin-left: auto;
  }
}

.tw-run__pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tr2-primary);
  box-shadow: 0 0 0 0 var(--tr2-primary-soft);
  animation: tw-ping 1.6s ease-out infinite;
}

@keyframes tw-ping {
  0% {
    box-shadow: 0 0 0 0 var(--tr2-primary-soft);
  }

  70% {
    box-shadow: 0 0 0 6px transparent;
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

/* 当前块 */
.tw-run__block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border-radius: 10px;
  background: var(--tr2-inset);
}

.tw-run__block-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: var(--tr2-muted);
}

.tw-run__block-id {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  font-size: 11px;
  color: var(--tr2-text);
  white-space: nowrap;
}

.tw-run__sync {
  flex: 0 0 auto;
  color: var(--tr2-primary);
  animation: tr2-spin 1.8s linear infinite;
}

/* 进度 */
.tw-run__progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.tw-run__progress-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.tw-run__count {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tr2-primary-deep);
}

.tw-bar {
  height: 8px;
  padding: 1px;
  border-radius: 999px;
  background: var(--tr2-inset);
  overflow: hidden;
}

.tw-bar__fill {
  position: relative;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--tr2-primary), #38bdf8);
  transition: width 0.3s ease;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.55),
      transparent
    );
    animation: tw-shimmer 2.2s ease-in-out infinite;
  }
}

@keyframes tw-shimmer {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(200%);
  }
}

.tw-run__progress-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: var(--tr2-muted);
}

/* 流水日志 */
.tw-log {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--tr2-inset);
}

.tw-log__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
  font-size: 10px;
  color: var(--tr2-muted);
}

.tw-log__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--tr2-ok);
}

.tw-log__line {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  font-size: 10.5px;
  color: var(--tr2-text-2);
  white-space: nowrap;

  &.is-ok .tw-log__mark {
    color: var(--tr2-ok);
  }

  &.is-err {
    color: var(--tr2-err);

    .tw-log__mark {
      color: var(--tr2-err);
    }
  }

  &.is-start {
    color: var(--tr2-primary-deep);
  }
}

.tw-log__mark {
  width: 10px;
  flex: 0 0 10px;
  text-align: center;
  color: var(--tr2-muted);
}

.tw-log__id {
  flex: 0 0 auto;
}

.tw-log__msg {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tw-log__empty {
  font-size: 10.5px;
  color: var(--tr2-muted);
}

.tw-run__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;

  .tr2-hint {
    min-width: 0;
  }
}

/* 完成态 */
.tw-done__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 50%;

  &.is-ok {
    background: var(--tr2-ok-soft);
    color: var(--tr2-ok);
  }

  &.is-err {
    background: var(--tr2-err-soft);
    color: var(--tr2-err);
  }

  &.is-warn {
    background: rgba(217, 119, 6, 0.14);
    color: var(--tr2-warn);
  }
}

.tw-done__text {
  min-width: 0;
  flex: 1;
}

.tw-done__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;

  .tr2-btn {
    flex: 1;
  }
}

.tw-token {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--tr2-inset);
  font-size: 10.5px;
  color: var(--tr2-muted);

  .tw-mono {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tw-metrics--4 {
  margin-top: 2px;

  .tw-metric.is-err .tw-metric__v {
    color: var(--tr2-err);
  }
}

/* ==========================================================================
   动效(对齐设计稿:入场错落、光晕、高光扫过、扩散环)
   ========================================================================== */
.tw > * {
  animation: tr2-rise 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.tw > :nth-child(2) {
  animation-delay: 0.04s;
}

.tw > :nth-child(3) {
  animation-delay: 0.08s;
}

.tw > :nth-child(4) {
  animation-delay: 0.12s;
}

/* 状态点呼吸 */
.tw-status__dot,
.tw-log__dot {
  animation: tr2-pulse 2.4s ease-in-out infinite;
}

/* 指标卡悬浮 */
.tw-metric {
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--tr2-shadow-1);
  }
}

.tw-metric__v {
  font-variant-numeric: tabular-nums;
}

/* 主行动卡:呼吸光晕 + 图标扩散环 */
.tw-action {
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -46px;
    right: -34px;
    width: 150px;
    height: 150px;
    background: radial-gradient(circle, var(--tr2-primary-soft), transparent 70%);
    pointer-events: none;
    animation: tr2-halo 4.2s ease-in-out infinite;
  }
}

.tw-action__icon {
  position: relative;

  &::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 13px;
    box-shadow: 0 0 0 2px var(--tr2-primary-soft);
    pointer-events: none;
    animation: tr2-ring 2.6s ease-out infinite;
  }
}

/* 主按钮:渐变 + 高光扫过 + 悬浮抬升 */
.tw-go {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0284c7, var(--tr2-primary) 55%, #0369a1);
  box-shadow: 0 6px 16px -4px rgba(14, 165, 233, 0.5), 0 2px 4px rgba(14, 165, 233, 0.22);
  transition: transform 0.12s ease, box-shadow 0.2s ease, filter 0.2s ease;

  &::after {
    content: "";
    position: absolute;
    top: -40%;
    bottom: -40%;
    width: 38%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
    pointer-events: none;
    animation: tr2-shimmer 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-1px);
    box-shadow: 0 10px 22px -6px rgba(14, 165, 233, 0.55);
  }

  &:active:not(:disabled) {
    transform: translateY(1px) scale(0.98);
  }
}

/* 完成态指标卡错落弹入 */
.tw-metrics--4 .tw-metric {
  animation: tr2-rise 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;

  &:nth-child(2) {
    animation-delay: 0.05s;
  }

  &:nth-child(3) {
    animation-delay: 0.1s;
  }

  &:nth-child(4) {
    animation-delay: 0.15s;
  }
}

/* 完成态徽标弹入 / 新日志行淡入 */
.tw-done__badge {
  animation: tr2-pop-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.tw-log__line {
  animation: tr2-rise 0.2s ease both;
}

/* 进度条数字不抖动 */
.tw-run__count,
.tw-run__progress-foot {
  font-variant-numeric: tabular-nums;
}

</style>
