<template>
  <div class="trans-ui trans-setting">
    <!-- 翻译引擎 -->
    <div class="trans-card">
      <div class="trans-card__head">
        <span class="trans-badge">⚙️</span>
        <span class="trans-card__title">翻译引擎</span>
      </div>
      <div class="trans-field">
        <label class="trans-label">引擎</label>
        <div class="trans-combo">
          <button
            type="button"
            class="trans-combo__trigger trans-input"
            @click.stop="toggleEngine"
          >
            <span class="trans-combo__value">{{ engineLabel }}</span>
            <span class="trans-combo__caret">▾</span>
          </button>
          <div
            v-if="engineOpen"
            class="trans-combo__menu"
            @click.stop
          >
            <div
              v-for="opt in engineOptions"
              :key="opt.value"
              class="trans-combo__row"
            >
              <button
                type="button"
                class="trans-combo__row-name"
                :class="{ 'is-active': opt.value === cfg.engine }"
                @click="pickEngine(opt.value)"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="trans-hint" style="margin-top: 8px">
        两套引擎配置相互独立,切换后互不影响。
      </div>
    </div>

    <!-- 翻译 API (QWEN-MT) -->
    <div
      v-if="cfg.engine === 'qwen_mt'"
      class="trans-card"
    >
      <div class="trans-card__head">
        <span class="trans-badge">🔑</span>
        <span class="trans-card__title">翻译 API</span>
      </div>
      <div class="trans-field">
        <label class="trans-label">API Key</label>
        <div class="trans-input-wrap">
          <input
            v-model="cfg.api_key"
            class="trans-input"
            :type="showKey ? 'text' : 'password'"
            placeholder="DashScope API Key"
            autocomplete="off"
            spellcheck="false"
          >
          <EyeToggle
            :show="showKey"
            @toggle="showKey = !showKey"
          />
        </div>
      </div>
      <div class="trans-field">
        <label class="trans-label">API URL</label>
        <input
          v-model="cfg.api_url"
          class="trans-input"
          placeholder="OpenAI 兼容端点"
        >
      </div>
      <div class="trans-field">
        <label class="trans-label">模型</label>
        <input
          v-model="cfg.model_name"
          class="trans-input"
          placeholder="qwen-mt-plus"
        >
      </div>
      <div class="trans-grid trans-grid--2" style="margin-top: 12px">
        <div class="trans-field">
          <label class="trans-label">源语言</label>
          <input
            v-model="cfg.source_lang"
            class="trans-input"
            placeholder="English"
          >
        </div>
        <div class="trans-field">
          <label class="trans-label">目标语言</label>
          <input
            v-model="cfg.target_lang"
            class="trans-input"
            placeholder="Chinese"
          >
        </div>
      </div>
    </div>

    <!-- 翻译 API (LLM) -->
    <div
      v-else
      class="trans-card"
    >
      <div class="trans-card__head">
        <span class="trans-badge">🤖</span>
        <span class="trans-card__title">LLM 翻译</span>
      </div>
      <div class="trans-field">
        <label class="trans-label">API Key</label>
        <div class="trans-input-wrap">
          <input
            v-model="cfg.llm_api_key"
            class="trans-input"
            :type="showLlmKey ? 'text' : 'password'"
            placeholder="OpenAI 兼容 API Key"
            autocomplete="off"
            spellcheck="false"
          >
          <EyeToggle
            :show="showLlmKey"
            @toggle="showLlmKey = !showLlmKey"
          />
        </div>
      </div>
      <div class="trans-field">
        <label class="trans-label">Base URL</label>
        <input
          v-model="cfg.llm_base_url"
          class="trans-input"
          placeholder="https://api.example.com/v1"
        >
      </div>
      <div class="trans-field">
        <label class="trans-label">模型</label>
        <div class="trans-combo">
          <button
            type="button"
            class="trans-combo__trigger trans-input"
            @click.stop="toggleLlmModel"
          >
            <span class="trans-combo__value">{{ cfg.llm_model_name || '选择或输入模型名称' }}</span>
            <span class="trans-combo__caret">▾</span>
          </button>
          <div
            v-if="llmModelOpen"
            class="trans-combo__menu"
            @click.stop
          >
            <div
              v-if="!cfg.llm_models_history.length"
              class="trans-combo__empty"
            >
              暂无历史记录
            </div>
            <div
              v-for="m in cfg.llm_models_history"
              :key="m"
              class="trans-combo__row"
            >
              <button
                type="button"
                class="trans-combo__row-name"
                :class="{ 'is-active': m === cfg.llm_model_name }"
                @click="pickLlmModel(m)"
              >{{ m }}</button>
              <button
                type="button"
                class="trans-combo__row-del"
                :title="`删除 ${m}`"
                @click.stop="removeLlmModel(m)"
              >✕</button>
            </div>
            <div class="trans-combo__input-row">
              <input
                v-model="llmModelText"
                class="trans-input"
                placeholder="输入新模型名称,回车保存"
                @keydown.enter="commitLlmModel"
              >
              <button
                type="button"
                class="trans-btn trans-btn--ghost trans-btn--sm"
                @click="commitLlmModel"
              >＋</button>
            </div>
          </div>
        </div>
      </div>
      <div class="trans-field">
        <label class="trans-label">翻译 Prompt</label>
        <textarea
          v-model="cfg.llm_prompt"
          class="trans-textarea"
          rows="4"
          placeholder="系统提示词,指导模型完成翻译"
        />
      </div>
    </div>

    <!-- 写入与并发 -->
    <div class="trans-card">
      <div class="trans-card__head">
        <span class="trans-badge">⚙️</span>
        <span class="trans-card__title">写入与并发</span>
      </div>
      <div class="trans-field">
        <label class="trans-label">写入模式</label>
        <select
          v-model="cfg.write_mode"
          class="trans-select"
        >
          <option
            v-for="o in writeModeOptions"
            :key="o.value"
            :value="o.value"
          >
            {{ o.text }}
          </option>
        </select>
      </div>
      <div class="trans-grid" style="margin-top: 12px">
        <div class="trans-field">
          <label class="trans-label">并发数</label>
          <input
            v-model.number="activeConcurrency"
            class="trans-input"
            type="number"
            min="1"
            max="32"
          >
        </div>
        <div class="trans-field">
          <label class="trans-label">最大重试</label>
          <input
            v-model.number="cfg.max_retries"
            class="trans-input"
            type="number"
            min="0"
            max="10"
          >
        </div>
        <div class="trans-field">
          <label class="trans-label">退避基数（秒）</label>
          <input
            v-model.number="cfg.backoff_base"
            class="trans-input"
            type="number"
            min="1"
            max="10"
          >
        </div>
      </div>
    </div>

    <!-- LLM 累计统计 -->
    <div
      v-if="cfg.engine === 'llm'"
      class="trans-card"
    >
      <div class="trans-card__head">
        <span class="trans-badge">📊</span>
        <span class="trans-card__title">LLM 累计统计</span>
        <button
          class="trans-btn trans-btn--ghost trans-btn--sm"
          style="margin-left: auto"
          title="清零全部累计统计"
          @click="clearLlmStats"
        >
          清零
        </button>
      </div>
      <div class="trans-hint" style="margin-bottom: 12px">
        全部对话的累计数据,跨会话持久化。
      </div>
      <div class="trans-stats">
        <div class="trans-stat">
          <div class="trans-stat__num">
            {{ llmStats.calls }}
          </div>
          <div class="trans-stat__label">
            累计翻译次数
          </div>
        </div>
        <div class="trans-stat">
          <div class="trans-stat__num">
            {{ formatHitRate(llmStats.cached_tokens, llmStats.input_tokens, llmStats.cache_reported) }}
          </div>
          <div class="trans-stat__label">
            累计缓存命中率
          </div>
        </div>
        <div class="trans-stat">
          <div class="trans-stat__num">
            {{ formatM(llmStats.input_tokens) }}
          </div>
          <div class="trans-stat__label">
            累计输入 Token
          </div>
        </div>
        <div class="trans-stat">
          <div class="trans-stat__num">
            {{ formatM(llmStats.output_tokens) }}
          </div>
          <div class="trans-stat__label">
            累计输出 Token
          </div>
        </div>
      </div>
    </div>

    <!-- 领域提示 -->
    <div
      v-if="cfg.engine === 'qwen_mt'"
      class="trans-card"
    >
      <div class="trans-card__head">
        <span class="trans-badge">🧭</span>
        <span class="trans-card__title">领域提示</span>
      </div>
      <textarea
        v-model="cfg.domains"
        class="trans-textarea"
        rows="3"
        placeholder="自由文本,描述文档领域与语气(非空时发送)"
      />
    </div>

    <!-- 术语干预 -->
    <div
      v-if="cfg.engine === 'qwen_mt'"
      class="trans-card"
    >
      <div class="trans-card__head">
        <span class="trans-badge">📔</span>
        <span class="trans-card__title">术语干预</span>
      </div>
      <div
        v-if="cfg.terms.length"
        style="margin-bottom: 10px"
      >
        <div
          v-for="(item, i) in cfg.terms"
          :key="`terms-${i}`"
          class="trans-pair"
        >
          <input
            v-model="item.source"
            class="trans-input"
            placeholder="原文术语"
          >
          <span class="trans-pair__arrow">→</span>
          <input
            v-model="item.target"
            class="trans-input"
            placeholder="译文术语"
          >
          <button
            class="trans-btn trans-btn--ghost trans-btn--icon"
            title="删除"
            @click="removePair(cfg.terms, i)"
          >
            ✕
          </button>
        </div>
      </div>
      <div
        v-else
        class="trans-hint"
        style="margin-bottom: 10px"
      >
        暂无术语。添加后可强制指定某些词的译法。
      </div>
      <button
        class="trans-btn trans-btn--ghost trans-btn--sm"
        @click="addPair(cfg.terms)"
      >
        ＋ 添加术语
      </button>
    </div>

    <!-- 翻译记忆 -->
    <div
      v-if="cfg.engine === 'qwen_mt'"
      class="trans-card"
    >
      <div class="trans-card__head">
        <span class="trans-badge">🧠</span>
        <span class="trans-card__title">翻译记忆</span>
      </div>
      <div
        v-if="cfg.tm_list.length"
        style="margin-bottom: 10px"
      >
        <div
          v-for="(item, i) in cfg.tm_list"
          :key="`tm-${i}`"
          class="trans-pair"
        >
          <input
            v-model="item.source"
            class="trans-input"
            placeholder="原文参考句"
          >
          <span class="trans-pair__arrow">→</span>
          <input
            v-model="item.target"
            class="trans-input"
            placeholder="译文参考句"
          >
          <button
            class="trans-btn trans-btn--ghost trans-btn--icon"
            title="删除"
            @click="removePair(cfg.tm_list, i)"
          >
            ✕
          </button>
        </div>
      </div>
      <div
        v-else
        class="trans-hint"
        style="margin-bottom: 10px"
      >
        暂无记忆。添加参考例句可让译文风格更一致。
      </div>
      <button
        class="trans-btn trans-btn--ghost trans-btn--sm"
        @click="addPair(cfg.tm_list)"
      >
        ＋ 添加记忆
      </button>
    </div>

    <!-- 操作 -->
    <div class="trans-actions">
      <div class="trans-actions__group">
        <button
          class="trans-btn trans-btn--ghost"
          :disabled="checking"
          @click="checkConfig"
        >
          <span
            v-if="checking"
            class="trans-spin"
          />{{ checking ? '检查中…' : '配置检查' }}
        </button>
        <span
          v-if="checkMsg"
          class="trans-check-inline"
          :class="checkOk ? 'trans-check-inline--ok' : 'trans-check-inline--err'"
          :title="checkMsg"
        >
          <span>{{ checkOk ? '✓' : '✕' }}</span>
          <span class="trans-check-inline__text">{{ checkMsg }}</span>
        </span>
      </div>
      <button
        class="trans-btn trans-btn--primary"
        @click="save"
      >
        保存配置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePlugin } from '@/main'
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '@/trans/config'
import { formatHitRate, formatM, loadLlmStats, resetLlmStats } from '@/trans/llm_stats'
import { LlmTranslationClient, TranslationClient } from '@/trans/translator'
import EyeToggle from './EyeToggle.vue'
import { showMessage } from 'siyuan'
import { version } from '@/api'
import type { LlmCumulativeStats, TermPair, TransConfig } from '@/trans/types'

