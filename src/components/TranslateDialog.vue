<template>
  <div class="trans-ui">
    <!-- ============================================================ 工作台(待翻译) -->
    <section
      v-if="phase === 'input'"
      class="trans-view tw"
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
                name="check"
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
      class="trans-view"
    >
      <div class="trans-hero">
        <span class="trans-hero__icon"><span class="trans-spin" /></span>
        <div>
          <div class="trans-hero__title">
            正在翻译
          </div>
          <div class="trans-hero__sub">
            {{ docTitle || resolvedId }}
          </div>
        </div>
      </div>

      <div class="trans-card">
        <div class="trans-progress trans-progress--active">
          <div
            class="trans-progress__bar"
            :style="{ width: progressPct }"
          />
        </div>
        <div class="trans-progress__meta">
          <span>{{ stats.translated }} / {{ total || '—' }} 块</span>
          <span class="trans-progress__pct">{{ progressPct }}</span>
        </div>

        <div class="trans-status" style="margin-top: 14px">
          {{ statusText }}
        </div>
      </div>

      <div class="trans-actions">
        <button
          class="trans-btn trans-btn--danger"
          @click="cancel"
        >
          取消翻译
        </button>
      </div>
    </section>

    <!-- ======================================================= 完成页 -->
    <section
      v-else
      class="trans-view"
    >
      <div class="trans-hero">
        <span
          class="trans-hero__icon"
          :class="{ 'trans-hero__icon--ok': !cancelled && !fatalError }"
        >{{ cancelled ? '⏹' : fatalError ? '❌' : '✅' }}</span>
        <div>
          <div class="trans-hero__title">
            {{ cancelled ? '翻译已取消' : fatalError ? '翻译出错' : '翻译完成' }}
          </div>
          <div class="trans-hero__sub">
            {{ docTitle || resolvedId }}
          </div>
        </div>
      </div>

      <div
        v-if="statusText && (cancelled || fatalError)"
        class="trans-banner"
        :class="fatalError ? 'trans-banner--err' : 'trans-banner--info'"
        style="margin-bottom: 14px"
      >
        <span>{{ statusText }}</span>
      </div>

      <div class="trans-stats">
        <div class="trans-stat">
          <div class="trans-stat__num">
            {{ stats.elapsed.toFixed(1) }}s
          </div>
          <div class="trans-stat__label">
            总耗时
          </div>
        </div>
        <div class="trans-stat">
          <div class="trans-stat__num">
            {{ stats.translated }}
          </div>
          <div class="trans-stat__label">
            已翻译块
          </div>
        </div>
        <div
          class="trans-stat"
          :class="{ 'trans-stat--err': stats.api_failed > 0 }"
        >
          <div class="trans-stat__num">
            {{ stats.api_success }}<span v-if="stats.api_failed">/{{ stats.api_failed }}</span>
          </div>
          <div class="trans-stat__label">
            API 成功 / 失败
          </div>
        </div>
        <div
          class="trans-stat"
          :class="{ 'trans-stat--err': stats.write_failed > 0 }"
        >
          <div class="trans-stat__num">
            {{ stats.write_success }}<span v-if="stats.write_failed">/{{ stats.write_failed }}</span>
          </div>
          <div class="trans-stat__label">
            写入成功 / 失败
          </div>
        </div>
      </div>

      <div
        v-if="engineType === 'llm'"
        class="trans-card"
        style="margin-top: 14px"
      >
        <div class="trans-card__head">
          <span class="trans-badge">📊</span>
          <span class="trans-card__title">本次 Token 统计</span>
        </div>
        <div class="trans-stats">
          <div class="trans-stat">
            <div class="trans-stat__num">
              {{ stats.api_success }}
            </div>
            <div class="trans-stat__label">
              翻译次数
            </div>
          </div>
          <div class="trans-stat">
            <div class="trans-stat__num">
              {{ formatHitRate(stats.cached_tokens, stats.prompt_tokens, stats.cache_reported) }}
            </div>
            <div class="trans-stat__label">
              缓存命中率
            </div>
          </div>
          <div class="trans-stat">
            <div class="trans-stat__num">
              {{ formatM(stats.prompt_tokens) }}
            </div>
            <div class="trans-stat__label">
              输入 Token
            </div>
          </div>
          <div class="trans-stat">
            <div class="trans-stat__num">
              {{ formatM(stats.completion_tokens) }}
            </div>
            <div class="trans-stat__label">
              输出 Token
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="stats.skipped_non_text || stats.skipped_already_translated"
        class="trans-hint"
        style="margin-top: 12px; text-align: center"
      >
        跳过:非文本 {{ stats.skipped_non_text }} · 已翻译 {{ stats.skipped_already_translated }}
      </div>

      <div
        v-if="stats.api_errors.length"
        class="trans-errors"
        style="margin-top: 12px"
      >
        <div class="trans-errors__title">
          ⚠️ 翻译失败明细 ({{ stats.api_errors.length }})
        </div>
        <div class="trans-errors__list">
          <div
            v-for="(e, i) in stats.api_errors"
            :key="i"
            class="trans-errors__item"
          >
            <span class="trans-errors__code">{{ e.status != null ? `HTTP ${e.status}` : '网络错误' }}</span>
            <span class="trans-errors__msg">{{ e.message }}</span>
          </div>
        </div>
      </div>

      <div class="trans-actions trans-actions--split">
        <button
          class="trans-btn trans-btn--ghost"
          @click="retranslate"
        >
          ↻ 重新翻译
        </button>
        <button
          class="trans-btn trans-btn--primary"
          @click="close"
        >
          关闭
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Dialog } from 'siyuan'
import Icon from '@/components/ui/Icon.vue'
import { usePlugin } from '@/main'
import { loadConfig } from '@/trans/config'
import { TranslationEngine } from '@/trans/engine'
import { accumulateLlmStats, formatHitRate, formatM } from '@/trans/llm_stats'
import { emptyStats, type EngineType, type ScanResult, type TransConfig, type TranslationStats } from '@/trans/types'
import { workbenchBusy } from '@/store/workbench'

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

