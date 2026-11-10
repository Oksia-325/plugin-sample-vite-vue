<template>
  <component
    :is="clickable ? 'button' : 'span'"
    class="pigo-health"
    :class="[`pigo-health--${state}`, { 'pigo-health--clickable': clickable }]"
    :type="clickable ? 'button' : undefined"
    :title="title || label"
    @click="clickable ? emit('click') : undefined"
  >
    <span class="pigo-health__dot" aria-hidden="true"></span>
    <span class="pigo-health__label">{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  state?: 'ok' | 'error' | 'checking'
  label: string
  title?: string
  clickable?: boolean
}>(), {
  state: 'checking',
  title: '',
  clickable: false,
})

const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.pigo-health {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 0;
  border: 0;
  color: var(--pigo-muted);
  background: transparent;
  font: inherit;
  font-size: var(--pigo-fs-2xs);
  line-height: 1.4;
}

.pigo-health--clickable {
  cursor: pointer;
  border-radius: var(--pigo-radius-sm);
}

.pigo-health--clickable:hover {
  color: var(--pigo-text-2);
}

.pigo-health--clickable:focus-visible {
  outline: 2px solid var(--pigo-accent);
  outline-offset: 2px;
}

.pigo-health__dot {
  position: relative;
  top: -1px;
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--pigo-muted);
}

.pigo-health--ok .pigo-health__dot {
  background: var(--pigo-emerald);
  box-shadow: 0 0 0 3px var(--pigo-emerald-soft);
}

.pigo-health--error .pigo-health__dot {
  background: var(--pigo-rose);
  box-shadow: 0 0 0 3px var(--pigo-rose-soft);
}

.pigo-health--checking .pigo-health__dot {
  background: var(--pigo-amber);
  animation: pigo-health-pulse 1.1s ease-in-out infinite;
}

.pigo-health__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes pigo-health-pulse {
  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pigo-health--checking .pigo-health__dot {
    animation: none;
  }
}
</style>