const plugin = usePlugin()

const writeModeOptions = [
  { value: 'append', text: '双语追加（保留原文）' },
  { value: 'replace', text: '替换原文' },
  { value: 'new_doc', text: '新建译文文档' },
]

const engineOptions = [
  { value: 'qwen_mt', label: 'QWEN-MT（DashScope）' },
  { value: 'llm', label: 'LLM（OpenAI 兼容）' },
]

/** 引擎下拉是否展开 */
const engineOpen = ref(false)
/** 当前引擎的显示文案 */
const engineLabel = computed(
  () => engineOptions.find(o => o.value === cfg.value.engine)?.label ?? cfg.value.engine,
)

const cfg = ref<TransConfig>(structuredClone(DEFAULT_CONFIG))
const checkMsg = ref('')
const checkOk = ref(false)
const checking = ref(false)
/** API Key 是否以明文显示 */
const showKey = ref(false)
/** LLM API Key 是否以明文显示 */
const showLlmKey = ref(false)

/** 模型下拉是否展开 */
const llmModelOpen = ref(false)
/** 下拉内新模型输入框内容 */
const llmModelText = ref('')
/** LLM 累计统计(全部对话,跨会话持久化) */
const llmStats = ref<LlmCumulativeStats>({
  calls: 0,
  input_tokens: 0,
  output_tokens: 0,
  cached_tokens: 0,
  cache_reported: false,
})

