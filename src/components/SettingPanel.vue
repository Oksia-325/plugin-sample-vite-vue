<template>
  <div class="tr2 st trans-ui">
    <!-- 顶部:标题 + 锚点导航 -->
    <header class="st-head">
      <div class="st-head__main">
        <span class="st-head__icon"><Icon
          name="tune"
          :size="17"
        /></span>
        <div class="st-head__text">
          <div class="st-head__title">
            插件偏好设置
            <span class="st-head__ver">v{{ pluginVersion }}</span>
          </div>
          <div class="st-head__sub">
            配置文档块翻译行为、API 连接凭据与术语控制表
          </div>
        </div>
      </div>
      <nav class="st-nav">
        <button
          v-for="a in anchors"
          :key="a.id"
          class="st-nav__item"
          :class="{ 'is-active': activeAnchor === a.id }"
          type="button"
          @click="scrollTo(a.id)"
        >
          <Icon
            :name="a.icon"
            :size="13"
          />{{ a.label }}
        </button>
      </nav>
    </header>

    <!-- 通用行为 -->
    <section
      id="st-general"
      class="tr2-card st-sec"
    >
      <div class="st-sec__head">
        <span class="st-sec__icon"><Icon
          name="tune"
          :size="15"
        /></span>
        <div>
          <div class="tr2-card__title">
            通用设置
          </div>
          <div class="tr2-hint">
            定义译文的写入方式、并发重试与网络出口
          </div>
        </div>
      </div>

      <div class="st-field">
        <div class="st-label-row">
          <span class="tr2-label">写入文档模式</span>
          <span class="tr2-hint">推荐:双语追加</span>
        </div>
        <div class="st-modes">
          <label
            v-for="m in writeModeCards"
            :key="m.value"
            class="st-mode"
            :class="{ 'is-active': cfg.write_mode === m.value }"
          >
            <input
              v-model="cfg.write_mode"
              class="st-mode__radio"
              type="radio"
              :value="m.value"
            >
            <span class="st-mode__icon"><Icon
              :name="m.icon"
              :size="16"
            /></span>
            <span class="st-mode__body">
              <span class="st-mode__title">{{ m.title }}</span>
              <span class="st-mode__desc">{{ m.desc }}</span>
            </span>
          </label>
        </div>
      </div>

      <div class="st-grid3">
        <div class="st-field">
          <span class="tr2-label">并发处理数</span>
          <input
            v-model.number="activeConcurrency"
            class="st-input"
            type="number"
            min="1"
            max="8"
          >
          <span class="tr2-hint">范围 1 - 8,默认 4</span>
        </div>
        <div class="st-field">
          <span class="tr2-label">最大重试次数</span>
          <input
            v-model.number="cfg.max_retries"
            class="st-input"
            type="number"
            min="0"
            max="10"
          >
          <span class="tr2-hint">0 表示不重试</span>
        </div>
        <div class="st-field">
          <span class="tr2-label">退避基数(秒)</span>
          <input
            v-model.number="cfg.backoff_base"
            class="st-input"
            type="number"
            min="1"
            max="5"
          >
          <span class="tr2-hint">指数递增,上限 5 秒</span>
        </div>
      </div>

      <div class="st-field">
        <div class="st-label-row">
          <span class="tr2-label">网络代理</span>
          <span class="tr2-hint">决定翻译请求从哪里发出</span>
        </div>
        <div class="st-proxies">
          <label
            v-for="p in proxyModeCards"
            :key="p.value"
            class="st-proxy"
            :class="{ 'is-active': cfg.proxy_mode === p.value }"
          >
            <input
              v-model="cfg.proxy_mode"
              class="st-mode__radio"
              type="radio"
              :value="p.value"
            >
            <span class="st-proxy__head">
              <Icon
                :name="p.icon"
                :size="15"
              />
              <span>{{ p.title }}</span>
            </span>
            <span class="st-proxy__desc">{{ p.desc }}</span>
          </label>
        </div>
      </div>
    </section>

    <!-- 翻译引擎(样式 S5 重做,功能保持) -->
    <section
      id="st-engine"
      class="st-engine"
    >
      <div class="st-sec__head st-sec__head--plain">
        <span class="st-sec__icon"><Icon
          name="plug"
          :size="15"
        /></span>
        <div>
          <div class="tr2-card__title">
            翻译引擎
          </div>
          <div class="tr2-hint">
            两套引擎配置相互独立,切换后互不影响
          </div>
        </div>
      </div>

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
      <div id="st-stats">
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
      </div>
    </section>

    <!-- 底部工具条 -->
    <footer class="st-foot">
      <button
        class="tr2-btn is-ghost is-sm"
        type="button"
        :disabled="checking"
        @click="checkConfig"
      >
        <span
          v-if="checking"
          class="tr2-spin"
        /><Icon
          v-else
          name="cloud"
          :size="13"
        />
        配置连通性检查
      </button>
      <span
        v-if="checkMsg"
        class="st-check"
        :class="checkOk ? 'is-ok' : 'is-err'"
        :title="checkMsg"
      >
        <Icon
          :name="checkOk ? 'check' : 'alert'"
          :size="12"
        />
        <span class="st-check__text">{{ checkMsg }}</span>
        <span
          v-if="latency !== null"
          class="st-check__ms"
        >{{ latency }}ms</span>
      </span>
      <span class="st-foot__spacer" />
      <button
        class="tr2-btn is-ghost"
        type="button"
        @click="resetDefaults"
      >
        重置默认
      </button>
      <button
        class="tr2-btn is-primary"
        type="button"
        @click="save"
      >
        保存配置
      </button>
    </footer>

    <div
      v-if="toastMsg"
      class="st-toast"
    >
      <Icon
        name="taskAlt"
        :size="15"
      />
      <span>{{ toastMsg }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { showMessage } from 'siyuan'
import Icon from '@/components/ui/Icon.vue'
import EyeToggle from './EyeToggle.vue'
import { usePlugin } from '@/main'
import { version as kernelVersion } from '@/api'
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '@/trans/config'
import { formatHitRate, formatM, loadLlmStats, resetLlmStats } from '@/trans/llm_stats'
import { LlmTranslationClient, TranslationClient } from '@/trans/translator'
import type { LlmCumulativeStats, TermPair, TransConfig } from '@/trans/types'
import PluginInfo from '@/../plugin.json'

const plugin = usePlugin()
const pluginVersion = (PluginInfo as { version?: string }).version ?? ''

const engineOptions = [
  { value: 'qwen_mt', label: 'QWEN-MT（DashScope）' },
  { value: 'llm', label: 'LLM（OpenAI 兼容）' },
]

/** 写入模式单选卡 */
const writeModeCards = [
  {
    value: 'append',
    icon: 'split',
    title: '双语追加(保留原文)',
    desc: '译文追加在原块内容之后,保留原文对照;已翻译块会自动跳过。',
  },
  {
    value: 'replace',
    icon: 'refresh',
    title: '替换原文内容',
    desc: '译文直接覆盖块内容,保留块 ID 与引用锚点不变。',
  },
  {
    value: 'new_doc',
    icon: 'doc',
    title: '新建译文文档',
    desc: '在同级目录派生「原名 (译文)」文档,独立保存全部译文。',
  },
] as const

/** 网络出口单选卡 */
const proxyModeCards = [
  {
    value: 'siyuan_kernel',
    icon: 'hub',
    title: '通过思源内核访问',
    desc: '复用思源内置网络能力转发请求,不受浏览器 CORS 限制(推荐)。',
  },
  {
    value: 'system',
    icon: 'cloud',
    title: '自动选择系统代理',
    desc: '由前端直连端点,跟随操作系统代理;端点需允许跨域访问。',
  },
] as const

/** 锚点导航 */
const anchors = [
  { id: 'st-general', label: '通用行为', icon: 'tune' },
  { id: 'st-engine', label: '翻译引擎', icon: 'plug' },
  { id: 'st-stats', label: '用量看板', icon: 'chart' },
]

const activeAnchor = ref('st-general')

const cfg = ref<TransConfig>(structuredClone(DEFAULT_CONFIG))
const checkMsg = ref('')
const checkOk = ref(false)
const checking = ref(false)
/** 连通性检查耗时(ms) */
const latency = ref<number | null>(null)
/** API Key 是否以明文显示 */
const showKey = ref(false)
/** LLM API Key 是否以明文显示 */
const showLlmKey = ref(false)

/** 引擎下拉是否展开 */
const engineOpen = ref(false)
/** 当前引擎的显示文案 */
const engineLabel = computed(
  () => engineOptions.find(o => o.value === cfg.value.engine)?.label ?? cfg.value.engine,
)

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

/** 轻量 toast */
const toastMsg = ref('')
let toastTimer = 0

/** 并发数:按当前引擎读写各自字段 */
const activeConcurrency = computed({
  get: () => (cfg.value.engine === 'llm' ? cfg.value.llm_concurrency : cfg.value.concurrency),
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
  window.clearTimeout(toastTimer)
})

function onDocClick() {
  llmModelOpen.value = false
  engineOpen.value = false
}

function toast(msg: string): void {
  toastMsg.value = msg
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastMsg.value = ''
  }, 2200)
}

