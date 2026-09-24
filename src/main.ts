import {
  Plugin,
} from "siyuan"
import { createApp } from 'vue'
import App from './App.vue'

let plugin: Plugin | null = null
export function usePlugin(pluginProps?: Plugin): Plugin {
  if (pluginProps) {
    plugin = pluginProps
  }
  if (!plugin && !pluginProps) {
    console.error('need bind plugin')
  }
  return plugin!
}


let app: any = null
export function init(currentPlugin: Plugin) {
  // bind plugin hook
  usePlugin(currentPlugin)

  const div = document.createElement('div')
  div.classList.add('icon8-sync-app')
  div.id = currentPlugin.name
  app = createApp(App)
  app.mount(div)
  document.body.appendChild(div)
}

export function destroy() {
  app?.unmount()
  const div = document.getElementById(plugin?.name ?? 'icon8-sync')
  div?.remove()
}
