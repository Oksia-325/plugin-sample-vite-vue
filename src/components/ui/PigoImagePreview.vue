<template>
  <div
    class="pigo-preview"
    role="dialog"
    aria-modal="true"
    :aria-label="label || '图片预览'"
    @click="emit('close')"
  >
    <img
      class="pigo-preview__image"
      :src="url"
      :alt="label || '图片预览'"
      @click.stop
    >
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

defineProps<{
  url: string
  label?: string
}>()

const emit = defineEmits<{
  close: []
}>()

onMounted(() => {
  // 捕获阶段处理，避免 Esc 同时触发外层面板的关闭逻辑。
  window.addEventListener('keydown', handleKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
})

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return
  }
  event.stopPropagation()
  emit('close')
}
</script>

<style scoped>
.pigo-preview {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 24px;
  background: rgba(0, 0, 0, 0.72);
  cursor: zoom-out;
  animation: pigo-preview-fade 0.12s ease;
}

.pigo-preview__image {
  max-width: 92vw;
  max-height: 92vh;
  border-radius: 6px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  object-fit: contain;
  cursor: default;
}

@keyframes pigo-preview-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pigo-preview {
    animation: none;
  }
}
</style>
