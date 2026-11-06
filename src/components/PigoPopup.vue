<template>
  <div v-show="uiState.popupVisible" class="pigo-popup">
    <div
      ref="cardRef"
      class="pigo-popup__card"
      :style="cardStyle"
      role="dialog"
      aria-modal="false"
      aria-label="Pigo 图床"
    >
      <pigo-panel :plugin="props.plugin">
        <template #actions>
          <button
            class="pigo-popup__icon-btn pigo-popup__drag"
            type="button"
            title="拖动"
            aria-label="拖动"
            @pointerdown="startDrag"
          >
            ⠿
          </button>
          <button
            class="pigo-popup__icon-btn pigo-popup__close"
            type="button"
            title="关闭"
            aria-label="关闭"
            @click="hidePigoPopup"
          >
            ×
          </button>
        </template>
      </pigo-panel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import PigoPanel from '@/components/PigoPanel.vue'
import { hidePigoPopup, uiState } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin
}>()

const STORAGE_KEY = 'siyuan-plugin-pigo:popup-position'
const VIEWPORT_MARGIN = 8
const DEFAULT_WIDTH = 760
const DEFAULT_HEIGHT = 680

const cardRef = ref<HTMLElement | null>(null)
const position = reactive({
  x: Math.max(VIEWPORT_MARGIN, window.innerWidth - DEFAULT_WIDTH - 24),
  y: 48,
})

let dragging = false
let dragStart = { x: 0, y: 0, left: 0, top: 0 }

const cardStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`,
}))

onMounted(() => {
  restorePosition()
  window.addEventListener('resize', clampPosition)
  window.addEventListener('keydown', handleKeydown)
})

watch(
  () => uiState.popupVisible,
  async (visible) => {
    if (!visible) {
      return
    }
    await nextTick()
    clampPosition()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', clampPosition)
  window.removeEventListener('keydown', handleKeydown)
  stopDrag()
})

function restorePosition() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { x?: number, y?: number }
      if (typeof saved.x === 'number' && typeof saved.y === 'number') {
        position.x = saved.x
        position.y = saved.y
      }
    }
  }
  catch {
    // Ignore invalid local state.
  }
  clampPosition()
}

function savePosition() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: position.x, y: position.y }))
  }
  catch {
    // Ignore storage failures.
  }
}

function clampPosition() {
  if (!uiState.popupVisible) {
    return
  }

  const rect = cardRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }
  position.x = Math.min(
    Math.max(VIEWPORT_MARGIN, position.x),
    Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN)
  )
  position.y = Math.min(
    Math.max(VIEWPORT_MARGIN, position.y),
    Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN)
  )
}

function startDrag(event: PointerEvent) {
  const rect = cardRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  event.preventDefault()
  dragging = true
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    left: rect.left,
    top: rect.top,
  }

  window.addEventListener('pointermove', handleDragMove)
  window.addEventListener('pointerup', stopDrag, { once: true })
}

function handleDragMove(event: PointerEvent) {
  if (!dragging) {
    return
  }

  const rect = cardRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN)
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN)

  position.x = Math.min(maxX, Math.max(VIEWPORT_MARGIN, dragStart.left + event.clientX - dragStart.x))
  position.y = Math.min(maxY, Math.max(VIEWPORT_MARGIN, dragStart.top + event.clientY - dragStart.y))
}

function stopDrag() {
  if (!dragging) {
    return
  }

  dragging = false
  window.removeEventListener('pointermove', handleDragMove)
  savePosition()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && uiState.popupVisible) {
    hidePigoPopup()
  }
}
</script>

<style scoped>
.pigo-popup {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.pigo-popup__card {
  position: fixed;
  display: flex;
  flex-direction: column;
  width: min(760px, calc(100vw - 16px));
  height: min(680px, calc(100vh - 16px));
  overflow: hidden;
  pointer-events: auto;
  color: var(--b3-theme-on-background, #dfe0e1);
  background: var(--b3-theme-background, #1f1f1f);
  border: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.12));
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.36);
}

.pigo-popup__icon-btn {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
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
  font-size: 16px;
  line-height: 1;
}

.pigo-popup__icon-btn:hover,
.pigo-popup__icon-btn:focus {
  background: var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.1));
  outline: none;
}

.pigo-popup__drag {
  cursor: move;
  color: var(--b3-theme-on-surface-light, #999);
}

.pigo-popup__close {
  font-size: 20px;
}

@media (max-width: 640px) {
  .pigo-popup__card {
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
  }
}
</style>
