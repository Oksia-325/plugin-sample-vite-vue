<template>
  <div class="tr2 st">
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

    <!-- 翻译引擎 -->
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
            两套引擎独立配置,切换后即刻生效,无需重启
          </div>
        </div>
        <span
          class="st-status"
          :class="engineReady ? 'is-ok' : 'is-warn'"
        >
          <span class="st-status__dot" />{{ engineReady ? '引擎配置就绪' : '缺少 API Key' }}
        </span>
      </div>

      <div class="tr2-card st-sec">
        <!-- 分段切换 -->
        <div class="st-seg">
          <button
            v-for="e in engines"
            :key="e.value"
            class="st-seg__item"
            :class="{ 'is-active': cfg.engine === e.value }"
            type="button"
            @click="cfg.engine = e.value"
          >
            <Icon
              :name="e.icon"
              :size="15"
            />
            <span>{{ e.label }}</span>
            <span class="st-seg__badge">{{ e.badge }}</span>
          </button>
        </div>

        <!-- ============================ Qwen-MT ============================ -->
        <template v-if="cfg.engine === 'qwen_mt'">
          <div class="st-group">
            <div class="st-group__head">
              <Icon
                name="key"
                :size="13"
              />
              <span>接口连接与语言对</span>
            </div>
            <div class="st-grid2">
              <div class="st-field">
                <span class="tr2-label">DashScope API Key</span>
                <div class="st-secret">
                  <input
                    v-model="cfg.api_key"
                    class="st-input is-mono"
                    :type="showKey ? 'text' : 'password'"
                    placeholder="sk-…"
                    autocomplete="off"
                    spellcheck="false"
                  >
                  <button
                    class="st-secret__btn"
                    type="button"
                    :title="showKey ? '隐藏' : '显示'"
                    @click="showKey = !showKey"
                  >
                    <Icon
                      :name="showKey ? 'eyeOff' : 'eye'"
                      :size="14"
                    />
                  </button>
                </div>
              </div>
              <div class="st-field">
                <span class="tr2-label">接口地址</span>
                <input
                  v-model="cfg.api_url"
                  class="st-input is-mono"
                  placeholder="https://dashscope.aliyuncs.com/…"
                  spellcheck="false"
                >
              </div>
            </div>
            <div class="st-grid3">
              <div class="st-field">
                <span class="tr2-label">源语言</span>
                <div class="st-select">
                  <select v-model="cfg.source_lang">
                    <option
                      v-for="l in sourceOptions"
                      :key="l"
                      :value="l"
                    >
                      {{ langLabel(l) }}
                    </option>
                  </select>
                  <Icon
                    name="chevronDown"
                    :size="13"
                  />
                </div>
              </div>
              <div class="st-field">
                <span class="tr2-label">目标语言</span>
                <div class="st-select">
                  <select v-model="cfg.target_lang">
                    <option
                      v-for="l in targetOptions"
                      :key="l"
                      :value="l"
                    >
                      {{ langLabel(l) }}
                    </option>
                  </select>
                  <Icon
                    name="chevronDown"
                    :size="13"
                  />
                </div>
              </div>
              <div class="st-field">
                <span class="tr2-label">翻译模型</span>
                <div class="st-select">
                  <select v-model="cfg.model_name">
                    <option
                      v-for="m in qwenModels"
                      :key="m"
                      :value="m"
                    >
                      {{ m }}
                    </option>
                  </select>
                  <Icon
                    name="chevronDown"
                    :size="13"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 领域提示 -->
          <div class="st-group">
            <div class="st-group__head">
              <Icon
                name="prompt"
                :size="13"
              />
              <span>领域提示</span>
              <span class="tr2-hint">可空,用于约束译文的领域与语气</span>
            </div>
            <PromptEditor
              v-model="cfg.domains"
              title="领域提示"
              placeholder="如:计算机科学论文,保持术语与句式严谨"
              hint="非空时会作为 translation_options.domains 发送给 Qwen-MT"
              :rows="3"
            />
          </div>

          <!-- 术语干预 -->
          <div class="st-group">
            <div class="st-group__head">
              <Icon
                name="book"
                :size="13"
              />
              <span>术语强制映射</span>
              <button
                class="tr2-btn is-ghost is-sm st-group__action"
                type="button"
                @click="addPair(cfg.terms)"
              >
                <Icon
                  name="plus"
                  :size="12"
                />添加术语
              </button>
            </div>
            <div
              v-if="!cfg.terms.length"
              class="st-empty"
            >
              暂无术语,添加后可强制指定某些词的译法
            </div>
            <div
              v-for="(item, i) in cfg.terms"
              :key="`term-${i}`"
              class="st-pair"
            >
              <input
                v-model="item.source"
                class="st-input is-mono"
                placeholder="原文术语"
              >
              <Icon
                name="arrowRight"
                :size="13"
                class="st-pair__arrow"
              />
              <input
                v-model="item.target"
                class="st-input"
                placeholder="指定译法"
              >
              <button
                class="st-pair__del"
                type="button"
                title="删除"
                @click="removePair(cfg.terms, i)"
              >
                <Icon
                  name="trash"
                  :size="13"
                />
              </button>
            </div>
          </div>

          <!-- 翻译记忆 -->
          <div class="st-group">
            <div class="st-group__head">
              <Icon
                name="replay"
                :size="13"
              />
              <span>翻译记忆</span>
              <button
                class="tr2-btn is-ghost is-sm st-group__action"
                type="button"
                @click="addPair(cfg.tm_list)"
              >
                <Icon
                  name="plus"
                  :size="12"
                />添加范例
              </button>
            </div>
            <div
              v-if="!cfg.tm_list.length"
              class="st-empty"
            >
              暂无记忆,添加双语例句可让译文风格更稳定
            </div>
            <div
              v-for="(item, i) in cfg.tm_list"
              :key="`tm-${i}`"
              class="st-pair st-pair--wide"
            >
              <input
                v-model="item.source"
                class="st-input"
                placeholder="原文例句"
              >
              <Icon
                name="arrowRight"
                :size="13"
                class="st-pair__arrow"
              />
              <input
                v-model="item.target"
                class="st-input"
                placeholder="目标译文"
              >
              <button
                class="st-pair__del"
                type="button"
                title="删除"
                @click="removePair(cfg.tm_list, i)"
              >
                <Icon
                  name="trash"
                  :size="13"
                />
              </button>
            </div>
          </div>
        </template>

        <!-- ============================== LLM ============================== -->
        <template v-else>
          <div class="st-group">
            <div class="st-group__head">
              <Icon
                name="plug"
                :size="13"
              />
              <span>OpenAI 兼容端点凭据</span>
            </div>
            <div class="st-grid2">
              <div class="st-field">
                <span class="tr2-label">API Secret Key</span>
                <div class="st-secret">
                  <input
                    v-model="cfg.llm_api_key"
                    class="st-input is-mono"
                    :type="showLlmKey ? 'text' : 'password'"
                    placeholder="sk-…"
                    autocomplete="off"
                    spellcheck="false"
                  >
                  <button
                    class="st-secret__btn"
                    type="button"
                    :title="showLlmKey ? '隐藏' : '显示'"
                    @click="showLlmKey = !showLlmKey"
                  >
                    <Icon
                      :name="showLlmKey ? 'eyeOff' : 'eye'"
                      :size="14"
                    />
                  </button>
                </div>
              </div>
              <div class="st-field">
                <span class="tr2-label">Base API URL</span>
                <input
                  v-model="cfg.llm_base_url"
                  class="st-input is-mono"
                  placeholder="https://api.example.com/v1"
                  spellcheck="false"
                >
              </div>
            </div>

            <div class="st-grid2">
              <div class="st-field">
                <span class="tr2-label">模型</span>
                <div class="st-select">
                  <select v-model="cfg.llm_model_name">
                    <option
                      v-for="m in llmModels"
                      :key="m"
                      :value="m"
                    >
                      {{ m }}
                    </option>
                  </select>
                  <Icon
                    name="chevronDown"
                    :size="13"
                  />
                </div>
              </div>
              <div class="st-field">
                <span class="tr2-label">添加新模型</span>
                <div class="st-add">
                  <input
                    v-model="newModel"
                    class="st-input"
                    placeholder="输入模型名后回车"
                    @keydown.enter="addLlmModel"
                  >
                  <button
                    class="tr2-btn is-ghost is-sm"
                    type="button"
                    @click="addLlmModel"
                  >
                    ＋
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 系统提示词 -->
          <div class="st-group">
            <div class="st-group__head">
              <Icon
                name="terminal"
                :size="13"
              />
              <span>系统提示词</span>
              <span class="tr2-hint">注入 System 角色,控制输出格式</span>
            </div>
            <PromptEditor
              v-model="cfg.llm_prompt"
              title="Prompt 编辑"
              placeholder="You are a professional translator…"
              hint="保持“只输出译文”的指令可获得最干净的写回结果"
              :rows="5"
            />
          </div>

          <!-- 用量看板 -->
          <div
            id="st-stats"
            class="st-group"
          >
            <div class="st-group__head">
              <Icon
                name="chart"
                :size="13"
              />
              <span>LLM 累计调用</span>
              <span class="tr2-chip is-ok">缓存加速已启用</span>
              <button
                class="tr2-btn is-ghost is-sm st-group__action"
                type="button"
                @click="clearLlmStats"
              >
                清零
              </button>
            </div>
            <div class="st-tiles">
              <div class="st-tile">
                <span class="st-tile__k">累计翻译调用</span>
                <span class="st-tile__v">{{ llmStats.calls }}<span>次</span></span>
              </div>
              <div class="st-tile">
                <span class="st-tile__k">缓存命中率</span>
                <span class="st-tile__v is-primary">{{ formatHitRate(llmStats.cached_tokens, llmStats.input_tokens, llmStats.cache_reported) }}</span>
              </div>
              <div class="st-tile">
                <span class="st-tile__k">累计输入 Token</span>
                <span class="st-tile__v">{{ formatM(llmStats.input_tokens) }}</span>
              </div>
              <div class="st-tile">
                <span class="st-tile__k">累计输出 Token</span>
                <span class="st-tile__v">{{ formatM(llmStats.output_tokens) }}</span>
              </div>
            </div>
            <div class="tr2-hint">
              数据跨会话持久化;端点不返回 usage / 缓存字段时命中率显示「—」。
            </div>
          </div>
        </template>
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
import PromptEditor from '@/components/ui/PromptEditor.vue'
import { usePlugin } from '@/main'
import { version as kernelVersion } from '@/api'
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '@/trans/config'
import { LANGUAGES, langLabel } from '@/trans/languages'
import { formatHitRate, formatM, loadLlmStats, resetLlmStats } from '@/trans/llm_stats'
import { LlmTranslationClient, TranslationClient } from '@/trans/translator'
import type { LlmCumulativeStats, TermPair, TransConfig } from '@/trans/types'
import PluginInfo from '@/../plugin.json'

