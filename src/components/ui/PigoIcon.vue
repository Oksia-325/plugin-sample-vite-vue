<template>
  <svg
    class="pigo-icon"
    :style="iconStyle"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="path"
  ></svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PIGO_ICONS, type PigoIconName } from './pigo-icons'

const props = withDefaults(defineProps<{
  name: PigoIconName
  size?: number | string
  strokeWidth?: number
}>(), {
  size: 16,
  strokeWidth: 2,
})

const path = computed(() => PIGO_ICONS[props.name] ?? '')

/**
 * 思源全局样式会给所有 svg 加上 fill: currentColor。
 * 描边图标被填充后会变成色块，所以这里用内联样式强制覆盖。
 */
const iconStyle = computed(() => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: String(props.strokeWidth),
}))
</script>

<style scoped>
.pigo-icon {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
}

.pigo-icon :deep(path),
.pigo-icon :deep(circle),
.pigo-icon :deep(rect),
.pigo-icon :deep(line),
.pigo-icon :deep(polyline) {
  fill: none;
}
</style>
