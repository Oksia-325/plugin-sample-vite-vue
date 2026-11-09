<template>
  <button
    v-if="clickable"
    class="pigo-chip pigo-chip--clickable"
    :class="classes"
    type="button"
    @click="$emit('click')"
  >
    <slot></slot>
    <span v-if="count !== undefined" class="pigo-chip__count">{{ count }}</span>
  </button>
  <span v-else class="pigo-chip" :class="classes">
    <slot></slot>
    <span v-if="count !== undefined" class="pigo-chip__count">{{ count }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ChipTone = 'default' | 'local' | 's3' | 'remote' | 'data' | 'title' | 'success' | 'warning' | 'danger' | 'muted'

const props = withDefaults(defineProps<{
  tone?: ChipTone
  active?: boolean
  clickable?: boolean
  count?: number
}>(), {
  tone: 'default',
  active: false,
  clickable: false,
  count: undefined,
})

defineEmits<{ click: [] }>()

const classes = computed(() => ({
  [`pigo-chip--${props.tone}`]: props.tone !== 'default',
  'pigo-chip--active': props.active,
}))
</script>
