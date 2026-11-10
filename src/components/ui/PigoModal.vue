<template>
  <div
    class="pigo-modal"
    role="dialog"
    aria-modal="true"
    @click.self="onBackdrop"
  >
    <div ref="panel" class="pigo-modal__panel" tabindex="-1">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  closeOnBackdrop?: boolean
}>(), {
  closeOnBackdrop: false,
})

const emit = defineEmits<{
  close: []
}>()

const panel = ref<HTMLElement | null>(null)

let previousActive: HTMLElement | null = null

onMounted(async () => {
  previousActive = document.activeElement as HTMLElement | null
  document.addEventListener('keydown', onKeydown, true)
  await nextTick()
  focusFirst()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  previousActive?.focus?.()
})

function onBackdrop(): void {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
    return
  }

  if (event.key === 'Tab') {
    trapFocus(event)
  }
}

function focusFirst(): void {
  const target = focusableElements()[0] || panel.value
  target?.focus()
}

function trapFocus(event: KeyboardEvent): void {
  const items = focusableElements()
  if (items.length === 0) {
    event.preventDefault()
    panel.value?.focus()
    return
  }

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
  else if (event.shiftKey && (active === first || !panel.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  }
}

function focusableElements(): HTMLElement[] {
  const root = panel.value
  if (!root) {
    return []
  }
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  return Array.from(root.querySelectorAll<HTMLElement>(selector))
}
</script>

<style scoped>
.pigo-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 20px;
  background: rgba(0, 0, 0, 0.72);
  animation: pigo-modal-fade 0.14s ease;
}

.pigo-modal__panel {
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
  outline: none;
  animation: pigo-modal-rise 0.16s ease;
}

@keyframes pigo-modal-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes pigo-modal-rise {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pigo-modal {
    animation: none;
  }

  .pigo-modal__panel {
    animation: none;
  }
}
</style>
