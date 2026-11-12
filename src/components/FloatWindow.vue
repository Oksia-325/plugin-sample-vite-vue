<!--
  浮动窗口外壳(交互模型对齐 pigo 分支)

  - 默认:浮动卡片,不做遮罩;点击面板外部或 Esc 关闭。
  - 置顶:抬高层级(root z-index 9999 → 10001)、加主色描边,
    此时点击外部 / Esc 都不关闭,可以一边看文档一边停留面板。
  - 位置、置顶状态记入 localStorage。
  - 尺寸紧凑(默认 800×560 上限),超出仅内容区滚动。
-->
<template>
  <div
    class="fw-root"
    :style="{ zIndex: pinned ? PINNED_Z : BASE_Z }"
  >
    <section
      ref="panelRef"
      class="fw-panel tr2"
      :class="{ 'is-dragging': dragging, 'is-pinned': pinned, 'is-entering': entering }"
      :style="panelStyle"
      role="dialog"
      aria-modal="false"
      @animationend.self="onEntryEnd"
    >
      <header
        class="fw-head"
        @pointerdown="onDragStart"
      >
        <div class="fw-brand">
          <span class="fw-brand__mark">
            <Icon
              name="translate"
              :size="15"
            />
          </span>
          <span class="fw-brand__name">{{ title }}</span>
          <span
            v-if="subtitle"
            class="fw-brand__sub"
          >· {{ subtitle }}</span>
          <span
            v-if="status"
            class="fw-status"
          >{{ status }}</span>
        </div>

        <nav class="fw-nav">
          <slot name="nav" />
        </nav>

        <div class="fw-tools">
          <button
            class="fw-iconbtn"
            :class="{ 'is-on': pinned }"
            :title="pinned ? '取消置顶' : '置顶窗口'"
            :aria-pressed="pinned"
            type="button"
            @click="togglePin"
          >
            <Icon
              name="pin"
              :size="16"
            />
          </button>
          <button
            class="fw-iconbtn is-danger"
            title="关闭 (Esc)"
            type="button"
            @click="emit('close')"
          >
            <Icon
              name="close"
              :size="16"
            />
          </button>
        </div>
      </header>

      <div class="fw-body">
        <slot />
      </div>

      <footer
        v-if="$slots.footer"
        class="fw-foot"
      >
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { watchSiyuanTheme } from '@/utils/theme'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    status?: string
    /** 是否允许点击外部关闭(翻译进行中传 false,避免误关打断任务) */
    dismissible?: boolean
  }>(),
  { subtitle: '', status: '', dismissible: true },
)

const emit = defineEmits<{
  close: []
  'update:pinned': [value: boolean]
}>()

/** 置顶状态(双向绑定) */
const pinned = defineModel<boolean>('pinned', { default: false })

const STORAGE_KEY = 'siyuan-trans-float-window'
/** 层级:未置顶压不住思源菜单,置顶后盖过弹窗层(与 pigo 一致的思路) */
const BASE_Z = 9999
const PINNED_Z = 2147482000
/** 目标尺寸上限:紧凑优先 */
const MAX_W = 800
const MAX_H = 560
/** 刚打开的短时间内忽略外部点击,避免"打开它的那一下"直接把窗口关掉 */
const OPEN_GRACE_MS = 250

const panelRef = ref<HTMLElement | null>(null)
const dragging = ref(false)
/** 入场动画只播一次,结束后摘掉类,避免结束拖动时动画重播 */
const entering = ref(true)
const size = ref({ w: MAX_W, h: MAX_H })
const pos = ref({ x: 0, y: 0 })
const openedAt = Date.now()

const panelStyle = computed(() => ({
  left: `${pos.value.x}px`,
  top: `${pos.value.y}px`,
  width: `${size.value.w}px`,
  height: `${size.value.h}px`,
}))

/** 视口内夹紧,避免拖出屏幕或窗口尺寸变化后跑丢 */
function clamp(p: { x: number, y: number }): { x: number, y: number } {
  const maxX = Math.max(8, window.innerWidth - size.value.w - 8)
  const maxY = Math.max(8, window.innerHeight - size.value.h - 8)
  return {
    x: Math.min(Math.max(8, p.x), maxX),
    y: Math.min(Math.max(8, p.y), maxY),
  }
}

