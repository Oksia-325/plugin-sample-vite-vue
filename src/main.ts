import type { Plugin } from 'siyuan'
import type { App as VueApp } from 'vue'
import { createApp } from 'vue'
import App from './App.vue'

interface PanelInstance {
  app: VueApp
  host: HTMLElement
}

const panels = new Map<Element, PanelInstance>()

export function mountPanel(element: HTMLElement, plugin: Plugin): void {
  if (panels.has(element)) {
    return
  }

  const host = document.createElement('div')
  host.className = 'pigo-tab-host'
  element.appendChild(host)

  const app = createApp(App, { plugin })
  app.mount(host)

  panels.set(element, { app, host })
}

export function unmountPanel(element: Element): void {
  const panel = panels.get(element)
  if (!panel) {
    return
  }

  panel.app.unmount()
  panel.host.remove()
  panels.delete(element)
}

export function unmountAllPanels(): void {
  for (const element of [...panels.keys()]) {
    unmountPanel(element)
  }
}
