<template>
  <pigo-panel :plugin="props.plugin" />
</template>

<script setup lang="ts">
import type { Plugin } from 'siyuan'
import PigoPanel from '@/components/PigoPanel.vue'

const props = defineProps<{
  plugin: Plugin
}>()
</script>