const plugin = usePlugin()
const pluginVersion = (PluginInfo as { version?: string }).version ?? ''

/** 引擎分段切换 */
const engines = [
  { value: 'qwen_mt', icon: 'bolt', label: 'Qwen-MT', badge: '翻译专精' },
  { value: 'llm', icon: 'plug', label: 'LLM', badge: '通用大模型' },
] as const

/** Qwen-MT 可选模型(当前值不在列表时会自动补进去) */
const QWEN_MODELS = ['qwen-mt-plus', 'qwen-mt-turbo', 'qwen-mt-flash', 'qwen-mt-lite']

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
const latency = ref<number | null>(null)
const showKey = ref(false)
const showLlmKey = ref(false)
/** LLM 新模型输入框 */
const newModel = ref('')

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

/** 当前引擎是否已配置 Key */
const engineReady = computed(() => {
  const c = cfg.value
  return c.engine === 'llm' ? !!c.llm_api_key.trim() : !!c.api_key.trim()
})

/** 语言下拉候选:内置 + 当前值(兼容历史配置里的写法) */
const sourceOptions = computed(() => {
  const list = [...LANGUAGES] as string[]
  const cur = cfg.value.source_lang
  if (cur && !list.includes(cur)) {
    list.unshift(cur)
  }
  return list
})

