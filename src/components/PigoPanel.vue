<template>
  <div class="pigo-panel">
    <div class="pigo-panel__header">
      <div class="pigo-panel__title">
        Pigo 图床
      </div>
      <div class="pigo-panel__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="pigo-panel__tab"
          :class="{ 'pigo-panel__tab--active': activeTab === tab.id }"
          type="button"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="pigo-panel__body">
      <div v-show="activeTab === 'upload'" class="pigo-placeholder">
        <div class="pigo-placeholder__title">
          上传
        </div>
        <div class="pigo-placeholder__desc">
          Phase 4 接入：当前文档图片列表、单图/批量上传、并发、题头图与链接替换。
        </div>
      </div>

      <div v-show="activeTab === 'stats'" class="pigo-placeholder">
        <div class="pigo-placeholder__title">
          统计
        </div>
        <div class="pigo-placeholder__desc">
          Phase 6 接入：全库扫描、本地/已上传 S3/网络图片统计、全库上传。
        </div>
      </div>

      <div v-show="activeTab === 'sync'" class="pigo-placeholder">
        <div class="pigo-placeholder__title">
          同步
        </div>
        <div class="pigo-placeholder__desc">
          Phase 7 接入：S3 与笔记双向匹配、仅 S3 存在、仅思源存在、清理 S3 孤儿对象。
        </div>
      </div>

      <settings-tab v-show="activeTab === 'settings'" :plugin="props.plugin" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Plugin } from 'siyuan'
import SettingsTab from '@/components/settings/SettingsTab.vue'

const props = defineProps<{
  plugin: Plugin
}>()

type PigoTabId = 'upload' | 'stats' | 'sync' | 'settings'

const activeTab = ref<PigoTabId>('settings')

const tabs: Array<{ id: PigoTabId, label: string }> = [
  { id: 'upload', label: '上传' },
  { id: 'stats', label: '统计' },
  { id: 'sync', label: '同步' },
  { id: 'settings', label: '设置' },
]
</script>

<style scoped>
.pigo-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  color: var(--b3-theme-on-background, #dfe0e1);
  background: var(--b3-theme-background, #1f1f1f);
}

.pigo-panel__header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
  background: var(--b3-theme-surface, rgba(0, 0, 0, 0.12));
}

.pigo-panel__title {
  flex: 0 0 auto;
  font-size: 14px;
  font-weight: 600;
}

.pigo-panel__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pigo-panel__tab {
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  color: var(--b3-theme-on-surface, #c9c9c9);
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.6;
}

.pigo-panel__tab:hover {
  background: var(--b3-theme-surface-lighter, rgba(255, 255, 255, 0.08));
}

.pigo-panel__tab--active {
  color: var(--b3-theme-on-background, #dfe0e1);
  background: var(--b3-theme-primary-lightest, rgba(53, 115, 240, 0.16));
}

.pigo-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.pigo-placeholder {
  padding: 32px 24px;
}

.pigo-placeholder__title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
}

.pigo-placeholder__desc {
  max-width: 640px;
  color: var(--b3-theme-on-surface-light, #999);
  font-size: 13px;
  line-height: 1.7;
}
</style>
