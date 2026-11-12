import type { Plugin } from 'siyuan'
import { showMessage } from 'siyuan'
import { createApp, watch, type Component } from 'vue'
import WorkbenchApp from '@/components/WorkbenchApp.vue'
import type { TransConfig } from '@/trans/types'
import { loadConfig } from '@/trans/config'
import {
  closeWorkbench,
  openWorkbench,
  workbenchBusy,
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
  // 插件被"关闭再启动"时模块状态可能仍在:强制回到干净的未打开状态,
  // 否则 workbenchOpen 仍是 true 会让后续打开动作不触发挂载。
  workbenchOpen.value = false
  workbenchBusy.value = false
  workbenchStatus.value = '就绪'
  unmountWorkbench = null
}

export function destroy() {
  // 先关窗(触发卸载)再清句柄,避免下次加载时被判断为"已打开"
  workbenchOpen.value = false
  unmountWorkbench = null
  workbenchBusy.value = false
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
  // 幂等:已经挂着真实 DOM 就直接复用;句柄残留但 DOM 不在则重建
  if (unmountWorkbench && document.querySelector('.siyuan-trans-app')) {
    return
  }
  unmountWorkbench?.()
  unmountWorkbench = null

  const div = document.createElement('div')
  div.className = 'siyuan-trans-app'
  document.body.appendChild(div)
  const app = createApp(WorkbenchApp as unknown as Component)
  app.mount(div)
  const record = { app, div }
  mountedApps.push(record)
  workbenchStatus.value = '就绪'
  unmountWorkbench = () => {
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

function unmountWorkbenchApp(): void {
  unmountWorkbench?.()
  unmountWorkbench = null
}

// 状态变化即挂载/卸载;flush: sync 保证与状态赋值同一拍完成
watch(
  workbenchOpen,
  (open) => {
    if (open) {
      mountWorkbench()
    } else {
      unmountWorkbenchApp()
    }
  },
  { flush: 'sync' },
)

/** 打开翻译工作台
 *  - docId 非空:预填并解析该文档(仍需手动点「开始翻译」)
 *  - docId 为空:展示输入框等待指定页面 */
export async function openTranslateDialog(options: {
  docId?: string | null
  allowInput?: boolean
} = {}): Promise<void> {
  let cfg: TransConfig
  try {
    cfg = await loadConfig(usePlugin())
  } catch (e) {
    // 读配置失败时不要把异常吞掉(命令触发会表现为"点了没反应")
    console.error('[siyuan-trans] loadConfig failed', e)
    showMessage(`打开工作台失败:${(e as Error).message}`, 5000, 'error')
    return
  }
  const key = cfg.engine === 'llm' ? cfg.llm_api_key : cfg.api_key
  if (!key) {
    showMessage('请先在设置中配置 API Key', 4000, 'error')
    openWorkbench('settings')
    mountWorkbench()
    return
  }
  openWorkbench('translate', options.docId ?? null)
  // 状态已是 true(例如窗口已开着)时 watch 不会触发,这里兜底确保挂载
  mountWorkbench()
}

/** 打开设置页(同一浮动窗口的「插件设置」页签) */
export function openSettingDialog(): void {
  openWorkbench('settings')
  mountWorkbench()
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
