<template>
  <div class="pigo-overlay">
    <div class="pigo-card">
      <div class="pigo-card__header">
        <div class="pigo-card__title">
          Pigo 图床
        </div>
        <button
          class="pigo-card__close"
          type="button"
          title="关闭"
          @click="props.onClose"
        >
          ×
        </button>
      </div>

      <div class="pigo-card__body">
        <p class="pigo-card__line">
          Phase 0 基线已加载。
        </p>
        <p class="pigo-card__muted">
          分支：pigo · 版本：{{ version }}
        </p>
        <p class="pigo-card__muted">
          下一步（Phase 1）会把这里替换为“上传 / 统计 / 同步 / 设置”页签。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PluginInfo from '@/../plugin.json'

const props = defineProps<{
  onClose: () => void
}>()

const version = PluginInfo.version
</script>

<style scoped>
.pigo-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.pigo-card {
  position: absolute;
  top: 48px;
  right: 16px;
  width: min(420px, calc(100vw - 32px));
  pointer-events: auto;
  color: var(--b3-theme-on-background, #dfe0e1);
  background: var(--b3-theme-background, #1f1f1f);
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.12));
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.36);
  overflow: hidden;
}

.pigo-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.12));
}

.pigo-card__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.pigo-card__close {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.pigo-card__close:hover,
.pigo-card__close:focus {
  background: var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.1));
  outline: none;
}

.pigo-card__body {
  padding: 14px 16px 16px;
  font-size: 13px;
  line-height: 1.7;
}

.pigo-card__line {
  margin: 0 0 6px;
  font-weight: 600;
}

.pigo-card__muted {
  margin: 4px 0 0;
  color: var(--b3-theme-on-surface-light, #999);
}
</style>
