<template>
  <pigo-modal @close="emit('close')">
    <div class="pigo-cleanup">
      <header class="pigo-cleanup__head">
        <span class="pigo-cleanup__icon" aria-hidden="true">
          <PigoIcon name="alert" :size="18" />
        </span>
        <div class="pigo-cleanup__head-text">
          <div class="pigo-cleanup__head-row">
            <h2 class="pigo-cleanup__title">
              确认彻底清除 S3 多余图片？
            </h2>
            <button class="pigo-cleanup__close" type="button" title="关闭" aria-label="关闭" @click="emit('close')">
              <PigoIcon name="x" :size="14" />
            </button>
          </div>
          <p class="pigo-cleanup__warning">
            此操作不可逆！将从云端存储桶永久删除 {{ formatNumber(count) }} 个孤立文件。
          </p>
        </div>
      </header>

      <div class="pigo-cleanup__body">
        <div class="pigo-cleanup__facts">
          <div class="pigo-cleanup__fact">
            <span class="pigo-cleanup__fact-label">存储桶前缀</span>
            <code class="pigo-cleanup__fact-value">{{ prefix || '（空：整个桶）' }}</code>
          </div>
          <div class="pigo-cleanup__fact">
            <span class="pigo-cleanup__fact-label">排除保护目录</span>
            <code class="pigo-cleanup__fact-value pigo-cleanup__fact-value--ok">_pigo_test/*</code>
          </div>
          <div class="pigo-cleanup__fact">
            <span class="pigo-cleanup__fact-label">待清理对象总量</span>
            <strong class="pigo-cleanup__fact-value pigo-cleanup__fact-value--danger">{{ formatNumber(count) }} 个文件</strong>
          </div>
        </div>

        <label class="pigo-cleanup__check">
          <input v-model="confirmed" type="checkbox" :disabled="loading">
          <span>我已备份重要笔记与附件数据，清楚理解云端删除后将无法恢复，确认立即执行物理删除。</span>
        </label>
      </div>

      <footer class="pigo-cleanup__foot">
        <pigo-button variant="ghost" size="sm" :disabled="loading" @click="emit('close')">
          取消
        </pigo-button>
        <pigo-button
          variant="danger"
          size="sm"
          class="pigo-cleanup__confirm"
          :disabled="!confirmed || loading"
          :loading="loading"
          @click="emit('confirm')"
        >
          {{ loading ? loadingText : `确认彻底删除 (${formatNumber(count)})` }}
        </pigo-button>
      </footer>
    </div>
  </pigo-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PigoButton from '@/components/ui/PigoButton.vue'
import PigoIcon from '@/components/ui/PigoIcon.vue'
import PigoModal from '@/components/ui/PigoModal.vue'

withDefaults(defineProps<{
  count: number
  prefix: string
  loading?: boolean
  loadingText?: string
}>(), {
  loading: false,
  loadingText: '正在删除…',
})

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const confirmed = ref(false)

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('zh-CN')
}
</script>

<style scoped>
.pigo-cleanup {
  overflow: hidden;
  border: 1px solid rgba(244, 63, 94, 0.4);
  border-radius: var(--pigo-radius-xl);
  background: var(--pigo-card);
  box-shadow: var(--pigo-shadow-lg);
}

.pigo-cleanup__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--pigo-border);
}

.pigo-cleanup__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-rose);
  background: var(--pigo-rose-soft);
}

.pigo-cleanup__icon svg {
  width: 18px;
  height: 18px;
}

.pigo-cleanup__head-text {
  min-width: 0;
  flex: 1 1 auto;
}

.pigo-cleanup__head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pigo-cleanup__title {
  margin: 0;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-md);
  font-weight: 700;
  line-height: 1.4;
}

.pigo-cleanup__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  padding: 0;
  border: 0;
  border-radius: var(--pigo-radius-sm);
  color: var(--pigo-muted);
  background: transparent;
  cursor: pointer;
}

.pigo-cleanup__close svg {
  width: 14px;
  height: 14px;
}

.pigo-cleanup__close:hover {
  color: var(--pigo-text);
  background: var(--pigo-surface);
}

.pigo-cleanup__warning {
  margin: 4px 0 0;
  color: var(--pigo-rose);
  font-size: var(--pigo-fs-xs);
  line-height: 1.6;
}

.pigo-cleanup__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
}

.pigo-cleanup__facts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  background: var(--pigo-surface);
}

.pigo-cleanup__fact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--pigo-fs-xs);
}

.pigo-cleanup__fact-label {
  color: var(--pigo-text-2);
}

.pigo-cleanup__fact-value {
  overflow: hidden;
  max-width: 65%;
  padding: 1px 7px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-sm);
  color: var(--pigo-text);
  background: var(--pigo-bg);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-cleanup__fact-value--ok {
  color: var(--pigo-emerald);
  border-color: rgba(16, 185, 129, 0.35);
}

.pigo-cleanup__fact-value--danger {
  color: var(--pigo-rose);
  border-color: rgba(244, 63, 94, 0.35);
}

.pigo-cleanup__check {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid rgba(244, 63, 94, 0.28);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-text-2);
  background: rgba(244, 63, 94, 0.06);
  cursor: pointer;
  font-size: var(--pigo-fs-xs);
  line-height: 1.6;
}

.pigo-cleanup__check input {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  margin: 3px 0 0;
  accent-color: var(--pigo-rose);
  cursor: pointer;
}

.pigo-cleanup__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--pigo-border);
  background: var(--pigo-panel);
}

.pigo-cleanup__confirm {
  min-width: 150px;
}
</style>
