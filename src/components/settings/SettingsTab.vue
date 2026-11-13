<template>
  <div class="pigo-settings">
    <div v-if="store.loading" class="pigo-settings__state">
      正在读取配置…
    </div>

    <template v-else>
      <div class="pigo-settings__scroll">
        <!-- 高频开关 -->
        <section class="pigo-quick">
          <div
            class="pigo-quick__card"
            :class="{ 'pigo-quick__card--on': store.config.behavior.autoUploadOnPaste }"
            @click="toggleBehavior('autoUploadOnPaste', !store.config.behavior.autoUploadOnPaste)"
          >
            <span class="pigo-quick__icon" aria-hidden="true">
              <PigoIcon name="upload" :size="16" />
            </span>
            <span class="pigo-quick__body">
              <span class="pigo-quick__title">
                粘贴图片时自动上传
                <pigo-chip :tone="store.config.behavior.autoUploadOnPaste ? 'success' : 'muted'">
                  {{ store.config.behavior.autoUploadOnPaste ? '已启用' : '已关闭' }}
                </pigo-chip>
              </span>
              <span class="pigo-quick__desc">剪贴板捕获到新图片时即刻转存到图床</span>
            </span>
            <pigo-switch
              :model-value="store.config.behavior.autoUploadOnPaste"
              label="粘贴图片时自动上传"
              :disabled="store.saving"
              @update:model-value="value => toggleBehavior('autoUploadOnPaste', value)"
            />
          </div>

          <div
            class="pigo-quick__card"
            :class="{ 'pigo-quick__card--on': store.config.behavior.replaceLink }"
            @click="toggleBehavior('replaceLink', !store.config.behavior.replaceLink)"
          >
            <span class="pigo-quick__icon" aria-hidden="true">
              <PigoIcon name="link" :size="16" />
            </span>
            <span class="pigo-quick__body">
              <span class="pigo-quick__title">
                上传后替换文档中的图片链接
                <pigo-chip :tone="store.config.behavior.replaceLink ? 'success' : 'muted'">
                  {{ store.config.behavior.replaceLink ? '已启用' : '已关闭' }}
                </pigo-chip>
              </span>
              <span class="pigo-quick__desc">将本地相对路径无缝替换为远程 S3/COS 外链</span>
            </span>
            <pigo-switch
              :model-value="store.config.behavior.replaceLink"
              label="上传后替换文档中的图片链接"
              :disabled="store.saving"
              @update:model-value="value => toggleBehavior('replaceLink', value)"
            />
          </div>
        </section>

        <!-- S3 存储配置 -->
        <pigo-accordion
          v-model:open="open.s3"
          title="S3 存储配置"
          subtitle="（兼容 AWS S3、腾讯云 COS、阿里云 OSS、MinIO 等）"
          :summary="storageLabel"
        >
          <template #icon>
            <PigoIcon name="database" :size="14" />
          </template>

          <div class="pigo-settings__hint-box">
            只保留一个 S3 兼容存储桶。若使用腾讯云 COS，请填写 S3 兼容 Endpoint。
          </div>

          <div class="pigo-settings__grid pigo-settings__grid--3">
            <pigo-field
              class="pigo-settings__col-2"
              label="Endpoint"
              for-id="pigo-endpoint"
              hint="例如腾讯云 COS：https://cos.ap-guangzhou.myqcloud.com"
              :error="issueMap['s3.endpoint']"
            >
              <input
                id="pigo-endpoint"
                v-model="store.config.s3.endpoint"
                class="pigo-input pigo-input--mono"
                placeholder="https://cos.ap-guangzhou.myqcloud.com"
              >
            </pigo-field>

            <pigo-field
              label="Region"
              for-id="pigo-region"
              hint="区域代号，如 ap-guangzhou"
              :error="issueMap['s3.region']"
            >
              <input
                id="pigo-region"
                v-model="store.config.s3.region"
                class="pigo-input pigo-input--mono"
                placeholder="ap-guangzhou"
              >
            </pigo-field>
          </div>

          <pigo-field
            label="Bucket 名称"
            for-id="pigo-bucket"
            :error="issueMap['s3.bucket']"
          >
            <input
              id="pigo-bucket"
              v-model="store.config.s3.bucket"
              class="pigo-input pigo-input--mono"
              placeholder="picgo-1312673255"
            >
          </pigo-field>

          <div class="pigo-settings__grid pigo-settings__grid--2">
            <pigo-field
              label="AccessKeyId"
              for-id="pigo-access-key"
              :error="issueMap['s3.accessKeyId']"
            >
              <input
                id="pigo-access-key"
                v-model="store.config.s3.accessKeyId"
                class="pigo-input pigo-input--mono"
                autocomplete="off"
                placeholder="AccessKeyId / 腾讯云 SecretId"
              >
            </pigo-field>

            <pigo-field
              label="SecretAccessKey"
              for-id="pigo-secret-key"
              :error="issueMap['s3.secretAccessKey']"
            >
              <template #label-extra>
                <label class="pigo-check pigo-check--sm">
                  <input v-model="showSecrets" type="checkbox">
                  显示密钥
                </label>
              </template>
              <input
                id="pigo-secret-key"
                v-model="store.config.s3.secretAccessKey"
                class="pigo-input pigo-input--mono"
                :type="showSecrets ? 'text' : 'password'"
                autocomplete="off"
                placeholder="SecretAccessKey / 腾讯云 SecretKey"
              >
            </pigo-field>
          </div>

          <pigo-field
            label="上传路径模板"
            for-id="pigo-upload-path"
            :error="issueMap['s3.uploadPath']"
          >
            <input
              id="pigo-upload-path"
              v-model="store.config.s3.uploadPath"
              class="pigo-input pigo-input--mono"
              placeholder="siyuan/{year}/{month}/{md5}.{ext}"
            >
            <p class="pigo-settings__vars">
              支持变量:
              <code v-for="variable in KEY_VARIABLES" :key="variable">{{ variable }}</code>
            </p>
          </pigo-field>

          <pigo-field
            label="CustomUrl (自定义访问域名)"
            for-id="pigo-custom-url"
            hint="用于生成图片公网地址，也用于反推 S3 key。留空时按 Endpoint/Bucket 推导。"
            :error="issueMap['s3.customUrl']"
          >
            <input
              id="pigo-custom-url"
              v-model="store.config.s3.customUrl"
              class="pigo-input pigo-input--mono"
              placeholder="https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com"
            >
          </pigo-field>

          <pigo-field
            label="额外 URL 前缀 (历史域名)"
            for-id="pigo-extra-prefixes"
            hint="用于识别旧域名或 CDN 域名下的已上传图片。每行一个。"
            :error="issueMap['s3.extraUrlPrefixes']"
          >
            <textarea
              id="pigo-extra-prefixes"
              v-model="extraPrefixesText"
              class="pigo-textarea pigo-textarea--mono"
              rows="2"
              placeholder="每行一个，例如旧 CDN 域名"
            ></textarea>
          </pigo-field>

          <div class="pigo-divider"></div>

          <div class="pigo-settings__grid pigo-settings__grid--2">
            <pigo-field label="ACL 访问控制" for-id="pigo-acl" :error="issueMap['s3.acl']">
              <select id="pigo-acl" v-model="store.config.s3.acl" class="pigo-select">
                <option v-for="option in ACL_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </pigo-field>

            <pigo-field
              label="网络超时（毫秒）"
              for-id="pigo-timeout"
              :error="issueMap['s3.timeoutMs']"
            >
              <input
                id="pigo-timeout"
                v-model.number="store.config.s3.timeoutMs"
                class="pigo-input pigo-input--mono"
                type="number"
                min="5000"
                max="300000"
                step="1000"
              >
            </pigo-field>
          </div>

          <div class="pigo-settings__checks">
            <label class="pigo-check">
              <input v-model="store.config.s3.pathStyleAccess" type="checkbox">
              使用 Path Style
            </label>
            <label class="pigo-check pigo-check--accent">
              <input v-model="store.config.s3.useSiyuanProxy" type="checkbox">
              通过思源内核代理访问 S3（推荐，避免跨域与网络阻隔）
            </label>
          </div>

          <div class="pigo-settings__hint-box">
            代理模式会把图片转成 Base64 交给思源内核转发，内核需要额外解码，上传大量图片时 CPU 会升高。
            如果存储桶已配置 CORS（允许当前思源地址 PUT），关闭代理可显著降低 CPU 并提升速度。
          </div>

          <div class="pigo-divider"></div>

          <div class="pigo-settings__actions">
            <pigo-button variant="ghost" size="sm" :disabled="store.saving" @click="handleImportLegacy">
              导入旧 PicGo 配置...
            </pigo-button>
            <pigo-button variant="secondary" size="sm" :loading="testing" :disabled="store.saving" @click="handleTestConnection">
              测试连接
            </pigo-button>
          </div>

          <div v-if="testResult" class="pigo-test-result">
            <div
              class="pigo-test-result__summary"
              :class="testResult.ok ? 'pigo-test-result__summary--ok' : 'pigo-test-result__summary--error'"
            >
              连接{{ testResult.ok ? '成功' : '失败' }} · 耗时 {{ testResult.latencyMs }}ms
            </div>

            <ul class="pigo-test-result__steps">
              <li v-for="step in testResult.steps" :key="step.name" class="pigo-test-result__step">
                <span class="pigo-test-result__icon" :class="step.ok ? 'is-ok' : 'is-error'">
                  <PigoIcon :name="step.ok ? 'check-circle' : 'x-circle'" :size="12" />
                </span>
                <span class="pigo-test-result__name">{{ step.name }}</span>
                <span class="pigo-test-result__message">{{ step.message }}</span>
                <span v-if="step.durationMs !== undefined" class="pigo-test-result__duration">{{ step.durationMs }}ms</span>
              </li>
            </ul>

            <div v-for="warning in testResult.warnings" :key="warning" class="pigo-test-result__warning">
              <PigoIcon name="alert" :size="12" />
              <span>{{ warning }}</span>
            </div>
            <div v-for="error in testResult.errors" :key="error" class="pigo-test-result__error">
              <PigoIcon name="x-circle" :size="12" />
              <span>{{ error }}</span>
            </div>
          </div>
        </pigo-accordion>

        <!-- 详细行为与上传规则 -->
        <pigo-accordion
          v-model:open="open.behavior"
          title="插件配置"
          :summary="behaviorSummary"
        >
          <template #icon>
            <PigoIcon name="adjustments" :size="14" />
          </template>

          <div class="pigo-settings__option">
            <label class="pigo-check">
              <input v-model="store.config.behavior.allowPicAndText" type="checkbox">
              允许图片和文字混合粘贴时接管
            </label>
            <p class="pigo-settings__option-hint">
              开启后，混合粘贴会由 Pigo 接管；当前实现只保留图片，混合的文字可能丢失。不确定时请保持关闭。
            </p>
          </div>

          <div class="pigo-settings__group">
            <span class="pigo-settings__group-title">批量扫描与上传选项</span>
            <div class="pigo-settings__grid pigo-settings__grid--3">
              <label class="pigo-check-card">
                <input v-model="store.config.behavior.includeTitleImage" type="checkbox">
                包含题头图
              </label>
              <label class="pigo-check-card">
                <input v-model="store.config.behavior.includeRemoteImages" type="checkbox">
                包含网络图片
              </label>
              <label class="pigo-check-card">
                <input v-model="store.config.behavior.skipIfAlreadyS3" type="checkbox">
                跳过已上传到 S3 的图片
              </label>
            </div>
          </div>

          <div class="pigo-settings__group">
            <div class="pigo-settings__group-head">
              <span class="pigo-settings__group-title">上传并发数</span>
              <span class="pigo-settings__group-value">{{ store.config.behavior.concurrency }}</span>
            </div>
            <div class="pigo-settings__range-row">
              <input
                v-model.number="store.config.behavior.concurrency"
                class="pigo-range"
                type="range"
                min="1"
                max="10"
                step="1"
                aria-label="上传并发数"
              >
              <input
                v-model.number="store.config.behavior.concurrency"
                class="pigo-input pigo-input--mono pigo-settings__range-number"
                type="number"
                min="1"
                max="10"
                step="1"
              >
            </div>
            <p class="pigo-settings__option-hint">
              取值范围 1-10，默认 4。图片较多时可适当提高，但请留意云存储限流防刷。
            </p>
            <p v-if="issueMap['behavior.concurrency']" class="pigo-field__error">
              {{ issueMap['behavior.concurrency'] }}
            </p>
          </div>

          <div class="pigo-divider"></div>

          <label class="pigo-check">
            <input v-model="store.config.behavior.debug" type="checkbox">
            输出调试日志 (开启后会同步输出到开发者控制台)
          </label>
        </pigo-accordion>

        <!-- 调试与运行日志 -->
        <pigo-accordion
          v-model:open="open.logs"
          title="调试与运行日志"
          :summary="`共 ${logState.entries.length} 条`"
        >
          <template #icon>
            <PigoIcon name="terminal" :size="14" />
          </template>

          <div class="pigo-logs__toolbar">
            <span class="pigo-settings__option-hint">保留最近 200 条运行日志（不会记录与泄露密钥）。</span>
            <div class="pigo-logs__actions">
              <pigo-button variant="secondary" size="sm" :disabled="logState.entries.length === 0" @click="copyLogs">
                复制日志
              </pigo-button>
              <pigo-button variant="ghost" size="sm" :disabled="logState.entries.length === 0" @click="clearLogs">
                清空日志
              </pigo-button>
            </div>
          </div>

          <div v-if="recentLogs.length === 0" class="pigo-logs__empty">
            暂无日志。
          </div>
          <div v-else class="pigo-logs">
            <div v-for="entry in recentLogs" :key="entry.id" class="pigo-logs__row">
              <span class="pigo-logs__time">[{{ formatTime(entry.time) }}]</span>
              <span class="pigo-logs__level" :class="`pigo-logs__level--${entry.level}`">
                [{{ entry.level.toUpperCase() }}]
              </span>
              <span class="pigo-logs__message">
                {{ entry.message }}
                <span v-if="entry.detail" class="pigo-logs__detail">{{ entry.detail }}</span>
              </span>
            </div>
          </div>
        </pigo-accordion>
      </div>

      <footer class="pigo-settings__footer">
        <span class="pigo-settings__footer-note">
          配置保存在思源工作空间的 petal 存储中，会随思源同步到其他设备。请确保你的同步空间是可信的。
        </span>
        <div class="pigo-settings__footer-actions">
          <pigo-button variant="outline" :disabled="store.saving" @click="handleReset">
            恢复默认
          </pigo-button>
          <pigo-button variant="primary" :loading="store.saving" @click="handleSave">
            保存配置
          </pigo-button>
        </div>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import { ACL_OPTIONS, validateConfig, type ValidationIssue } from '@/core/config'
