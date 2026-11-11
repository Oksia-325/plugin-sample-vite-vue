<template>
  <span
    class="i8-asset-icon"
    :class="{ 'i8-asset-icon--spin': spin }"
    :style="{
      width: dimension, height: dimension,
    }"
    v-html="markup"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import check from '@/assets/icons/check.svg?raw'
import concurrency from '@/assets/icons/concurrency.svg?raw'
import copy from '@/assets/icons/copy.svg?raw'
import download from '@/assets/icons/download.svg?raw'
import external from '@/assets/icons/external.svg?raw'
import eyeOff from '@/assets/icons/eye-off.svg?raw'
import eye from '@/assets/icons/eye.svg?raw'
import folder from '@/assets/icons/folder.svg?raw'
import format from '@/assets/icons/format.svg?raw'
import hintAlt from '@/assets/icons/hint-alt.svg?raw'
import hint from '@/assets/icons/hint.svg?raw'
import key from '@/assets/icons/key.svg?raw'
import login from '@/assets/icons/login.svg?raw'
import search from '@/assets/icons/search.svg?raw'
import settings from '@/assets/icons/settings.svg?raw'
import size from '@/assets/icons/size.svg?raw'
import sync from '@/assets/icons/sync.svg?raw'
import verify from '@/assets/icons/verify.svg?raw'

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  spin?: boolean
}>(), {
  size: 18,
  spin: false,
})

const ICONS: Record<string, string> = {
  check,
  concurrency,
  copy,
  download,
  external,
  eye,
  'eye-off': eyeOff,
  folder,
  format,
  hint,
  'hint-alt': hintAlt,
  key,
  login,
  search,
  settings,
  size,
  sync,
  verify,
}

const dimension = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size)

const markup = computed(() => normalizeAsset(ICONS[props.name] ?? ICONS.sync, dimension.value))

function normalizeAsset(source: string, dimensionValue: string): string {
  let svg = source
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  // 白色背景块直接隐藏，避免 dark mode 下变成实心方块。
  svg = svg.replace(/fill="#(?:ffffff|fff)"/gi, 'fill="none"')
  svg = svg.replace(/fill="#[0-9a-f]{3,8}"/gi, 'fill="currentColor"')
  svg = svg.replace(/fill-opacity="[^"]*"/gi, '')
  svg = svg.replace(/<svg([^>]*)>/i, (_match, attrs: string) => {
    const cleaned = attrs
      .replace(/\s(width|height)="[^"]*"/gi, '')
      .replace(/\sclass="[^"]*"/gi, '')
    return `<svg${cleaned} width="${dimensionValue}" height="${dimensionValue}" fill="currentColor" aria-hidden="true">`
  })
  return svg
}
</script>

<style lang="scss" scoped>
.i8-asset-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: inherit;

  :deep(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  &--spin {
    animation: i8-asset-spin 1s linear infinite;
  }
}

@keyframes i8-asset-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
