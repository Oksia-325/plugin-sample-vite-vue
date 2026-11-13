<template>
  <div class="pigo-panel">
    <header class="pigo-panel__header" @pointerdown="onHeaderPointerDown">
      <div class="pigo-panel__brand">
        <span class="pigo-panel__logo" aria-hidden="true">
          <PigoIcon name="cloud-upload" :size="15" :stroke-width="2.2" />
        </span>
        <span class="pigo-panel__title">Pigo 图床</span>
      </div>

      <nav class="pigo-panel__tabs" aria-label="Pigo 页签">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="pigo-panel__tab"
          :class="{ 'pigo-panel__tab--active': uiState.activeTab === tab.id }"
          type="button"
          @click="uiState.activeTab = tab.id"
        >
          <span v-if="uiState.activeTab === tab.id" class="pigo-panel__tab-dot" aria-hidden="true"></span>
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div class="pigo-panel__spacer"></div>


      <div class="pigo-panel__actions">
        <slot name="actions"></slot>
      </div>
    </header>

    <div v-if="renderError" class="pigo-panel__error">
      <span>页面渲染出错：{{ renderError }}</span>
      <button class="pigo-btn pigo-btn--ghost pigo-btn--sm" type="button" @click="renderError = ''">
        关闭
      </button>
    </div>

    <div class="pigo-panel__body" tabindex="-1">
      <upload-tab v-show="uiState.activeTab === 'upload'" :plugin="props.plugin" />

      <stats-tab v-show="uiState.activeTab === 'stats'" :plugin="props.plugin" />

      <sync-tab v-show="uiState.activeTab === 'sync'" :plugin="props.plugin" />

      <settings-tab v-show="uiState.activeTab === 'settings'" :plugin="props.plugin" />
    </div>

    <pigo-toast />

    <pigo-status-bar :version="props.plugin.version" />
  </div>
</template>

<script setup lang="ts">
import { onErrorCaptured, onMounted, ref, watch } from 'vue'
import type { Plugin } from 'siyuan'
import PigoStatusBar from '@/components/PigoStatusBar.vue'
import SettingsTab from '@/components/settings/SettingsTab.vue'
import StatsTab from '@/components/stats/StatsTab.vue'
import SyncTab from '@/components/sync/SyncTab.vue'
import UploadTab from '@/components/upload/UploadTab.vue'
import PigoIcon from '@/components/ui/PigoIcon.vue'
import PigoToast from '@/components/ui/PigoToast.vue'
import { ensureConfigLoaded } from '@/core/configStore'
import { setPigoMode, uiState, type PigoTabId } from '@/core/uiStore'

const props = defineProps<{
  plugin: Plugin & { version?: string }
}>()

const emit = defineEmits<{
  'header-pointerdown': [event: PointerEvent]
}>()

const renderError = ref('')

const tabs: Array<{ id: PigoTabId, label: string }> = [
  { id: 'upload', label: '上传' },
  { id: 'stats', label: '统计' },
  { id: 'sync', label: '同步' },
  { id: 'settings', label: '设置' },
]

const MODE_BY_TAB: Record<PigoTabId, string> = {
  upload: '当前文档上传',
  stats: '全库统计',
  sync: '全库与存储桶双向比对',
  settings: '配置管理',
}



/**
 * 顶栏空白区域可以拖动窗口，交互元素（页签、开关、按钮）不触发。
 */
function onHeaderPointerDown(event: PointerEvent): void {
  const target = event.target as HTMLElement | null
  if (target?.closest('button, a, input, textarea, select, [contenteditable="true"]')) {
    return
  }
  emit('header-pointerdown', event)
}

onMounted(() => {
  void ensureConfigLoaded(props.plugin)
})

watch(
  () => uiState.activeTab,
  (tab) => {
    setPigoMode(MODE_BY_TAB[tab])
  },
  { immediate: true }
)

onErrorCaptured((error) => {
  renderError.value = error instanceof Error ? error.message : String(error)
  console.error('[Pigo] 页面渲染出错', error)
  return false
})
</script>

<style scoped>
.pigo-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  color: var(--pigo-text);
  background: var(--pigo-bg);
}

.pigo-panel__header {
  display: flex;
  flex: 0 0 var(--pigo-header-height);
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  padding: 0 12px;
  border-bottom: 1px solid var(--pigo-border);
  background: var(--pigo-panel);
  user-select: none;
}

.pigo-panel__brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  border-right: 1px solid var(--pigo-border);
}

.pigo-panel__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--pigo-radius-md);
  color: #fff;
  background: linear-gradient(135deg, #ea580c, #f59e0b);
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.28);
}

.pigo-panel__logo svg {
  width: 15px;
  height: 15px;
}

.pigo-panel__title {
  position: relative;
  top: 1px;
  color: var(--pigo-text);
  font-size: var(--pigo-fs-sm);
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.pigo-panel__tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  min-width: 0;
}

.pigo-panel__tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  /* 补偿字体视觉基线，文字下移 1px */
  padding: 6px 11px 4px;
  border: 1px solid transparent;
  border-radius: var(--pigo-radius-md);
  color: var(--pigo-muted);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--pigo-fs-xs);
  line-height: 1.5;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.pigo-panel__tab:hover {
  color: var(--pigo-text);
  background: var(--pigo-card);
}

.pigo-panel__tab--active {
  color: var(--pigo-accent);
  background: var(--pigo-accent-soft);
  border-color: rgba(249, 115, 22, 0.32);
}

.pigo-panel__tab-dot {
  position: relative;
  top: -1px;
  width: 5px;
  height: 5px;
  flex: 0 0 5px;
  border-radius: 50%;
  background: currentColor;
}

.pigo-panel__spacer {
  flex: 1 1 auto;
  min-width: 4px;
}




.pigo-panel__actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  color: var(--pigo-muted);
}

.pigo-panel__error {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  color: var(--pigo-rose);
  background: var(--pigo-rose-soft);
  font-size: var(--pigo-fs-2xs);
  line-height: 1.6;
}

.pigo-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  outline: none;
  scrollbar-gutter: stable;
}

@media (max-width: 640px) {
  .pigo-panel__brand {
    padding-right: 6px;
  }

  .pigo-panel__title {
    display: none;
  }
}
</style>