import { toUserMessage } from '@/core/errors'
import {
  clearLogs,
  formatLogs,
  getRecentLogs,
  logError,
  logInfo,
  logState,
} from '@/core/log'
import {
  ensureConfigLoaded,
  readLegacyPicgoS3Config,
  resetPigoConfig,
  saveBehaviorPatch,
  savePigoConfig,
  usePigoConfigStore,
} from '@/core/configStore'
import { describeStorage } from '@/core/s3/describe'
import { testS3Connection, type TestConnectionResult } from '@/core/s3/client'
import { pushToast } from '@/core/toastStore'
import PigoAccordion from '@/components/ui/PigoAccordion.vue'
import PigoButton from '@/components/ui/PigoButton.vue'
import PigoChip from '@/components/ui/PigoChip.vue'
import PigoField from '@/components/ui/PigoField.vue'
import PigoIcon from '@/components/ui/PigoIcon.vue'
import PigoSwitch from '@/components/ui/PigoSwitch.vue'

const props = defineProps<{
  plugin: Plugin
}>()

const KEY_VARIABLES = [
  '{year}',
  '{month}',
  '{day}',
  '{timestamp}',
  '{timestampMS}',
  '{md5}',
  '{sha256}',
  '{ext}',
  '{filename}',
  '{fullName}',
]

