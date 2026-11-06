<template>
  <pigo-popup :plugin="props.plugin" />
</template>

<script setup lang="ts">
import type { Plugin } from 'siyuan'
import PigoPopup from '@/components/PigoPopup.vue'

const props = defineProps<{
  plugin: Plugin
}>()
</script>
