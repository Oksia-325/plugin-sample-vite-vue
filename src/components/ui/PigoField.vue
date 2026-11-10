<template>
  <div class="pigo-field">
    <label v-if="label" class="pigo-field__label" :for="forId">
      {{ label }}
      <slot name="label-extra"></slot>
    </label>
    <div class="pigo-field__control">
      <slot></slot>
    </div>
    <p v-if="hint" class="pigo-field__hint">{{ hint }}</p>
    <p v-if="error" class="pigo-field__error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  forId?: string
  hint?: string
  error?: string
}>(), {
  label: '',
  forId: '',
  hint: '',
  error: '',
})
</script>