const store = usePigoConfigStore()
const showSecrets = ref(false)
const issues = ref<ValidationIssue[]>([])
const testing = ref(false)
const testResult = ref<TestConnectionResult | null>(null)

const open = reactive({
  s3: true,
  behavior: false,
  logs: false,
})

let lastConfigError = ''

const storageLabel = computed(() => describeStorage(store.config.s3).label)

const behaviorSummary = computed(() => {
  const concurrency = store.config.behavior.concurrency
  const filterRemote = store.config.behavior.includeRemoteImages ? '否' : '是'
  return `并发: ${concurrency} | 过滤网络图: ${filterRemote}`
})

const recentLogs = computed(() => [...getRecentLogs()].reverse())

const logsText = computed(() => formatLogs(recentLogs.value))

const issueMap = computed<Record<string, string>>(() => {
  return Object.fromEntries(issues.value.map((issue) => [issue.field, issue.message]))
})

const extraPrefixesText = computed({
  get: () => store.config.s3.extraUrlPrefixes.join('\n'),
  set: (value: string) => {
    store.config.s3.extraUrlPrefixes = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  },
})

onMounted(async () => {
  await ensureConfigLoaded(props.plugin)
})

watch(
  () => store.error,
  (message) => {
    if (!message || message === lastConfigError) {
      return
    }
    lastConfigError = message
    pushToast('error', message, 6000)
  }
)