/** 锚点滚动 */
function scrollTo(id: string): void {
  activeAnchor.value = id
  const el = document.getElementById(id) ?? document.getElementById('st-engine')
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function addPair(arr: TermPair[]) {
  arr.push({ source: '', target: '' })
}

function removePair(arr: TermPair[], i: number) {
  arr.splice(i, 1)
}

function toggleEngine() {
  engineOpen.value = !engineOpen.value
}

function pickEngine(v: string) {
  cfg.value.engine = v as TransConfig['engine']
  engineOpen.value = false
}

function toggleLlmModel() {
  llmModelOpen.value = !llmModelOpen.value
  if (llmModelOpen.value) {
    llmModelText.value = cfg.value.llm_model_name
  }
}

function pickLlmModel(m: string) {
  cfg.value.llm_model_name = m
  ensureLlmModelHistory(m)
  llmModelOpen.value = false
}

function commitLlmModel() {
  const name = llmModelText.value.trim()
  if (!name) {
    return
  }
  cfg.value.llm_model_name = name
  ensureLlmModelHistory(name)
  llmModelOpen.value = false
}

function ensureLlmModelHistory(name: string) {
  if (!cfg.value.llm_models_history.includes(name)) {
    cfg.value.llm_models_history.push(name)
  }
}

function removeLlmModel(m: string) {
  cfg.value.llm_models_history = cfg.value.llm_models_history.filter(x => x !== m)
  if (cfg.value.llm_model_name === m) {
    cfg.value.llm_model_name = cfg.value.llm_models_history[0] ?? ''
  }
}

async function clearLlmStats() {
  llmStats.value = await resetLlmStats(plugin)
  showMessage('累计统计已清零', 2000, 'info')
}

/** 连通性检查:记录真实往返耗时 */
async function checkConfig() {
  checking.value = true
  checkMsg.value = ''
  checkOk.value = false
  latency.value = null
  try {
    const provider = cfg.value.engine === 'llm'
      ? new LlmTranslationClient(cfg.value)
      : new TranslationClient(cfg.value)
    let spent = 0
    const [v, t] = await Promise.all([
      kernelVersion(),
      (async () => {
        const t0 = performance.now()
        const r = await provider.testConnection()
        spent = Math.round(performance.now() - t0)
        return r
      })(),
    ])
    latency.value = spent
    checkOk.value = t.ok
    checkMsg.value = `思源 ${v || '未知'} · ${t.message}`
  } catch (e) {
    checkOk.value = false
    checkMsg.value = (e as Error).message
  } finally {
    checking.value = false
  }
}

/** 恢复默认配置(需再点保存才落盘) */
function resetDefaults(): void {
  if (!window.confirm('恢复插件初始推荐配置?当前修改会丢失,恢复后需点击「保存配置」。')) {
    return
  }
  cfg.value = structuredClone(DEFAULT_CONFIG)
  toast('已恢复默认配置,记得保存')
}

async function save() {
  if (cfg.value.llm_model_name?.trim()) {
    ensureLlmModelHistory(cfg.value.llm_model_name.trim())
  }
  await saveConfig(plugin, cfg.value)
  toast('配置已保存到思源存储')
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



/* ==========================================================================
   S4 新增:设置页外壳 / 通用行为
   ========================================================================== */
.st {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 顶部 */
.st-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--tr2-line);
  border-radius: var(--tr2-r-lg);
  background: var(--tr2-card);
  box-shadow: var(--tr2-shadow-1);
}

.st-head__main {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  flex: 1;
}

.st-head__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 9px;
  background: var(--tr2-primary-soft);
  color: var(--tr2-primary-deep);
}