const targetOptions = computed(() => {
  const list = [...LANGUAGES] as string[]
  const cur = cfg.value.target_lang
  if (cur && !list.includes(cur)) {
    list.unshift(cur)
  }
  return list
})

/** 模型下拉候选:内置 + 当前值 */
const qwenModels = computed(() => {
  const list = [...QWEN_MODELS]
  const cur = cfg.value.model_name?.trim()
  if (cur && !list.includes(cur)) {
    list.unshift(cur)
  }
  return list
})

const llmModels = computed(() => {
  const list = [...cfg.value.llm_models_history]
  const cur = cfg.value.llm_model_name?.trim()
  if (cur && !list.includes(cur)) {
    list.unshift(cur)
  }
  if (!list.length) {
    list.push('deepseek-chat')
  }
  return list
})

onMounted(async () => {
  cfg.value = await loadConfig(plugin)
  llmStats.value = await loadLlmStats(plugin)
})

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer)
})

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

/** 把输入框里的模型名记入历史并选中 */
function addLlmModel(): void {
  const name = newModel.value.trim()
  if (!name) {
    return
  }
  if (!cfg.value.llm_models_history.includes(name)) {
    cfg.value.llm_models_history.push(name)
  }
  cfg.value.llm_model_name = name
  newModel.value = ''
  toast(`已添加模型 ${name}`)
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
  const current = cfg.value.llm_model_name?.trim()
  if (current && !cfg.value.llm_models_history.includes(current)) {
    cfg.value.llm_models_history.push(current)
  }
  await saveConfig(plugin, cfg.value)
  toast('配置已保存到思源存储')
}
</script>