async function toggleBehavior(
  key: 'autoUploadOnPaste' | 'replaceLink',
  value: boolean
): Promise<void> {
  store.config.behavior[key] = value
  const result = await saveBehaviorPatch(props.plugin, { [key]: value })
  if (!result.ok) {
    pushToast('error', `开关保存失败：${result.error || '未知错误'}`)
  }
}

async function handleSave(): Promise<void> {
  testResult.value = null
  const result = await savePigoConfig(props.plugin)
  issues.value = result.issues
  if (result.ok) {
    pushToast('success', '配置已保存。')
  }
  else {
    pushToast('error', '配置未保存，请检查表单错误。')
  }
}

function handleReset(): void {
  if (!window.confirm('确定恢复默认配置吗？当前填写的内容会被清空。')) {
    return
  }
  resetPigoConfig()
  issues.value = []
  testResult.value = null
  pushToast('success', '已恢复默认值，请填写 S3 信息后保存。')
}

async function handleImportLegacy(): Promise<void> {
  const imported = await readLegacyPicgoS3Config()
  if (!imported) {
    pushToast('error', '未找到旧 PicGo 配置，或读取失败。')
    return
  }

  store.config.s3 = imported.s3
  store.config.migration = {
    fromPicgo: true,
    migratedAt: Date.now(),
  }
  logInfo(`已导入旧 PicGo 配置：${imported.source}`)
  issues.value = validateConfig(store.config)
  testResult.value = null
  pushToast('success', [
    `已从旧配置（${imported.source}）导入 S3 设置，请检查后保存。`,
    ...imported.warnings,
  ].join(' '), 6000)
}

