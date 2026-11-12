import type { Plugin } from 'siyuan'
import { showMessage } from 'siyuan'
import { createApp, watch, type Component } from 'vue'
import WorkbenchApp from '@/components/WorkbenchApp.vue'
import type { TransConfig } from '@/trans/types'
import { loadConfig } from '@/trans/config'
import {
  closeWorkbench,
  openWorkbench,
  workbenchOpen,
  workbenchStatus,
} from '@/store/workbench'

let plugin: Plugin | null = null

/** 取已绑定的 Plugin 单例(组件内调用) */
export function usePlugin(pluginProps?: Plugin): Plugin {
  if (pluginProps) {
    plugin = pluginProps
  }
  if (!plugin && !pluginProps) {
    console.error('need bind plugin')
  }
  return plugin as Plugin
}

/** 已挂载的 Vue 应用实例(用于卸载) */
const mountedApps: Array<{ app: ReturnType<typeof createApp>, div: HTMLElement | null }> = []

export function init(pluginInstance: Plugin) {
  usePlugin(pluginInstance)
}

export function destroy() {
  for (const { app, div } of mountedApps) {
    try {
      app.unmount()
    } catch {
      /* ignore */
    }
    div?.remove()
  }
  mountedApps.length = 0
  plugin = null
}

/** 把 Vue 组件挂载到一个游离 div 并加入 body,返回清理函数 */
export function mountComponent(
  component: Component,
  props: Record<string, unknown> = {},
): () => void {
  const div = document.createElement('div')
  document.body.appendChild(div)
  const app = createApp(component, props)
  app.mount(div)
  const record = { app, div }
  mountedApps.push(record)
  return () => {
    const idx = mountedApps.indexOf(record)
    if (idx >= 0) {
      mountedApps.splice(idx, 1)
    }
    try {
      app.unmount()
    } catch {
      /* ignore */
    }
    div.remove()
  }
}

/* ---------------------------------------------------------------- 工作台 */

/** 工作台挂载清理函数(关闭时卸载,在途翻译随组件卸载取消) */
let unmountWorkbench: (() => void) | null = null

function mountWorkbench(): void {
  if (unmountWorkbench) {
    return
  }
  workbenchStatus.value = '就绪'
  unmountWorkbench = mountComponent(WorkbenchApp as unknown as Component)
}

function unmountWorkbenchApp(): void {
  unmountWorkbench?.()
  unmountWorkbench = null
}

// 单一入口:workbenchOpen 变化即挂载/卸载,各调用方只改状态
watch(workbenchOpen, (open) => {
  if (open) {
    mountWorkbench()
  } else {
    unmountWorkbenchApp()
  }
})

/** 打开翻译工作台
 *  - docId 非空:预填并解析该文档(仍需手动点「开始翻译」)
 *  - docId 为空:展示输入框等待指定页面 */
export async function openTranslateDialog(options: {
  docId?: string | null
  allowInput?: boolean
} = {}): Promise<void> {
  // 预校验配置(按引擎检查对应的 API Key)
  const cfg = await loadConfig(usePlugin())
  const key = cfg.engine === 'llm' ? cfg.llm_api_key : cfg.api_key
  if (!key) {
    showMessage('请先在设置中配置 API Key', 4000, 'error')
    openWorkbench('settings')
    return
  }
  openWorkbench('translate', options.docId ?? null)
}

/** 打开设置页(同一浮动窗口的「插件设置」页签) */
export function openSettingDialog(): void {
  openWorkbench('settings')
}

/** 关闭工作台(供外部调用) */
export function closeWorkbenchDialog(): void {
  closeWorkbench()
}

/** 取当前配置(供 index.ts 做前置校验) */
export async function getCurrentConfig(): Promise<TransConfig | null> {
  try {
    return await loadConfig(usePlugin())
  } catch {
    return null
  }
}