.st-head__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.st-head__ver {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--tr2-inset);
  color: var(--tr2-muted);
  font-family: var(--tr2-mono);
  font-size: 10px;
  font-weight: 400;
}

.st-head__sub {
  margin-top: 1px;
  font-size: 10.5px;
  color: var(--tr2-muted);
}

.st-nav {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--tr2-r);
  background: var(--tr2-inset);
}

.st-nav__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 9px;
  border: 0;
  border-radius: var(--tr2-r-sm);
  background: none;
  color: var(--tr2-text-2);
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &.is-active {
    background: var(--tr2-card);
    color: var(--tr2-primary-deep);
    box-shadow: var(--tr2-shadow-1);
  }

  &:hover {
    color: var(--tr2-text);
  }
}

/* 区块标题 */
.st-sec {
  padding: 14px;
}

.st-sec__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.st-sec__head--plain {
  padding: 2px 2px 0;
}

.st-sec__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  border-radius: 8px;
  background: var(--tr2-primary-soft);
  color: var(--tr2-primary-deep);
}

.st-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* 只给"直接子级"的相邻块留间距,避免三列网格内部的 .st-field
   也吃到 margin-top 而被顶下去(三列不对齐) */
.st-sec > .st-field + .st-grid3,
.st-sec > .st-field + .st-field,
.st-sec > .st-grid3 + .st-field {
  margin-top: 12px;
}