async function copyLogs(): Promise<void> {
  try {
    await navigator.clipboard.writeText(logsText.value)
    pushToast('success', '日志已复制。')
  }
  catch {
    pushToast('error', '复制失败，请手动选择日志内容。')
  }
}

async function handleTestConnection(): Promise<void> {
  testResult.value = null

  const validationIssues = validateConfig(store.config)
  issues.value = validationIssues
  if (validationIssues.length > 0) {
    pushToast('error', '请先修正表单错误，再进行连接测试。')
    return
  }

  testing.value = true
  try {
    testResult.value = await testS3Connection(store.config.s3)
    if (testResult.value.ok) {
      logInfo('S3 连接测试通过', `耗时 ${testResult.value.latencyMs}ms`)
      pushToast('success', 'S3 连接测试通过。')
    }
    else {
      logError('S3 连接测试失败', testResult.value.errors.join('；'))
      pushToast('error', 'S3 连接测试失败，请查看下方步骤。')
    }
  }
  catch (error) {
    const message = toUserMessage(error)
    logError('S3 连接测试失败', error)
    testResult.value = {
      ok: false,
      steps: [],
      warnings: [],
      errors: [message],
      latencyMs: 0,
    }
    pushToast('error', `连接测试失败：${message}`)
  }
  finally {
    testing.value = false
  }
}

