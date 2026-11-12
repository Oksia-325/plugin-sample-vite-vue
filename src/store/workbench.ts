/**
 * 工作台 UI 状态
 *
 * 单实例浮动窗口:main.ts 监听 workbenchOpen 决定挂载/卸载,
 * 各入口(顶栏菜单、右键菜单、设置)只改这里的状态。
 */

import { ref } from 'vue'

export type WorkbenchTab = 'translate' | 'settings'

/** 窗口是否打开 */
export const workbenchOpen = ref(false)
/** 当前页签 */
export const workbenchTab = ref<WorkbenchTab>('translate')
/** 置顶状态(与 FloatWindow 双向绑定) */
export const workbenchPinned = ref(false)
/** 待翻译文档 ID */
export const workbenchDocId = ref<string | null>(null)
/** 头部状态胶囊文案 */
export const workbenchStatus = ref('就绪')
/** 翻译进行中(此时点击窗口外部不关闭,避免误打断任务) */
export const workbenchBusy = ref(false)

/** 打开工作台并定位到指定页签 */
export function openWorkbench(tab: WorkbenchTab, docId: string | null = null): void {
  workbenchTab.value = tab
  if (tab === 'translate') {
    workbenchDocId.value = docId
  }
  workbenchOpen.value = true
}

/** 关闭工作台(卸载组件,在途翻译随组件卸载取消) */
export function closeWorkbench(): void {
  workbenchOpen.value = false
}
