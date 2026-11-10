<template>
  <div
    class="pigo-toast"
    :class="{ 'pigo-toast--above-actions': uiState.activeTab === 'settings' }"
    aria-live="polite"
    aria-atomic="false"
  >
    <transition-group name="pigo-toast">
      <div
        v-for="item in toastState.items"
        :key="item.id"
        class="pigo-toast__item"
        :class="`pigo-toast__item--${item.type}`"
        role="status"
        @click="dismissToast(item.id)"
      >
        <span class="pigo-toast__dot" aria-hidden="true"></span>
        <span class="pigo-toast__text">{{ item.text }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { dismissToast, toastState } from '@/core/toastStore'
import { uiState } from '@/core/uiStore'
</script>

<style scoped>
/*
 * 全屏透明覆盖层：绝对定位 + inset 0，天然脱离文档流，
 * 无论设置页页脚多高都不会改变主内容布局。
 */
.pigo-toast {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 6px;
  box-sizing: border-box;
  padding: 0 16px calc(var(--pigo-footer-height, 34px) + 12px);
  pointer-events: none;
}

/* 设置页有吸底操作栏，提示再抬高一些，避免压住保存按钮与说明文字 */
.pigo-toast--above-actions {
  padding-bottom: calc(var(--pigo-footer-height, 34px) + 96px);
}

.pigo-toast__item {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  max-width: min(420px, 100%);
  padding: 7px 12px;
  border: 1px solid var(--pigo-border-strong);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-text);
  background: var(--pigo-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
  cursor: pointer;
  font-size: var(--pigo-fs-xs);
  line-height: 1.5;
  pointer-events: auto;
}

.pigo-toast__item--success {
  border-color: rgba(16, 185, 129, 0.45);
}

.pigo-toast__item--error {
  border-color: rgba(244, 63, 94, 0.5);
}

.pigo-toast__dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--pigo-muted);
}

.pigo-toast__item--success .pigo-toast__dot {
  background: var(--pigo-emerald);
}

.pigo-toast__item--error .pigo-toast__dot {
  background: var(--pigo-rose);
}

.pigo-toast__item--info .pigo-toast__dot {
  background: var(--pigo-blue);
}

.pigo-toast__text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pigo-toast-enter-active,
.pigo-toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pigo-toast-enter-from,
.pigo-toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.pigo-toast-move {
  transition: transform 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .pigo-toast-enter-active,
  .pigo-toast-leave-active,
  .pigo-toast-move {
    transition: none;
  }
}
</style>
