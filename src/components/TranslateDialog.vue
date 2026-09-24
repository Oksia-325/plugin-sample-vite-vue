<template>
  <div class="trans-ui">
    <!-- ============================================================ 输入页 -->
    <section
      v-if="phase === 'input'"
      class="trans-view"
    >
      <div class="trans-hero">
        <span class="trans-hero__icon">🔎</span>
        <div>
          <div class="trans-hero__title">
            翻译指定页面
          </div>
          <div class="trans-hero__sub">
            输入文档 ID 或 siyuan:// 链接
          </div>
        </div>
      </div>

      <div class="trans-card">
        <div class="trans-field">
          <label class="trans-label">文档 ID / 链接</label>
          <input
            v-model="inputStr"
            class="trans-input"
            placeholder="20260529110932-dubkz1x 或 siyuan://blocks/..."
            @keydown.enter="resolve"
          >
        </div>

        <div
          v-if="resolveMsg"
          class="trans-banner"
          :class="resolveErr ? 'trans-banner--err' : 'trans-banner--ok'"
          style="margin-top: 12px"
        >
          <span>{{ resolveErr ? '⚠️' : '✅' }}</span>
          <span>{{ resolveMsg }}</span>
        </div>

        <div class="trans-actions trans-actions--split">
          <button
            class="trans-btn trans-btn--ghost"
            :disabled="resolving"
            @click="resolve"
          >
            <span
              v-if="resolving"
              class="trans-spin"
            />{{ resolving ? '解析中…' : '解析' }}
          </button>
          <button
            class="trans-btn trans-btn--primary"
            :disabled="!resolvedDocId"
            @click="start"
          >
            开始翻译
          </button>
        </div>
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
            {{ docTitle || resolvedDocId }}
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
            {{ docTitle || resolvedDocId }}
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
import { usePlugin } from '@/main'
import { loadConfig } from '@/trans/config'
import { TranslationEngine } from '@/trans/engine'
import { accumulateLlmStats, formatHitRate, formatM } from '@/trans/llm_stats'
import { SiYuanClient } from '@/trans/siyuan'
import { emptyStats, type EngineType, type TranslationStats } from '@/trans/types'

const props = defineProps<{
  docId?: string | null
  allowInput?: boolean
  dialog: Dialog
}>()

const plugin = usePlugin()

const phase = ref<'input' | 'running' | 'done'>(
  props.allowInput ? 'input' : 'running',
)
const inputStr = ref('')
const resolvedDocId = ref<string | null>(null)
const resolveMsg = ref('')
const resolveErr = ref(false)
const resolving = ref(false)

const docTitle = ref('')
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
  if (!props.allowInput && props.docId) {
    resolvedDocId.value = props.docId
    await start()
  }
})

onBeforeUnmount(() => {
  engine?.cancel()
})

async function resolve() {
  resolveMsg.value = ''
  resolveErr.value = false
  resolving.value = true
  try {
    const id = extractDocId(inputStr.value.trim())
    if (!id) {
      resolveErr.value = true
      resolveMsg.value = '无法解析文档 ID,请输入文档 ID 或 siyuan://blocks/... 链接'
      return
    }
    const sy = new SiYuanClient()
    const hpath = await sy.getHPath(id)
    resolvedDocId.value = id
    docTitle.value = hpath || id
    resolveErr.value = false
    resolveMsg.value = `已解析:${hpath}`
  } catch (e) {
    resolveErr.value = true
    resolveMsg.value = `解析失败:${(e as Error).message}`
  } finally {
    resolving.value = false
  }
}

async function start() {
  const docId = resolvedDocId.value
  if (!docId) {
    return
  }
  phase.value = 'running'
  stats.value = emptyStats()
  total.value = 0
  cancelled.value = false
  fatalError.value = false
  statusText.value = '准备中…'

  const cfg = await loadConfig(plugin)
  if (!cfg?.api_key) {
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
        phase.value = 'done'
      },
    })
  } catch (e) {
    statusText.value = `错误:${(e as Error).message}`
    fatalError.value = true
    phase.value = 'done'
  }
}

/** 从完成页重新翻译当前文档(回到 running 页) */
function retranslate() {
  if (resolvedDocId.value) {
    void start()
  } else if (props.allowInput) {
    phase.value = 'input'
  }
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