<style lang="scss" scoped>
/* ==========================================================================
   设置页:外壳 / 通用行为 / 引擎 / 底部工具条
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

/* 区块 */
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
  margin-bottom: 2px;
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

.st-engine {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.st-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

/* 只给卡片直接子级留间距,避免网格内的列被顶下去 */
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

.st-grid2 {
  display: grid;
  align-items: start;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  & + .st-grid2,
  & + .st-grid3,
  & + .st-field {
    margin-top: 10px;
  }
}

.st-grid3 {
  display: grid;
  align-items: start;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.st-modes {
  display: grid;
  align-items: stretch;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.st-modes + .st-field,
.st-grid3 + .st-field {
  margin-top: 12px;
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
  margin-top: 1px;
  color: var(--tr2-primary-deep);
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
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: var(--tr2-placeholder);
  }

  &:focus {
    border-color: var(--tr2-primary);
    box-shadow: 0 0 0 3px var(--tr2-primary-soft);
  }

  &.is-mono {
    font-family: var(--tr2-mono);
    font-size: 11.5px;
  }
}

/* 带眼睛按钮的密钥框 */
.st-secret {
  position: relative;
  display: flex;
  align-items: center;

  .st-input {
    padding-right: 32px;
  }
}

.st-secret__btn {
  position: absolute;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--tr2-r-sm);
  background: none;
  color: var(--tr2-muted);
  cursor: pointer;

  &:hover {
    background: var(--tr2-inset);
    color: var(--tr2-text);
  }
}

/* 下拉选择 */
.st-select {
  position: relative;
  display: flex;
  align-items: center;

  select {
    width: 100%;
    height: 32px;
    padding: 0 26px 0 9px;
    border: 1px solid var(--tr2-line-strong);
    border-radius: var(--tr2-r);
    background: var(--tr2-card);
    color: var(--tr2-text);
    font-size: 12.5px;
    appearance: none;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: var(--tr2-primary);
      box-shadow: 0 0 0 3px var(--tr2-primary-soft);
    }
  }

  .tr2-icon {
    position: absolute;
    right: 8px;
    color: var(--tr2-muted);
    pointer-events: none;
  }
}

/* 添加模型的输入 + 按钮 */
.st-add {
  display: flex;
  gap: 6px;

  .st-input {
    flex: 1;
    min-width: 0;
  }
}

/* 代理卡 */
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