/** 语言 / 写入模式 / 引擎的展示文案 */
const LANG_LABELS: Record<string, string> = {
  English: '英文',
  Chinese: '中文',
  'Simplified Chinese': '简体中文',
  'Traditional Chinese': '繁体中文',
  Japanese: '日文',
  Korean: '韩文',
  French: '法文',
  German: '德文',
  Spanish: '西班牙文',
  Russian: '俄文',
  Arabic: '阿拉伯文',
  Portuguese: '葡萄牙文',
  Italian: '意大利文',
}

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

function langLabel(value: string): string {
  return LANG_LABELS[value] ?? value
}

/* ------------------------------ 翻译运行态 ------------------------------ */

const statusText = ref('')
const stats = ref<TranslationStats>(emptyStats())
const total = ref(0)
const cancelled = ref(false)
const fatalError = ref(false)
/** 当前使用的翻译引擎(决定是否展示/累计 LLM token 统计) */
const engineType = ref<EngineType>('qwen_mt')

let engine: TranslationEngine | null = null

const progressPct = computed(() => {
  if (total.value <= 0) {
    return '0%'
  }
  return `${Math.min(100, Math.round((stats.value.translated / total.value) * 100))}%`
})

onMounted(async () => {
  config.value = await loadConfig(plugin)
  if (currentDocId.value) {
    await scanCurrent()
  }
})

onBeforeUnmount(() => {
  engine?.cancel()
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

/** 复用翻译引擎的块分类逻辑做只读扫描 */
async function scanDoc(id: string): Promise<ScanResult> {
  const cfg = config.value ?? (await loadConfig(plugin))
  config.value = cfg
  return await new TranslationEngine(cfg).scan(id)
}

async function start() {
  const docId = resolvedId.value
  if (!docId) {
    return
  }
  const cfg = config.value ?? (await loadConfig(plugin))
  config.value = cfg

  phase.value = 'running'
  workbenchBusy.value = true
  stats.value = emptyStats()
  total.value = 0
  cancelled.value = false
  fatalError.value = false
  statusText.value = '准备中…'

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
      onStatus: (s) => {
        statusText.value = s
      },
      onComplete: async (s, c) => {
        stats.value = s
        cancelled.value = c
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
</style>
