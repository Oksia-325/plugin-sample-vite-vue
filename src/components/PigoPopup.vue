<template>
  <div v-show="uiState.popupVisible" class="pigo-popup">
    <div
      ref="cardRef"
      class="pigo-popup__card"
      :class="{ 'pigo-popup__card--pinned': uiState.pinned }"
      :style="cardStyle"
      role="dialog"
      aria-modal="false"
      aria-label="Pigo 图床"
    >
      <pigo-panel :plugin="props.plugin" @header-pointerdown="startDrag">
        <template #actions>
          <button
            class="pigo-popup__chrome"
            :class="{ 'pigo-popup__chrome--active': uiState.pinned }"
            type="button"
            :title="uiState.pinned ? '取消置顶' : '置顶面板'"
            :aria-label="uiState.pinned ? '取消置顶' : '置顶面板'"
            :aria-pressed="uiState.pinned"
            @click="togglePigoPinned"
          >
            <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
              <path d="M829.31 607.6L548.07 234.1c-12.93-19.17-41.01-19.61-54.82-0.89L197.3 606.71c-16.05 22.28-0.45 53.49 27.19 53.49h139.06v173.38c0 26.3 21.39 48.14 48.14 48.14H612.7c26.29 0 48.13-21.39 48.13-48.14V660.2h140.4c27.19 0 43.24-30.31 28.08-52.6z"></path>
              <path d="M226.72 218.06h570.5c20.95 0 37.89-16.94 37.89-37.88s-16.94-37.88-37.89-37.88h-570.5c-20.95 0-37.88 16.94-37.88 37.88s16.94 37.88 37.88 37.88z"></path>
            </svg>
          </button>

          <button
            class="pigo-popup__chrome pigo-popup__chrome--close"
            type="button"
            title="关闭"
            aria-label="关闭"
            @click="hidePigoPopup(true)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
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
import {
  hidePigoPopup,
  setPigoPinned,
  togglePigoPinned,
  uiState,
} from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin & { version?: string }
}>()

const STORAGE_KEY = 'siyuan-plugin-pigo:popup-position'
const VIEWPORT_MARGIN = 8
const DEFAULT_WIDTH = 1000
const DEFAULT_HEIGHT = 760

const cardRef = ref<HTMLElement | null>(null)
const position = reactive({ x: 24, y: 48 })

let hasSavedPosition = false
let dragging = false
let dragStart = { x: 0, y: 0, left: 0, top: 0 }

const cardStyle = computed(() => ({
  left: `${position.x}px`,
  top: `${position.y}px`,
}))

onMounted(() => {
  restorePosition()
  setPigoPinned(uiState.pinned)
  window.addEventListener('resize', clampPosition)
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('pointerdown', handleOutsidePointer, true)
  if (uiState.popupVisible) {
    void nextTick(placeIfNeeded)
  }
})

watch(
  () => uiState.popupVisible,
  async (visible) => {
    if (!visible) {
      return
    }
    await nextTick()
    placeIfNeeded()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', clampPosition)
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('pointerdown', handleOutsidePointer, true)
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
        hasSavedPosition = true
      }
    }
  }
  catch {
    // Ignore invalid local state.
  }
  clampPosition()
}

function placeIfNeeded() {
  if (!hasSavedPosition) {
    centerPosition()
  }
  clampPosition()
}

function centerPosition() {
  const rect = cardRef.value?.getBoundingClientRect()
  const width = rect?.width || DEFAULT_WIDTH
  const height = rect?.height || DEFAULT_HEIGHT
  position.x = Math.max(VIEWPORT_MARGIN, Math.round((window.innerWidth - width) / 2))
  position.y = Math.max(VIEWPORT_MARGIN, Math.round((window.innerHeight - height) / 2))
}

function savePosition() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: position.x, y: position.y }))
    hasSavedPosition = true
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
  if (!rect || rect.width === 0) {
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
  if (event.button !== 0) {
    return
  }

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
  if (event.key !== 'Escape' || !uiState.popupVisible) {
    return
  }
  if (uiState.pinned) {
    return
  }
  hidePigoPopup()
}

/**
 * 默认（未置顶）时，点击面板外部关闭；置顶后保持常驻。
 */
function handleOutsidePointer(event: PointerEvent) {
  if (!uiState.popupVisible || uiState.pinned) {
    return
  }

  const card = cardRef.value
  const target = event.target
  if (card && target instanceof Node && card.contains(target)) {
    return
  }

  hidePigoPopup()
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
  width: min(1000px, calc(100vw - 16px));
  height: min(760px, calc(100vh - 16px));
  overflow: hidden;
  pointer-events: auto;
  color: var(--pigo-text);
  background: var(--pigo-bg);
  border: 1px solid var(--pigo-border-strong);
  border-radius: var(--pigo-radius-xl);
  box-shadow: var(--pigo-shadow-lg);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.pigo-popup__card--pinned {
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow: var(--pigo-shadow-lg), 0 0 0 1px rgba(249, 115, 22, 0.22);
}

.pigo-popup__chrome {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--pigo-radius-sm);
  color: var(--pigo-muted);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.pigo-popup__chrome svg {
  width: 14px;
  height: 14px;
}

.pigo-popup__chrome:hover,
.pigo-popup__chrome:focus-visible {
  color: var(--pigo-text);
  background: var(--pigo-card);
  outline: none;
}

.pigo-popup__chrome--active {
  color: var(--pigo-accent);
  background: var(--pigo-accent-soft);
}

.pigo-popup__chrome--close:hover,
.pigo-popup__chrome--close:focus-visible {
  color: var(--pigo-rose);
  background: var(--pigo-rose-soft);
}

@media (max-width: 720px) {
  .pigo-popup__card {
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
  }
}
</style>