function formatTime(time: number): string {
  return new Date(time).toLocaleString()
}
</script>

<style scoped>
.pigo-settings {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  box-sizing: border-box;
}

.pigo-settings__scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 20px;
}

.pigo-settings__state {
  padding: 24px 18px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-xs);
}

/* ---------- 高频开关 ---------- */

.pigo-quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pigo-quick__card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.pigo-quick__card:hover {
  border-color: var(--pigo-border-strong);
}

.pigo-quick__card--on {
  border-color: rgba(249, 115, 22, 0.28);
}

.pigo-quick__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border: 1px solid rgba(249, 115, 22, 0.22);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-accent);
  background: var(--pigo-accent-soft);
}

.pigo-quick__icon svg {
  width: 16px;
  height: 16px;
}

.pigo-quick__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.pigo-quick__title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-xs);
  font-weight: 500;
}

.pigo-quick__desc {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.5;
}

.pigo-quick__card :deep(.pigo-switch) {
  margin-top: 6px;
}

/* ---------- 表单布局 ---------- */

.pigo-settings__grid {
  display: grid;
  gap: 12px;
}

.pigo-settings__grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pigo-settings__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pigo-settings__col-2 {
  min-width: 0;
}

.pigo-settings__grid--3 > .pigo-settings__col-2 {
  grid-column: span 2;
}

.pigo-settings :deep(.pigo-accordion__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pigo-settings__hint-box {
  padding: 8px 10px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-amber);
  background: rgba(245, 158, 11, 0.08);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.6;
}

.pigo-settings__vars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 2px 0 0;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
}

.pigo-settings__vars code {
  padding: 0 3px;
  border-radius: 3px;
  color: var(--pigo-text-2);
  background: var(--pigo-surface-strong);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
}

.pigo-settings__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.pigo-settings__checks .pigo-check--accent {
  color: var(--pigo-accent);
}

.pigo-settings__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pigo-settings__option {
  padding: 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-surface);
}

.pigo-settings__option-hint {
  margin: 0;
  padding-left: 20px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.6;
}

.pigo-settings__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pigo-settings__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pigo-settings__group-title {
  color: var(--pigo-text-2);
  font-size: var(--pigo-fs-2xs);
  font-weight: 500;
}

.pigo-settings__group-value {
  color: var(--pigo-accent);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-xs);
  font-weight: 600;
}

.pigo-settings__range-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pigo-settings__range-number {
  width: 64px;
  flex: 0 0 64px;
  text-align: center;
}

.pigo-range {
  width: 100%;
  height: 4px;
  accent-color: var(--pigo-accent);
  cursor: pointer;
}