/** 并发数:按当前引擎读写各自字段(qwen 用 concurrency,llm 用 llm_concurrency) */
const activeConcurrency = computed({
  get: () => cfg.value.engine === 'llm' ? cfg.value.llm_concurrency : cfg.value.concurrency,
  set: (v) => {
    if (cfg.value.engine === 'llm') {
      cfg.value.llm_concurrency = v
    } else {
      cfg.value.concurrency = v
    }
  },
})

onMounted(async () => {
  cfg.value = await loadConfig(plugin)
  llmStats.value = await loadLlmStats(plugin)
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})

function onDocClick() {
  llmModelOpen.value = false
  engineOpen.value = false
}

function addPair(arr: TermPair[]) {
  arr.push({ source: '', target: '' })
}

function removePair(arr: TermPair[], i: number) {
  arr.splice(i, 1)
}

/** 展开/收起引擎下拉 */
function toggleEngine() {
  engineOpen.value = !engineOpen.value
}

/** 选择引擎 */
function pickEngine(v: string) {
  cfg.value.engine = v as TransConfig['engine']
  engineOpen.value = false
}

/** 展开/收起模型下拉 */
function toggleLlmModel() {
  llmModelOpen.value = !llmModelOpen.value
  if (llmModelOpen.value) {
    llmModelText.value = cfg.value.llm_model_name
  }
}

