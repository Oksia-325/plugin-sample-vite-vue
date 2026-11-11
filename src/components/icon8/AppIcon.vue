<template>
  <svg
    class="i8-icon"
    :class="{ 'i8-icon--spin': spin }"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="def.filled ? 'currentColor' : 'none'"
    :stroke="def.filled ? 'none' : 'currentColor'"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      v-for="(d, index) in def.paths"
      :key="`p-${index}`"
      :d="d"
    />
    <circle
      v-for="(circle, index) in def.circles"
      :key="`c-${index}`"
      :cx="circle.cx"
      :cy="circle.cy"
      :r="circle.r"
    />
    <rect
      v-for="(rect, index) in def.rects"
      :key="`r-${index}`"
      :x="rect.x"
      :y="rect.y"
      :width="rect.width"
      :height="rect.height"
      :rx="rect.rx"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface IconCircle {
  cx: number
  cy: number
  r: number
}

interface IconRect {
  x: number
  y: number
  width: number
  height: number
  rx?: number
}

interface IconDefinition {
  paths?: string[]
  circles?: IconCircle[]
  rects?: IconRect[]
  filled?: boolean
}

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  strokeWidth?: number
  spin?: boolean
}>(), {
  size: 18,
  strokeWidth: 1.8,
  spin: false,
})

