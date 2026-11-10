<template>
  <article class="pigo-accordion" :class="{ 'pigo-accordion--open': open }">
    <button
      class="pigo-accordion__header"
      type="button"
      :aria-expanded="open"
      @click="$emit('update:open', !open)"
    >
      <span v-if="$slots.icon" class="pigo-accordion__icon" aria-hidden="true">
        <slot name="icon"></slot>
      </span>
      <span class="pigo-accordion__title">
        <span class="pigo-accordion__name">{{ title }}</span>
        <span v-if="subtitle" class="pigo-accordion__subtitle">{{ subtitle }}</span>
      </span>
      <span class="pigo-accordion__spacer"></span>
      <span v-if="summary" class="pigo-accordion__summary">{{ summary }}</span>
      <svg
        class="pigo-accordion__chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <div v-show="open" class="pigo-accordion__body">
      <slot></slot>
    </div>
  </article>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  summary?: string
  open?: boolean
}>(), {
  subtitle: '',
  summary: '',
  open: false,
})

defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<style scoped>
.pigo-accordion {
  overflow: hidden;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-lg);
  background: var(--pigo-card);
}

.pigo-accordion--open {
  border-color: var(--pigo-border-strong);
}

.pigo-accordion__header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  color: var(--pigo-text);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.pigo-accordion__header:hover {
  background: var(--pigo-surface-strong);
}

.pigo-accordion__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-text-2);
  background: var(--pigo-surface);
}

.pigo-accordion__icon :deep(svg) {
  width: 14px;
  height: 14px;
}

.pigo-accordion__title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.pigo-accordion__name {
  color: var(--pigo-text);
  font-size: var(--pigo-fs-sm);
  font-weight: 600;
}

.pigo-accordion__subtitle {
  color: var(--pigo-muted);
  font-size: var(--pigo-fs-2xs);
  font-weight: 400;
}

.pigo-accordion__spacer {
  flex: 1 1 auto;
}

.pigo-accordion__summary {
  max-width: 300px;
  overflow: hidden;
  padding: 2px 8px;
  border: 1px solid var(--pigo-border);
  border-radius: var(--pigo-radius-sm);
  color: var(--pigo-text-2);
  background: var(--pigo-surface);
  font-family: var(--b3-font-family-code, ui-monospace, monospace);
  font-size: var(--pigo-fs-2xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-accordion__chevron {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: var(--pigo-muted);
  transition: transform 0.2s ease;
}

.pigo-accordion--open .pigo-accordion__chevron {
  transform: rotate(180deg);
}

.pigo-accordion__body {
  padding: 14px;
  border-top: 1px solid var(--pigo-border);
  background: transparent;
}

@media (max-width: 640px) {
  .pigo-accordion__subtitle,
  .pigo-accordion__summary {
    display: none;
  }
}
</style>