/* 引擎状态 */
.st-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  white-space: nowrap;

  &.is-ok {
    background: var(--tr2-ok-soft);
    color: var(--tr2-ok);
  }

  &.is-warn {
    background: rgba(217, 119, 6, 0.14);
    color: var(--tr2-warn);
  }
}

.st-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

/* 分段切换 */
.st-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  margin-bottom: 12px;
  padding: 3px;
  border-radius: var(--tr2-r);
  background: var(--tr2-inset);
}

.st-seg__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
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
}

.st-seg__badge {
  padding: 0 5px;
  border-radius: 4px;
  background: var(--tr2-inset);
  color: var(--tr2-muted);
  font-family: var(--tr2-mono);
  font-size: 9.5px;
  letter-spacing: 0.02em;
}

/* 分组 */
.st-group {
  padding: 12px;
  border: 1px solid var(--tr2-line);
  border-radius: var(--tr2-r-lg);
  background: var(--tr2-inset);

  & + .st-group {
    margin-top: 10px;
  }
}

.st-group__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: var(--tr2-primary-deep);
  font-size: 12px;
  font-weight: 600;

  > .tr2-hint {
    font-weight: 400;
  }

  .tr2-chip {
    margin-left: 2px;
  }

  .st-group__action {
    margin-left: auto;
  }
}

.st-empty {
  padding: 10px;
  border: 1px dashed var(--tr2-line-strong);
  border-radius: var(--tr2-r);
  color: var(--tr2-muted);
  font-size: 10.5px;
  text-align: center;
}

/* 术语 / 记忆行 */
.st-pair {
  display: flex;
  align-items: center;
  gap: 6px;

  & + .st-pair {
    margin-top: 6px;
  }

  .st-input {
    flex: 1;
    min-width: 0;
    background: var(--tr2-card);
  }
}

.st-pair__arrow {
  flex: 0 0 auto;
  color: var(--tr2-placeholder);
}

.st-pair__del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  border: 0;
  border-radius: var(--tr2-r-sm);
  background: none;
  color: var(--tr2-muted);
  cursor: pointer;

  &:hover {
    background: var(--tr2-err-soft);
    color: var(--tr2-err);
  }
}

/* 用量看板 */
.st-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.st-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 10px;
  border-radius: 10px;
  background: var(--tr2-card);
}

.st-tile__k {
  font-size: 10.5px;
  color: var(--tr2-muted);
}

.st-tile__v {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;

  > span {
    margin-left: 2px;
    font-size: 10.5px;
    font-weight: 400;
    color: var(--tr2-muted);
  }

  &.is-primary {
    color: var(--tr2-primary-deep);
  }
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
  max-width: 300px;
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
  .st-grid3,
  .st-grid2,
  .st-proxies,
  .st-tiles {
    grid-template-columns: 1fr;
  }
}
/* ==========================================================================
   动效
   ========================================================================== */
.st > * {
  animation: tr2-rise 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.st > :nth-child(2) {
  animation-delay: 0.04s;
}

.st > :nth-child(3) {
  animation-delay: 0.08s;
}

.st > :nth-child(4) {
  animation-delay: 0.12s;
}

.st-mode,
.st-proxy {
  transition: transform 0.16s ease, border-color 0.15s ease, background 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--tr2-shadow-1);
  }
}

.st-mode.is-active .st-mode__icon {
  animation: tr2-pop-in 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.st-seg__item {
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;

  &.is-active {
    transform: scale(1.01);
  }
}

.st-tile {
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--tr2-shadow-1);
  }
}

.st-tile__v,
.st-tile__k,
.st-prompt__count,
.st-check__ms {
  font-variant-numeric: tabular-nums;
}

.st-group {
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--tr2-line-strong);
  }
}

.st-group__action {
  transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;

  &:active {
    transform: scale(0.96);
  }
}

.st-status__dot {
  animation: tr2-pulse 2.6s ease-in-out infinite;
}

.st-pair {
  animation: tr2-rise 0.2s ease both;
}

@media (prefers-reduced-motion: reduce) {
  .st *,
  .st *::before,
  .st *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

</style>
