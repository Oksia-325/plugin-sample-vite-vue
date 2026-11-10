<template>
  <div ref="root" class="pigo-pagination">
    <span class="pigo-pagination__info">
      共 {{ total }} 条 · 第 {{ safePage }} / {{ pages }} 页
    </span>
    <div class="pigo-pagination__controls">
      <pigo-button variant="ghost" size="sm" :disabled="safePage <= 1" title="上一页（←）" @click="go(safePage - 1)">
        上一页
      </pigo-button>
      <span class="pigo-pagination__jump">
        跳至
        <input
          v-model="pageInput"
          class="pigo-input pigo-pagination__input"
          type="text"
          inputmode="numeric"
          aria-label="输入页码"
          @keydown.enter.prevent="jump"
          @blur="resetInput"
        >
        页
      </span>
      <pigo-button variant="ghost" size="sm" :disabled="safePage >= pages" title="下一页（→）" @click="go(safePage + 1)">
        下一页
      </pigo-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PigoButton from '@/components/ui/PigoButton.vue'

const props = withDefaults(defineProps<{
  total: number
  page: number
  pageSize?: number
}>(), {
  pageSize: 60,
})

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const root = ref<HTMLElement | null>(null)
const pageInput = ref(String(props.page))

const pages = computed(() => Math.max(1, Math.ceil(Math.max(0, props.total) / props.pageSize)))
const safePage = computed(() => Math.min(Math.max(1, props.page), pages.value))

watch(
  () => props.page,
  (value) => {
    pageInput.value = String(clampPage(value))
  }
)

watch(pages, (value) => {
  if (props.page > value) {
    emit('update:page', value)
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

function clampPage(value: number): number {
  const page = Math.round(Number(value))
  if (!Number.isFinite(page)) {
    return 1
  }
  return Math.min(Math.max(1, page), pages.value)
}

function go(next: number): void {
  const page = clampPage(next)
  if (page !== props.page) {
    emit('update:page', page)
  }
  pageInput.value = String(page)
}

function jump(): void {
  go(Number(pageInput.value))
}

function resetInput(): void {
  pageInput.value = String(safePage.value)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) {
    return
  }
  if (isEditable(event.target as HTMLElement | null)) {
    return
  }
  // v-show 隐藏的页签不响应，避免同时翻动多个列表。
  if (!root.value || root.value.offsetParent === null) {
    return
  }
  // 弹窗 / 图片预览打开时不翻页。
  if (document.querySelector('.pigo-modal, .pigo-preview')) {
    return
  }

  event.preventDefault()
  if (event.key === 'ArrowLeft') {
    go(safePage.value - 1)
  }
  else {
    go(safePage.value + 1)
  }
}

function isEditable(target: HTMLElement | null): boolean {
  if (!target) {
    return false
  }
  if (target.closest('input, textarea, select, [contenteditable="true"]')) {
    return true
  }
  return false
}
</script>

<style scoped>
.pigo-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 4px;
}

.pigo-pagination__info {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  font-variant-numeric: tabular-nums;
}

.pigo-pagination__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pigo-pagination__jump {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  white-space: nowrap;
}

.pigo-pagination__input {
  width: 46px;
  height: 24px;
  padding: 2px 4px 0;
  text-align: center;
  font-size: var(--pigo-fs-xs);
  font-variant-numeric: tabular-nums;
}
</style>
