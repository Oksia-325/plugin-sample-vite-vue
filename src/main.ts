import type { Plugin } from 'siyuan'
import type { App as VueApp } from 'vue'
import { createApp } from 'vue'
import App from './App.vue'

let app: VueApp | null = null
let container: HTMLElement | null = null

export function initPopup(plugin: Plugin): void {
  if (container) {
    return
  }

  container = document.createElement('div')
  container.id = `${plugin.name}-app`
  container.className = 'siyuan-plugin-pigo-app'

  app = createApp(App, { plugin })
  app.mount(container)
  document.body.appendChild(container)
}

export function destroyPopup(): void {
  app?.unmount()
  app = null

  container?.remove()
  container = null
}