/** 选择历史模型 */
function pickLlmModel(m: string) {
  cfg.value.llm_model_name = m
  ensureLlmModelHistory(m)
  llmModelOpen.value = false
}

/** 提交输入框中的新模型(回车或点 ＋) */
function commitLlmModel() {
  const name = llmModelText.value.trim()
  if (!name) {
    return
  }
  cfg.value.llm_model_name = name
  ensureLlmModelHistory(name)
  llmModelOpen.value = false
}

/** 将模型名记入历史(去重) */
function ensureLlmModelHistory(name: string) {
  if (!cfg.value.llm_models_history.includes(name)) {
    cfg.value.llm_models_history.push(name)
  }
}

/** 删除历史模型;若正选中则回退到第一个 */
function removeLlmModel(m: string) {
  cfg.value.llm_models_history = cfg.value.llm_models_history.filter(x => x !== m)
  if (cfg.value.llm_model_name === m) {
    cfg.value.llm_model_name = cfg.value.llm_models_history[0] ?? ''
  }
}

/** 清零 LLM 累计统计 */
async function clearLlmStats() {
  llmStats.value = await resetLlmStats(plugin)
  showMessage('累计统计已清零', 2000, 'info')
}

async function checkConfig() {
  checking.value = true
  checkMsg.value = ''
  checkOk.value = false
  try {
    // 按当前引擎选择连通性测试客户端
    const provider = cfg.value.engine === 'llm'
      ? new LlmTranslationClient(cfg.value)
      : new TranslationClient(cfg.value)
    const [v, t] = await Promise.all([
      version(),
      provider.testConnection(),
    ])
    if (t.ok) {
      checkOk.value = true
      checkMsg.value = `思源 ${v || '未知'} · ${t.message}`
    } else {
      checkOk.value = false
      checkMsg.value = `思源 ${v || '未知'} · ${t.message}`
    }
  } catch (e) {
    checkOk.value = false
    checkMsg.value = (e as Error).message
  } finally {
    checking.value = false
  }
}