.st-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.st-modes {
  display: grid;
  align-items: stretch;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.st-mode {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--tr2-line);
  border-radius: 10px;
  background: var(--tr2-inset);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: var(--tr2-line-strong);
  }

  &.is-active {
    border-color: var(--tr2-primary);
    background: var(--tr2-primary-soft);
    box-shadow: 0 0 0 1px var(--tr2-primary-soft);
  }
}

.st-mode__radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.st-mode__icon {
  flex: 0 0 auto;
  color: var(--tr2-primary-deep);
  margin-top: 1px;
}

.st-mode__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.st-mode__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--tr2-text);
}

.st-mode__desc {
  font-size: 10.5px;
  line-height: 1.45;
  color: var(--tr2-muted);
}

.st-grid3 {
  display: grid;
  align-items: start;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.st-input {
  width: 100%;
  height: 32px;
  padding: 0 9px;
  border: 1px solid var(--tr2-line-strong);
  border-radius: var(--tr2-r);
  background: var(--tr2-card);
  color: var(--tr2-text);
  font-size: 12.5px;
  outline: none;

  &:focus {
    border-color: var(--tr2-primary);
    box-shadow: 0 0 0 3px var(--tr2-primary-soft);
  }
}

.st-proxies {
  display: grid;
  align-items: stretch;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.st-proxy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--tr2-line);
  border-radius: 10px;
  background: var(--tr2-inset);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;

  &.is-active {
    border-color: var(--tr2-primary);
    background: var(--tr2-primary-soft);
    box-shadow: 0 0 0 1px var(--tr2-primary-soft);
  }
}

.st-proxy__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tr2-text);
}

.st-proxy__desc {
  font-size: 10.5px;
  line-height: 1.45;
  color: var(--tr2-muted);
}

/* 引擎区(旧卡片,仅统一间距) */
.st-engine {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.st-engine .trans-card + .trans-card {
  margin-top: 10px;
}

/* 底部工具条 */
.st-foot {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding: 10px 12px;
  border: 1px solid var(--tr2-line);
  border-radius: var(--tr2-r-lg);
  background: var(--tr2-card);
  box-shadow: 0 -2px 12px rgba(15, 23, 42, 0.06);
}

.st-foot__spacer {
  flex: 1;
}

.st-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 10.5px;

  &.is-ok {
    color: var(--tr2-ok);
  }

  &.is-err {
    color: var(--tr2-err);
  }
}

.st-check__text {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.st-check__ms {
  padding: 0 5px;
  border-radius: 999px;
  background: var(--tr2-inset);
  color: var(--tr2-muted);
  font-family: var(--tr2-mono);
}

/* toast */
.st-toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  z-index: 2147483000;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border-radius: 10px;
  background: var(--tr2-text);
  color: var(--tr2-card);
  font-size: 12px;
  box-shadow: var(--tr2-shadow-2);
  transform: translateX(-50%);
  animation: st-toast-in 0.18s ease both;
}

@keyframes st-toast-in {
  from {
    opacity: 0;
    transform: translate(-50%, 6px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%);
  }
}

@media (max-width: 640px) {
  .st-modes,
  .st-grid3 {
    grid-template-columns: 1fr;
  }

  .st-proxies {
    grid-template-columns: 1fr;
  }
}
</style>
