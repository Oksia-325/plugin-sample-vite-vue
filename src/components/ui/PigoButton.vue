<template>
  <button
    class="pigo-btn"
    :class="[`pigo-btn--${variant}`, `pigo-btn--${size}`]"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="pigo-btn__spinner" aria-hidden="true"></span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
})
</script>
