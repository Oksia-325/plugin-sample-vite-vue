import type { Plugin } from 'siyuan'
import { Dialog, showMessage } from 'siyuan'
import { createApp, type Component } from 'vue'
import TranslateDialog from '@/components/TranslateDialog.vue'
import SettingPanel from '@/components/SettingPanel.vue'
import type { TransConfig } from '@/trans/types'
import { loadConfig } from '@/trans/config'

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

/** 把 Vue 组件挂载到指定容器,返回清理函数(卸载应用) */
function mountInto(
  container: HTMLElement,
  component: Component,
  props: Record<string, unknown> = {},
): () => void {
  const app = createApp(component, props)
  container.innerHTML = ''
  app.mount(container)
  const record = { app, div: null as HTMLElement | null }
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
  }
}

/** 在一个独立的思源 Dialog 内挂载 Vue 组件
 *  思源 Dialog 的 content 经全局 getElementById 解析(不依赖 dialog.element
 *  的内部结构,避免查询不到挂载点导致弹窗一闪而过)。 */
function openMountedDialog(options: {
  title: string
  width?: string
  component: Component
  props: Record<string, unknown>
}): Dialog {
  const { title, width = '520px', component, props } = options
  const mountId = `trans-mount-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  let cleanup: (() => void) | null = null
  let destroyed = false
  const dialog = new Dialog({
    title,
    content: `<div id="${mountId}" class="trans-dialog-mount"></div>`,
    width,
    destroyCallback: () => {
      destroyed = true
      cleanup?.()
    },
  })
  const findMount = (): HTMLElement | null => {
    return (
      document.getElementById(mountId)
      || (dialog.element?.querySelector(`#${mountId}`) as HTMLElement | null)
    )
  }
  const tryMount = (): boolean => {
    if (destroyed) {
      return true
    }
    const mount = findMount()
    if (!mount) {
      return false
    }
    cleanup = mountInto(mount, component, { ...props, dialog })
    return true
  }
  // 先同步尝试;思源可能异步插入 content,失败则按帧重试
  if (!tryMount()) {
    let tries = 0
    const retry = () => {
      if (destroyed) {
        return
      }
      if (tryMount()) {
        return
      }
      if (++tries < 30) {
        requestAnimationFrame(retry)
      } else {
        console.warn('[siyuan-trans] mount point not found after retries')
      }
    }
    requestAnimationFrame(retry)
  }
  return dialog
}

/** 打开翻译对话框
 *  - docId 非空:直接翻译该文档(翻译当前页面)
 *  - allowInput:展示输入框(翻译指定页面) */
export async function openTranslateDialog(options: {
  docId?: string | null
  allowInput?: boolean
} = {}): Promise<void> {
  // 预校验配置(按引擎检查对应的 API Key)
  const cfg = await loadConfig(usePlugin())
  const key = cfg.engine === 'llm' ? cfg.llm_api_key : cfg.api_key
  if (!key) {
    showMessage('请先在设置中配置 API Key', 4000, 'error')
    return
  }
  openMountedDialog({
    title: '翻译文档',
    width: '520px',
    component: TranslateDialog as unknown as Component,
    props: {
      docId: options.docId ?? null,
      allowInput: options.allowInput ?? false,
    },
  })
}

/** 打开设置面板(单列全宽布局) */
export function openSettingDialog(): void {
  openMountedDialog({
    title: '翻译配置 · DashScope qwen-mt',
    width: '720px',
    component: SettingPanel as unknown as Component,
    props: {},
  })
}

/** 取当前配置(供 index.ts 做前置校验) */
export async function getCurrentConfig(): Promise<TransConfig | null> {
  try {
    return await loadConfig(usePlugin())
  } catch {
    return null
  }
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
