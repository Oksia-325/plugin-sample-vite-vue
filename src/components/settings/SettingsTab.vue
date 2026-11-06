<template>
  <div class="pigo-settings">
    <div v-if="store.loading" class="pigo-settings__state">
      正在读取配置…
    </div>

    <template v-else>
      <div v-if="store.error" class="pigo-settings__alert pigo-settings__alert--error">
        {{ store.error }}
      </div>

      <div v-if="notice" class="pigo-settings__alert" :class="`pigo-settings__alert--${notice.type}`">
        {{ notice.text }}
      </div>

      <section class="pigo-settings__section">
        <div class="pigo-settings__section-title">
          S3 存储
        </div>
        <div class="pigo-settings__section-desc">
          只保留一个 S3 兼容存储桶。腾讯云 COS 请使用 S3 兼容 Endpoint。
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-endpoint">Endpoint</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-endpoint"
              v-model="store.config.s3.endpoint"
              class="b3-text-field fn__block"
              placeholder="https://cos.ap-guangzhou.myqcloud.com"
            >
            <div class="pigo-form-row__hint">
              例如腾讯云 COS：https://cos.ap-guangzhou.myqcloud.com
            </div>
            <div v-if="issueMap['s3.endpoint']" class="pigo-form-row__error">
              {{ issueMap['s3.endpoint'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-region">Region</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-region"
              v-model="store.config.s3.region"
              class="b3-text-field fn__block"
              placeholder="ap-guangzhou"
            >
            <div v-if="issueMap['s3.region']" class="pigo-form-row__error">
              {{ issueMap['s3.region'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-bucket">Bucket</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-bucket"
              v-model="store.config.s3.bucket"
              class="b3-text-field fn__block"
              placeholder="picgo-1312673255"
            >
            <div v-if="issueMap['s3.bucket']" class="pigo-form-row__error">
              {{ issueMap['s3.bucket'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-access-key">AccessKeyId</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-access-key"
              v-model="store.config.s3.accessKeyId"
              class="b3-text-field fn__block"
              autocomplete="off"
              placeholder="AccessKeyId / 腾讯云 SecretId"
            >
            <div v-if="issueMap['s3.accessKeyId']" class="pigo-form-row__error">
              {{ issueMap['s3.accessKeyId'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-secret-key">SecretAccessKey</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-secret-key"
              v-model="store.config.s3.secretAccessKey"
              class="b3-text-field fn__block"
              :type="showSecrets ? 'text' : 'password'"
              autocomplete="off"
              placeholder="SecretAccessKey / 腾讯云 SecretKey"
            >
            <label class="pigo-inline-check">
              <input v-model="showSecrets" type="checkbox">
              显示密钥
            </label>
            <div v-if="issueMap['s3.secretAccessKey']" class="pigo-form-row__error">
              {{ issueMap['s3.secretAccessKey'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-upload-path">上传路径模板</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-upload-path"
              v-model="store.config.s3.uploadPath"
              class="b3-text-field fn__block"
              placeholder="siyuan/{year}/{month}/{md5}.{ext}"
            >
            <div class="pigo-form-row__hint">
              支持变量：{year}、{month}、{day}、{timestamp}、{md5}、{sha256}、{ext}、{filename}、{fullName}
            </div>
            <div v-if="issueMap['s3.uploadPath']" class="pigo-form-row__error">
              {{ issueMap['s3.uploadPath'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-custom-url">CustomUrl</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-custom-url"
              v-model="store.config.s3.customUrl"
              class="b3-text-field fn__block"
              placeholder="https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com"
            >
            <div class="pigo-form-row__hint">
              用于生成图片公网地址，也用于反推 S3 key。留空时按 Endpoint/Bucket 推导。
            </div>
            <div v-if="issueMap['s3.customUrl']" class="pigo-form-row__error">
              {{ issueMap['s3.customUrl'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-extra-prefixes">额外 URL 前缀</label>
          <div class="pigo-form-row__control">
            <textarea
              id="pigo-extra-prefixes"
              v-model="extraPrefixesText"
              class="b3-text-field fn__block"
              rows="3"
              placeholder="每行一个，例如旧 CDN 域名"
            ></textarea>
            <div class="pigo-form-row__hint">
              用于识别旧域名或 CDN 域名下的已上传图片。每行一个。
            </div>
            <div v-if="issueMap['s3.extraUrlPrefixes']" class="pigo-form-row__error">
              {{ issueMap['s3.extraUrlPrefixes'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-acl">ACL</label>
          <div class="pigo-form-row__control">
            <select id="pigo-acl" v-model="store.config.s3.acl" class="b3-select fn__block">
              <option v-for="option in ACL_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <div v-if="issueMap['s3.acl']" class="pigo-form-row__error">
              {{ issueMap['s3.acl'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label">连接选项</label>
          <div class="pigo-form-row__control pigo-form-row__control--checks">
            <label class="pigo-inline-check">
              <input v-model="store.config.s3.pathStyleAccess" type="checkbox">
              使用 Path Style
            </label>
            <label class="pigo-inline-check">
              <input v-model="store.config.s3.useSiyuanProxy" type="checkbox">
              通过思源内核代理访问 S3
            </label>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-timeout">超时（毫秒）</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-timeout"
              v-model.number="store.config.s3.timeoutMs"
              class="b3-text-field fn__block"
              type="number"
              min="5000"
              max="300000"
              step="1000"
            >
            <div v-if="issueMap['s3.timeoutMs']" class="pigo-form-row__error">
              {{ issueMap['s3.timeoutMs'] }}
            </div>
          </div>
        </div>
      </section>

      <section class="pigo-settings__section">
        <div class="pigo-settings__section-title">
          行为
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label">粘贴与链接</label>
          <div class="pigo-form-row__control pigo-form-row__control--checks">
            <label class="pigo-inline-check">
              <input v-model="store.config.behavior.autoUploadOnPaste" type="checkbox">
              粘贴图片时自动上传
            </label>
            <label class="pigo-inline-check">
              <input v-model="store.config.behavior.replaceLink" type="checkbox">
              上传后替换文档中的图片链接
            </label>
            <label class="pigo-inline-check">
              <input v-model="store.config.behavior.allowPicAndText" type="checkbox">
              允许图片和文字混合粘贴时接管
            </label>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label">扫描与上传</label>
          <div class="pigo-form-row__control pigo-form-row__control--checks">
            <label class="pigo-inline-check">
              <input v-model="store.config.behavior.includeTitleImage" type="checkbox">
              包含题头图
            </label>
            <label class="pigo-inline-check">
              <input v-model="store.config.behavior.includeRemoteImages" type="checkbox">
              包含网络图片
            </label>
            <label class="pigo-inline-check">
              <input v-model="store.config.behavior.skipIfAlreadyS3" type="checkbox">
              跳过已经上传到 S3 的图片
            </label>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label" for="pigo-concurrency">并发数</label>
          <div class="pigo-form-row__control">
            <input
              id="pigo-concurrency"
              v-model.number="store.config.behavior.concurrency"
              class="b3-text-field fn__block"
              type="number"
              min="1"
              max="10"
              step="1"
            >
            <div class="pigo-form-row__hint">
              1-10，默认 4。图片多时适当提高，但注意 S3 限流。
            </div>
            <div v-if="issueMap['behavior.concurrency']" class="pigo-form-row__error">
              {{ issueMap['behavior.concurrency'] }}
            </div>
          </div>
        </div>

        <div class="pigo-form-row">
          <label class="pigo-form-row__label">调试</label>
          <div class="pigo-form-row__control pigo-form-row__control--checks">
            <label class="pigo-inline-check">
              <input v-model="store.config.behavior.debug" type="checkbox">
              输出调试日志
            </label>
          </div>
        </div>
      </section>

      <div class="pigo-settings__actions">
        <button class="b3-button b3-button--text" type="button" :disabled="store.saving" @click="handleSave">
          {{ store.saving ? '保存中…' : '保存配置' }}
        </button>
        <button class="b3-button b3-button--outline" type="button" :disabled="store.saving" @click="handleReset">
          恢复默认
        </button>
        <button class="b3-button b3-button--outline" type="button" :disabled="store.saving" @click="handleImportLegacy">
          导入旧 PicGo 配置
        </button>
        <button class="b3-button b3-button--outline" type="button" disabled title="Phase 3 接入">
          测试连接（Phase 3）
        </button>
      </div>

      <div class="pigo-settings__footer">
        配置保存在思源工作空间的 petal 存储中，会随思源同步到其他设备。请确认你的同步空间是可信的。
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Plugin } from 'siyuan'
import { ACL_OPTIONS, validateConfig, type ValidationIssue } from '@/core/config'
import {
  ensureConfigLoaded,
  readLegacyPicgoS3Config,
  resetPigoConfig,
  savePigoConfig,
  usePigoConfigStore,
} from '@/core/configStore'

const props = defineProps<{
  plugin: Plugin
}>()

const store = usePigoConfigStore()
const showSecrets = ref(false)
const issues = ref<ValidationIssue[]>([])
const notice = ref<{ type: 'success' | 'error', text: string } | null>(null)

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

async function handleSave() {
  notice.value = null
  const result = await savePigoConfig(props.plugin)
  issues.value = result.issues
  if (result.ok) {
    notice.value = { type: 'success', text: '配置已保存。' }
  }
  else {
    notice.value = { type: 'error', text: '配置未保存，请检查表单错误。' }
  }
}

function handleReset() {
  if (!window.confirm('确定恢复默认配置吗？当前填写的内容会被清空。')) {
    return
  }
  resetPigoConfig()
  issues.value = []
  notice.value = { type: 'success', text: '已恢复默认值，请填写 S3 信息后保存。' }
}

async function handleImportLegacy() {
  notice.value = null
  const imported = await readLegacyPicgoS3Config()
  if (!imported) {
    notice.value = { type: 'error', text: '未找到旧 PicGo 配置，或读取失败。' }
    return
  }

  store.config.s3 = imported.s3
  store.config.migration = {
    fromPicgo: true,
    migratedAt: Date.now(),
  }
  issues.value = validateConfig(store.config)
  notice.value = {
    type: 'success',
    text: [
      `已从旧配置（${imported.source}）导入 S3 设置，请检查后保存。`,
      ...imported.warnings,
    ].join(' '),
  }
}
</script>

<style scoped>
.pigo-settings {
  padding: 16px 18px 28px;
  max-width: 900px;
  box-sizing: border-box;
  color: var(--b3-theme-on-background, #dfe0e1);
}

.pigo-settings__state {
  padding: 24px 0;
  color: var(--b3-theme-on-surface-light, #999);
}

.pigo-settings__alert {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.pigo-settings__alert--success {
  color: var(--b3-theme-primary, #3573f0);
  background: var(--b3-theme-primary-lightest, rgba(53, 115, 240, 0.12));
}

.pigo-settings__alert--error {
  color: var(--b3-theme-error, #d23f31);
  background: var(--b3-theme-error-lighter, rgba(210, 63, 49, 0.12));
}

.pigo-settings__section {
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
}

.pigo-settings__section-title {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
}

.pigo-settings__section-desc {
  margin-bottom: 14px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
  line-height: 1.6;
}

.pigo-form-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  margin-bottom: 12px;
}

.pigo-form-row__label {
  padding-top: 6px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  font-size: 13px;
}

.pigo-form-row__control {
  min-width: 0;
}

.pigo-form-row__control--checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding-top: 5px;
}

.pigo-form-row__hint {
  margin-top: 4px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
  line-height: 1.5;
}

.pigo-form-row__error {
  margin-top: 4px;
  color: var(--b3-theme-error, #d23f31);
  font-size: 12px;
  line-height: 1.5;
}

.pigo-inline-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  user-select: none;
}

.pigo-settings__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.pigo-settings__footer {
  margin-top: 16px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .pigo-form-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .pigo-form-row__label {
    padding-top: 0;
  }
}
</style>