const ICONS: Record<string, IconDefinition> = {
  "sync": {
    paths: [
      'M21 12a9 9 0 0 1-15.36 6.36L3 16',
      'M3 12a9 9 0 0 1 15.36-6.36L21 8',
      'M21 3v5h-5',
      'M3 21v-5h5',
    ],
  },
  "tune": {
    paths: [
      'M4 6h16',
      'M4 12h16',
      'M4 18h16',
      'M9 4v4',
      'M15 10v4',
      'M7 16v4',
    ],
  },
  "stop": {
    paths: ['M8 8h8v8H8z'],
    filled: true,
  },
  "play": {
    paths: ['M8 5l11 7-11 7V5z'],
    filled: true,
  },
  "pause": {
    paths: ['M9 5v14', 'M15 5v14'],
  },
  "refresh": {
    paths: [
      'M21 12a9 9 0 1 1-2.64-6.36',
      'M21 3v6h-6',
    ],
  },
  "retry": {
    paths: [
      'M4 4v6h6',
      'M4.6 15a8 8 0 1 0 2.2-8.3L4 10',
    ],
  },
  "clock": {
    circles: [{
      cx: 12,
      cy: 12,
      r: 9,
    }],
    paths: ['M12 7v5l3 2'],
  },
  "close": {
    paths: ['M6 6l12 12', 'M18 6L6 18'],
  },
  "check": {
    paths: ['M5 13l4 4L19 7'],
  },
  'check-circle': {
    circles: [{
      cx: 12,
      cy: 12,
      r: 9,
    }],
    paths: ['M8 12l3 3 5-6'],
  },
  "alert": {
    paths: ['M12 4L2.5 20h19L12 4z', 'M12 10v4', 'M12 17h.01'],
  },
  "search": {
    circles: [{
      cx: 11,
      cy: 11,
      r: 7,
    }],
    paths: ['M20 20l-4-4'],
  },
  "key": {
    circles: [{
      cx: 8,
      cy: 15,
      r: 4,
    }],
    paths: ['M11 12l9-9', 'M17 6l3 3', 'M14 9l2 2'],
  },
  "eye": {
    paths: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z'],
    circles: [{
      cx: 12,
      cy: 12,
      r: 3,
    }],
  },
  'eye-off': {
    paths: [
      'M3 3l18 18',
      'M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-3 3.7',
      'M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 6 10 6c1.3 0 2.5-.3 3.6-.7',
    ],
    circles: [{
      cx: 12,
      cy: 12,
      r: 3,
    }],
  },
  "copy": {
    rects: [{
      x: 9,
      y: 9,
      width: 11,
      height: 11,
      rx: 2,
    }],
    paths: ['M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  },
  "bulb": {
    paths: [
      'M9 18h6',
      'M10 22h4',
      'M12 2a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 2z',
    ],
  },
  "download": {
    paths: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 17v3h16v-3'],
  },
  "image": {
    rects: [{
      x: 3,
      y: 3,
      width: 18,
      height: 18,
      rx: 3,
    }],
    circles: [{
      cx: 8.5,
      cy: 8.5,
      r: 1.5,
    }],
    paths: ['M21 15l-5-5L5 21'],
  },
  "aspect": {
    paths: [
      'M8 3H3v5',
      'M16 3h5v5',
      'M8 21H3v-5',
      'M16 21h5v-5',
    ],
  },
  "bolt": {
    paths: ['M13 2L4 14h6l-1 8 9-12h-6l1-8z'],
  },
  "folder": {
    paths: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z'],
  },
  'folder-open': {
    paths: [
      'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7z',
      'M3 10h18l-2 9H5l-2-9z',
    ],
  },
  "external": {
    paths: [
      'M14 3h7v7',
      'M21 3l-9 9',
      'M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
    ],
  },
  "chevron": {
    paths: ['M7 10l5 5 5-5'],
  },
  "minus": {
    paths: ['M6 12h12'],
  },
  "plus": {
    paths: ['M12 6v12', 'M6 12h12'],
  },
  "shield": {
    paths: [
      'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
      'M9 12l2 2 4-4',
    ],
  },
  "verified": {
    paths: [
      'M12 2l2.4 2.1 3.2-.2.8 3.1 2.7 1.7-1.2 3 1.2 3-2.7 1.7-.8 3.1-3.2-.2L12 22l-2.4-2.1-3.2.2-.8-3.1L2.9 15l1.2-3-1.2-3 2.7-1.7.8-3.1 3.2.2L12 2z',
      'M8.5 12l2.3 2.3 4.7-5',
    ],
  },
  "hub": {
    circles: [
      {
        cx: 12,
        cy: 12,
        r: 3,
      },
      {
        cx: 5,
        cy: 5,
        r: 2,
      },
      {
        cx: 19,
        cy: 5,
        r: 2,
      },
      {
        cx: 5,
        cy: 19,
        r: 2,
      },
      {
        cx: 19,
        cy: 19,
        r: 2,
      },
    ],
    paths: [
      'M6.5 6.5L10 10',
      'M17.5 6.5L14 10',
      'M6.5 17.5L10 14',
      'M17.5 17.5L14 14',
    ],
  },
  "layers": {
    paths: [
      'M12 3l9 5-9 5-9-5 9-5z',
      'M3 13l9 5 9-5',
      'M3 18l9 5 9-5',
    ],
  },
  "sigma": {
    paths: ['M18 5H6l6 7-6 7h12'],
  },
  "badge": {
    circles: [{
      cx: 12,
      cy: 9,
      r: 5,
    }],
    paths: ['M8.5 13.5L7 22l5-2 5 2-1.5-8.5'],
  },
  "leaf": {
    paths: ['M20 4C10 4 4 9 4 16c0 2 1 4 1 4s2-3 5-5c-1 3-3 4-3 4 7 1 13-4 13-15z'],
  },
  "device": {
    rects: [{
      x: 3,
      y: 4,
      width: 18,
      height: 12,
      rx: 2,
    }],
    paths: ['M8 20h8', 'M12 16v4'],
  },
  "gamepad": {
    paths: [
      'M7 8h10a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L12 14l-2 1.6A4 4 0 0 1 3 13v-1a4 4 0 0 1 4-4z',
      'M8 11v2',
      'M7 12h2',
      'M16 11h.01',
      'M18 13h.01',
    ],
  },
  "code": {
    paths: ['M8 8l-5 4 5 4', 'M16 8l5 4-5 4', 'M14 4l-4 16'],
  },
  "sparkles": {
    paths: [
      'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
      'M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
    ],
  },
  "grid": {
    rects: [
      {
        x: 3,
        y: 3,
        width: 7,
        height: 7,
        rx: 2,
      },
      {
        x: 14,
        y: 3,
        width: 7,
        height: 7,
        rx: 2,
      },
      {
        x: 3,
        y: 14,
        width: 7,
        height: 7,
        rx: 2,
      },
      {
        x: 14,
        y: 14,
        width: 7,
        height: 7,
        rx: 2,
      },
    ],
  },
  "bookmark": {
    paths: ['M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z'],
  },
  "box": {
    paths: [
      'M21 8l-9-5-9 5 9 5 9-5z',
      'M3 8v8l9 5 9-5V8',
      'M12 13v8',
    ],
  },
  "user": {
    circles: [{
      cx: 12,
      cy: 8,
      r: 4,
    }],
    paths: ['M4 21c0-4 4-6 8-6s8 2 8 6'],
  },
  "globe": {
    circles: [{
      cx: 12,
      cy: 12,
      r: 9,
    }],
    paths: [
      'M3 12h18',
      'M12 3c3 3 3 15 0 18',
      'M12 3c-3 3-3 15 0 18',
    ],
  },
  "heart": {
    paths: ['M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z'],
  },
  "chart": {
    paths: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  },
  "shapes": {
    circles: [{
      cx: 9,
      cy: 9,
      r: 5,
    }],
    rects: [{
      x: 13,
      y: 13,
      width: 8,
      height: 8,
      rx: 2,
    }],
  },
  "trash": {
    paths: ['M4 7h16', 'M9 7V5h6v2', 'M6 7l1 13h10l1-13', 'M10 11v5', 'M14 11v5'],
  },
  "dot": {
    circles: [{
      cx: 12,
      cy: 12,
      r: 5,
    }],
    filled: true,
  },
}

const def = computed<IconDefinition>(() => ICONS[props.name] ?? ICONS.layers)
</script>

<style lang="scss" scoped>
.i8-icon {
  display: block;
  flex-shrink: 0;

  &--spin {
    animation: i8-icon-spin 1s linear infinite;
  }
}

@keyframes i8-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