function applySize(): void {
  size.value = {
    w: Math.min(MAX_W, Math.max(360, window.innerWidth - 32)),
    h: Math.min(MAX_H, Math.max(320, window.innerHeight - 80)),
  }
}

function center(): { x: number, y: number } {
  return {
    x: Math.round((window.innerWidth - size.value.w) / 2),
    y: Math.round((window.innerHeight - size.value.h) / 2) - 12,
  }
}

function persist(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ x: pos.value.x, y: pos.value.y, pinned: pinned.value }),
    )
  } catch {
    /* 存不了就只保持内存状态 */
  }
}

function restore(): void {
  let saved: { x?: number, y?: number, pinned?: boolean } | null = null
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    saved = null
  }
  if (saved?.pinned) {
    pinned.value = true
  }
  const next = typeof saved?.x === 'number' && typeof saved?.y === 'number'
    ? { x: saved.x, y: saved.y }
    : center()
  pos.value = clamp(next)
}

/** 头部拖动:按钮/导航区域不触发 */
function onDragStart(e: PointerEvent): void {
  const target = e.target as HTMLElement | null
  if (target?.closest('button, a, input, select, textarea, .fw-nav')) {
    return
  }
  if (e.button !== 0) {
    return
  }
  const startX = e.clientX
  const startY = e.clientY
  const origin = { ...pos.value }
  dragging.value = true
  entering.value = false // 一旦开始拖动就永久结束入场动画,避免松手后重播
  e.preventDefault()

  const onMove = (ev: PointerEvent) => {
    pos.value = clamp({
      x: origin.x + (ev.clientX - startX),
      y: origin.y + (ev.clientY - startY),
    })
  }
  const onUp = () => {
    dragging.value = false
    window.removeEventListener('pointermove', onMove)
    persist()
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
  window.addEventListener('pointercancel', onUp, { once: true })
}

function togglePin(): void {
  // 赋值即通过 v-model:pinned 同步给父组件,watch(pinned) 负责持久化
  pinned.value = !pinned.value
}

/** Esc:置顶态不关闭(与 pigo 一致) */
function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || pinned.value) {
    return
  }
  e.stopPropagation()
  emit('close')
}

/** 点击面板外部:置顶态、翻译进行中、刚打开时都不关闭 */
function onOutsidePointer(e: PointerEvent): void {
  if (pinned.value || !props.dismissible) {
    return
  }
  if (Date.now() - openedAt < OPEN_GRACE_MS) {
    return
  }
  const panel = panelRef.value
  const target = e.target
  if (panel && target instanceof Node && panel.contains(target)) {
    return
  }
  // 顶栏图标区域不算"外部":避免点击图标先关窗再被 click 重新打开造成闪烁,
  // 顶栏图标自身的开/关卡由 index.ts 的 callback 处理。
  if (target instanceof Element && target.closest('#toolbar')) {
    return
  }
  emit('close')
}

function onViewportResize(): void {
  applySize()
  pos.value = clamp(pos.value)
}

let stopThemeWatch: (() => void) | null = null
let enteringTimer = 0

/** 动画被打断(例如立刻拖动)时用定时器兜底清除 */
function onEntryEnd(): void {
  entering.value = false
}

onMounted(() => {
  stopThemeWatch = watchSiyuanTheme()
  enteringTimer = window.setTimeout(onEntryEnd, 400)
  applySize()
  restore()
  window.addEventListener('keydown', onKeydown, true)
  window.addEventListener('resize', onViewportResize)
  document.addEventListener('pointerdown', onOutsidePointer, true)
})

onBeforeUnmount(() => {
  window.clearTimeout(enteringTimer)
  stopThemeWatch?.()
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('resize', onViewportResize)
  document.removeEventListener('pointerdown', onOutsidePointer, true)
})

watch(pinned, persist)
</script>
