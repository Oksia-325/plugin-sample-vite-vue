import type { Plugin } from 'siyuan'
import type { App as VueApp } from 'vue'
import { createApp } from 'vue'
import App from './App.vue'

let plugin: Plugin | null = null
let app: VueApp | null = null
let container: HTMLElement | null = null

export function usePlugin(pluginProps?: Plugin): Plugin {
  if (pluginProps) {
    plugin = pluginProps
  }
  if (!plugin) {
    console.error('need bind plugin')
  }
  return plugin as Plugin
}

export function init(pluginInstance: Plugin) {
  usePlugin(pluginInstance)

  if (container) {
    return
  }

  container = document.createElement('div')
  container.id = `${pluginInstance.name}-app`
  container.className = 'siyuan-plugin-pigo-app'
  container.style.display = 'none'

  app = createApp(App, {
    onClose: () => {
      togglePanel(false)
    },
  })
  app.mount(container)
  document.body.appendChild(container)
}

export function togglePanel(force?: boolean): boolean {
  if (!container) {
    return false
  }

  const visible = typeof force === 'boolean'
    ? force
    : container.style.display === 'none'

  container.style.display = visible ? 'block' : 'none'
  return visible
}

export function destroy() {
  app?.unmount()
  app = null

  container?.remove()
  container = null

  plugin = null
}
