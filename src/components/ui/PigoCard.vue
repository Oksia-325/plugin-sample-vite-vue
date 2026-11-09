<template>
  <div class="pigo-card" :class="{ 'pigo-card--hoverable': hoverable }">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  hoverable?: boolean
}>(), {
  hoverable: false,
})
</script>
