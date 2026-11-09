<template>
  <footer class="pigo-status-bar-row">
    <span class="pigo-status-bar-row__item">
      <span class="pigo-status-bar-row__dot"></span>
      S3 存储桶: {{ storageLabel }}
    </span>
    <span class="pigo-status-bar-row__sep"></span>
    <span class="pigo-status-bar-row__item pigo-status-bar-row__item--mode">
      当前模式: {{ modeLabel }}
    </span>
    <span class="pigo-status-bar-row__spacer"></span>
    <span class="pigo-status-bar-row__version">v{{ version }}</span>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { describeStorage } from '@/core/s3/describe'
import { configState } from '@/core/configStore'
import { uiState } from '@/core/uiStore'

const props = withDefaults(defineProps<{
  version?: string
}>(), {
  version: '',
})

const storageLabel = computed(() => describeStorage(configState.config.s3).label)

const modeLabel = computed(() => uiState.modeLabel || fallbackMode(uiState.activeTab))

const version = computed(() => props.version || '')

function fallbackMode(tab: string): string {
  switch (tab) {
    case 'stats':
      return '全库统计'
    case 'sync':
      return '全库与存储桶双向比对'
    case 'settings':
      return '配置管理'
    default:
      return '当前文档上传'
  }
}
</script>

<style scoped>
.pigo-status-bar-row {
  flex: 0 0 var(--pigo-footer-height);
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  padding: 0 12px;
  border-top: 1px solid var(--pigo-border);
  color: var(--pigo-muted);
  background: var(--pigo-panel);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.4;
  user-select: none;
}

.pigo-status-bar-row__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pigo-status-bar-row__item--mode {
  color: var(--pigo-muted);
}

.pigo-status-bar-row__dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--pigo-emerald);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16);
}

.pigo-status-bar-row__sep {
  width: 1px;
  height: 10px;
  flex: 0 0 1px;
  background: var(--pigo-border-strong);
}

.pigo-status-bar-row__spacer {
  flex: 1 1 auto;
}

.pigo-status-bar-row__version {
  color: var(--pigo-muted);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .pigo-status-bar-row__item--mode,
  .pigo-status-bar-row__sep {
    display: none;
  }
}
</style>