/* ---------- 日志 ---------- */

.pigo-logs__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pigo-logs__toolbar .pigo-settings__option-hint {
  padding-left: 0;
}

.pigo-logs__actions {
  display: flex;
  gap: 6px;
}

.pigo-logs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow: auto;
  padding: 10px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-bg);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.6;
}

.pigo-logs__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pigo-logs__time {
  flex: 0 0 auto;
  color: var(--pigo-muted);
}

.pigo-logs__level {
  flex: 0 0 auto;
}

.pigo-logs__level--info {
  color: #60a5fa;
}

.pigo-logs__level--warn {
  color: var(--pigo-amber);
}

.pigo-logs__level--error {
  color: var(--pigo-rose);
}

.pigo-logs__level--debug {
  color: var(--pigo-muted);
}

.pigo-logs__message {
  min-width: 0;
  color: var(--pigo-text-2);
  overflow-wrap: anywhere;
}

.pigo-logs__detail {
  display: block;
  color: var(--pigo-muted);
  white-space: pre-wrap;
}

.pigo-logs__empty {
  padding: 12px;
  border: 1px dashed var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  text-align: center;
}

/* ---------- 测试结果 ---------- */

.pigo-test-result {
  padding: 10px 12px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-surface);
  font-size: var(--pigo-fs-2xs);
}

.pigo-test-result__summary {
  margin-bottom: 8px;
  font-size: var(--pigo-fs-xs);
  font-weight: 600;
}

.pigo-test-result__summary--ok {
  color: var(--pigo-emerald);
}

.pigo-test-result__summary--error {
  color: var(--pigo-rose);
}

.pigo-test-result__steps {
  margin: 0 0 6px;
  padding: 0;
  list-style: none;
}

.pigo-test-result__step {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 0;
  border-bottom: 1px dashed var(--pigo-border);
}

.pigo-test-result__icon {
  display: inline-flex;
  flex: 0 0 12px;
  align-items: center;
  margin-top: 1px;
}

.pigo-test-result__icon.is-ok {
  color: var(--pigo-emerald);
}

.pigo-test-result__icon.is-error {
  color: var(--pigo-rose);
}

.pigo-test-result__step:last-child {
  border-bottom: 0;
}

.pigo-test-result__name {
  flex: 0 0 90px;
  color: var(--pigo-text);
}

.pigo-test-result__message {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--pigo-muted);
  overflow-wrap: anywhere;
}

.pigo-test-result__duration {
  flex: 0 0 auto;
  color: var(--pigo-muted);
}

.pigo-test-result__warning {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 4px;
  color: var(--pigo-amber);
  line-height: 1.6;
}

.pigo-test-result__warning svg {
  margin-top: 2px;
  flex: 0 0 12px;
}

.pigo-test-result__error {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 4px;
  color: var(--pigo-rose);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.pigo-test-result__error svg {
  margin-top: 2px;
  flex: 0 0 12px;
}

/* ---------- 页脚 ---------- */

.pigo-settings__footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 18px;
  border-top: 1px solid var(--pigo-border);
  background: var(--pigo-panel);
}

.pigo-settings__footer-note {
  flex: 1 1 320px;
  min-width: 0;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.5;
}

.pigo-settings__footer-actions {
  display: flex;
  gap: 8px;
}

/* 固定最小宽度：保存按钮出现 loading 圈时不改变宽度，避免页脚文字重排闪烁 */
.pigo-settings__footer-actions :deep(.pigo-btn) {
  min-width: 96px;
  justify-content: center;
  text-align: center;
}

@media (max-width: 720px) {
  .pigo-quick,
  .pigo-settings__grid--2,
  .pigo-settings__grid--3 {
    grid-template-columns: minmax(0, 1fr);
  }

  .pigo-settings__grid--3 > .pigo-settings__col-2 {
    grid-column: span 1;
  }

  .pigo-settings__scroll {
    padding: 12px;
  }
}
</style>
