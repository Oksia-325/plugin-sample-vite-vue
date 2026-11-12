<!--
  工作台外壳:浮动窗口 + 两个页签

  S1 阶段仅搭壳与导航,页签内部暂时沿用现有面板(样式在 S2 起逐步替换),
  保证从旧弹窗迁移过程中翻译与设置功能不退化。
-->
<template>
  <FloatWindow
    v-model:pinned="pinned"
    title="SiYuan Translate"
    subtitle="智能文档翻译"
    :status="status"
    :dismissible="!busy"
    @close="closeWorkbench"
  >
    <template #nav>
      <button
        class="fw-nav__item"
        :class="{ 'is-active': tab === 'translate' }"
        type="button"
        @click="tab = 'translate'"
      >
        翻译工作台
      </button>
      <button
        class="fw-nav__item"
        :class="{ 'is-active': tab === 'settings' }"
        type="button"
        @click="tab = 'settings'"
      >
        插件设置
      </button>
    </template>

    <div
      class="wb-pane"
      :hidden="tab !== 'translate'"
    >
      <TranslateDialog
        :key="docId ?? 'manual'"
        :doc-id="docId"
        :allow-input="true"
        :dialog="dialogStub"
      />
    </div>

    <div
      class="wb-pane"
      :hidden="tab !== 'settings'"
    >
      <SettingPanel />
    </div>
  </FloatWindow>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Dialog } from 'siyuan'
import FloatWindow from '@/components/FloatWindow.vue'
import TranslateDialog from '@/components/TranslateDialog.vue'
import SettingPanel from '@/components/SettingPanel.vue'
import {
  closeWorkbench,
  workbenchBusy,
  workbenchDocId,
  workbenchPinned,
  workbenchStatus,
  workbenchTab,
  type WorkbenchTab,
} from '@/store/workbench'

const tab = computed<WorkbenchTab>({
  get: () => workbenchTab.value,
  set: (v) => {
    workbenchTab.value = v
  },
})

const pinned = computed({
  get: () => workbenchPinned.value,
  set: (v: boolean) => {
    workbenchPinned.value = v
  },
})

const docId = computed(() => workbenchDocId.value)
const status = computed(() => workbenchStatus.value)
const busy = computed(() => workbenchBusy.value)

/** 旧面板需要的 dialog 桩:关闭即关窗 */
const dialogStub = {
  destroy: () => closeWorkbench(),
} as unknown as Dialog
</script>

<style lang="scss" scoped>
.wb-pane {
  padding: 14px 16px 16px;
}

.wb-pane[hidden] {
  display: none;
}
</style>
