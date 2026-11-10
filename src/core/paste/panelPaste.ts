interface ElementLike {
  closest?: (selector: string) => unknown
}

export const PIGO_PANEL_SELECTOR = '.pigo-popup'

/**
 * 判断某个节点是否位于 Pigo 弹窗内部（面板内的粘贴不应被文档粘贴逻辑接管）。
 */
export function isPigoPanelElement(node: unknown): boolean {
  const element = node as ElementLike | null | undefined
  if (!element || typeof element.closest !== 'function') {
    return false
  }

  try {
    return Boolean(element.closest(PIGO_PANEL_SELECTOR))
  }
  catch {
    return false
  }
}

export function isPigoPanelPaste(target: EventTarget | null, activeElement: Element | null): boolean {
  return isPigoPanelElement(target) || isPigoPanelElement(activeElement)
}

export function isPigoPanelFocused(): boolean {
  if (typeof document === 'undefined') {
    return false
  }
  return isPigoPanelElement(document.activeElement)
}
