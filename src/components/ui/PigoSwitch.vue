<template>
  <button
    class="pigo-switch"
    :class="{ 'pigo-switch--on': modelValue, 'pigo-switch--disabled': disabled }"
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label || title"
    :title="title || label"
    :disabled="disabled"
    @click.stop="$emit('update:modelValue', !modelValue)"
  >
    <span class="pigo-switch__knob"></span>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  label?: string
  title?: string
  disabled?: boolean
}>(), {
  label: '',
  title: '',
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