async function save() {
  // 保存时把当前模型名一并记入历史
  if (cfg.value.llm_model_name?.trim()) {
    ensureLlmModelHistory(cfg.value.llm_model_name.trim())
  }
  await saveConfig(plugin, cfg.value)
  showMessage('配置已保存', 2000, 'info')
}
</script>

<style lang="scss" scoped>
/* 卡片之间统一间距(依赖全局 .trans-card) */
.trans-setting .trans-card + .trans-card {
  margin-top: 14px;
}

/* ============ 下拉框(引擎 / 模型) ============ */
.trans-combo {
  position: relative;
}

.trans-combo__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}

.trans-combo__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trans-combo__caret {
  flex-shrink: 0;
  margin-left: 8px;
  opacity: 0.6;
}

.trans-combo__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  background: var(--b3-theme-background, #fff);
  border: 1px solid var(--b3-theme-background-light, rgba(128, 128, 128, 0.25));
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  padding: 6px;
}

.trans-combo__empty {
  padding: 8px 10px;
  font-size: 12px;
  color: var(--b3-theme-on-surface-variant, rgba(120, 120, 120, 0.85));
}

.trans-combo__row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
}

.trans-combo__row-name {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--tr-text, #2c2c2c);
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trans-combo__row-name:hover,
.trans-combo__row-name.is-active {
  background: var(--b3-theme-primary-lightest, rgba(74, 124, 255, 0.14));
  color: var(--b3-theme-primary, #4a7cff);
}

.trans-combo__row-del {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  line-height: 1;
  color: var(--b3-theme-on-surface-variant, rgba(120, 120, 120, 0.85));
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.trans-combo__row-del:hover {
  color: var(--b3-theme-error, #f44336);
  background: var(--b3-theme-background-light, rgba(128, 128, 128, 0.25));
}

.trans-combo__input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--b3-theme-background-light, rgba(128, 128, 128, 0.25));
}
</style>
