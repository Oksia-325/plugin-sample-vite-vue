import type { Plugin } from 'siyuan'

let statusElement: HTMLElement | null = null

export function initStatusBar(plugin: Plugin): HTMLElement {
  if (statusElement) {
    return statusElement
  }

  const element = document.createElement('div')
  element.className = 'pigo-status-bar'
  element.textContent = 'Pigo'
  element.title = 'Pigo 图床'

  plugin.addStatusBar({
    element,
    position: 'right',
  })

  statusElement = element
  return element
}

export function updateStatusBar(message: string): void {
  if (!statusElement) {
    return
  }

  const text = (message || '').trim()
  statusElement.textContent = text ? `Pigo · ${text}` : 'Pigo'
  statusElement.title = text || 'Pigo 图床'
}

export function disposeStatusBar(): void {
  statusElement = null
}
