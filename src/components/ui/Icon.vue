<!--
  图标组件

  图标来源优先级:
  1. OVERRIDES:指定语义名使用 asset/ 里用户自备的图标(1024 viewBox)
  2. Material Symbols Outlined(与 Stitch 设计稿完全同款,scdn 内联打包)
  3. 旧版用户图标(src/assets/icons/*.svg)
  4. 内置 24×24 描边兜底

  Material Symbols 即设计稿所用图标字体,这里取官方 SVG 版本内联,
  因此能直接跟随 currentColor,不依赖外网字体。
-->
<template>
  <svg
    v-if="spec"
    class="tr2-icon"
    :width="size"
    :height="size"
    :viewBox="spec.viewBox"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    v-html="spec.inner"
  />
  <svg
    v-else
    class="tr2-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(d, i) in strokePaths"
      :key="i"
      :d="d"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    strokeWidth?: number
  }>(),
  {
    size: 16,
    strokeWidth: 1.8,
  },
)

/* ---------------------------- Material Symbols ---------------------------- */

/** 语义名 → Material Symbols 图标名(与设计稿取用一致) */
const MS_MAP: Record<string, string> = {
  translate: 'translate',
  bolt: 'bolt',
  doc: 'article',
  description: 'description',
  dataset: 'dataset',
  link: 'link',
  plug: 'api',
  api: 'api',
  engine: 'smart_toy',
  key: 'key',
  terminal: 'terminal',
  chart: 'bar_chart',
  stats: 'analytics',
  usage: 'analytics',
  split: 'vertical_split',
  tune: 'tune',
  layers: 'layers',
  block: 'layers',
  clock: 'schedule',
  hourglass: 'hourglass_empty',
  wait: 'pending_actions',
  pending: 'pending_actions',
  cloud: 'cloud_done',
  hub: 'hub',
  proxy: 'public',
  connect: 'wifi_tethering',
  kernel: 'dns',
  plus: 'add',
  create: 'post_add',
  checkCircle: 'check_circle',
  success: 'check_circle',
  taskAlt: 'task_alt',
  check: 'check',
  close: 'close',
  trash: 'delete',
  search: 'search',
  alert: 'warning',
  error: 'error',
  info: 'info',
  save: 'save',
  sync: 'sync',
  sparkle: 'auto_awesome',
  language: 'language',
  book: 'book_2',
  arrowRight: 'arrow_forward',
  chevronDown: 'expand_more',
  eye: 'visibility',
  eyeOff: 'visibility_off',
  replay: 'replay',
  refresh: 'refresh',
  pin: 'push_pin',
  gauge: 'speed',
  write: 'edit_note',
  replace: 'find_replace',
  clear: 'backspace',
  verified: 'verified',
}

/**
 * 用户自备图标覆盖(放在 src/assets/icons/*.svg,1024 viewBox)
 * 例:verified 用的是 asset/验证.svg
 */
const OVERRIDES: Record<string, string> = {
  verified: 'verify',
}

/* ------------------------------- 资源装载 ------------------------------- */

const MS_RAW = import.meta.glob('../../assets/icons/ms/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const ASSET_RAW = import.meta.glob('../../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 去掉外层 svg 与写死颜色,只留图形,让图标跟随 currentColor */
function stripSvg(raw: string): string {
  const m = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  if (!m) {
    return ''
  }
  return m[1]
    .replace(/\sfill="[^"]*"/g, '')
    .replace(/\sstroke="[^"]*"/g, '')
    .replace(/\sp-id="[^"]*"/g, '')
    .replace(/\sclass="[^"]*"/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
}

interface IconSpec {
  inner: string
  viewBox: string
}

const spec = computed<IconSpec | null>(() => {
  // 1) 用户覆盖
  const override = OVERRIDES[props.name]
  if (override) {
    const raw = ASSET_RAW[`../../assets/icons/${override}.svg`]
    if (raw) {
      return { inner: stripSvg(raw), viewBox: '0 0 1024 1024' }
    }
  }
  // 2) 设计稿同款 Material Symbols
  const ms = MS_MAP[props.name]
  if (ms) {
    const raw = MS_RAW[`../../assets/icons/ms/${ms}.svg`]
    if (raw) {
      return { inner: stripSvg(raw), viewBox: '0 -960 960 960' }
    }
  }
  // 3) 用户提供的旧图标
  const legacy = LEGACY_ASSETS[props.name]
  if (legacy) {
    const raw = ASSET_RAW[`../../assets/icons/${legacy}.svg`]
    if (raw) {
      return { inner: stripSvg(raw), viewBox: '0 0 1024 1024' }
    }
  }
  return null
})

/** 旧版资源映射(未指定覆盖时仍可用) */
const LEGACY_ASSETS: Record<string, string> = {
  pin2: 'pin',
  refresh2: 'refresh',
  translate2: 'translate',
  engine2: 'engine',
  key2: 'key',
  terminal2: 'prompt',
  chart2: 'stats',
  usage2: 'usage',
  split2: 'append',
  tune2: 'config',
  block2: 'block',
  clock2: 'time',
  hourglass2: 'wait',
  cloud2: 'connect',
  hub2: 'proxy',
  plus2: 'create',
  checkCircle2: 'success',
  kernel2: 'kernel',
  write2: 'write',
  replace2: 'replace',
  clear2: 'clear',
  doc2: 'doc',
  link2: 'docTarget',
  plugin2: 'plugin',
}

/* ------------------------------ 描边兜底 ------------------------------ */

const ICONS: Record<string, string[]> = {
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v5.6M12 7.6v.6'],
  alert: ['M12 3.6l8.4 16.8H3.6z', 'M12 9.8v4.2M12 16.8v.6'],
}

const strokePaths = computed(() => ICONS[props.name] ?? ICONS.info)
</script>
