import { getAllEditor } from 'siyuan'
import type { IProtyle, Plugin } from 'siyuan'

export interface ActiveDocChange {
  docId: string
}

/**
 * 获取当前正在阅读/编辑的文档 ID。
 *
 * 优先使用思源内核提供的 getAllEditor()，避免旧插件用 querySelector
 * 在多标签页/分屏时选错隐藏编辑器。
 */
export function getActiveDocId(): string {
  try {
    const editors = getAllEditor() as unknown as IProtyle[]
    const visibleEditors = editors.filter((editor) => {
      const element = editor?.element
      return Boolean(
        element
        && element.offsetParent !== null
        && !element.classList.contains('fn__none')
      )
    })

    const activeEditor = visibleEditors.find((editor) => {
      return Boolean(editor?.element && editor.element.contains(document.activeElement))
    }) ?? visibleEditors[0]

    const docId = activeEditor?.block?.rootID
    if (docId) {
      return docId
    }
  }
  catch {
    // Fall through to DOM fallback.
  }

  const titleElement = document.querySelector('div.protyle:not(.fn__none) div.protyle-title') as HTMLElement | null
  return titleElement?.getAttribute('data-node-id') ?? ''
}

/**
 * 监听文档切换。
 *
 * 返回取消订阅函数。只监听 switch-protyle / loaded-protyle-static，
 * 不监听 ws-main，避免编辑过程中高频重扫。
 */
export function subscribeActiveDoc(
  plugin: Plugin,
  callback: (change: ActiveDocChange) => void
): () => void {
  const handler = (event: CustomEvent<any>) => {
    const protyle = event.detail?.protyle
    const docId = protyle?.block?.rootID || getActiveDocId()
    if (docId) {
      callback({ docId })
    }
  }

  plugin.eventBus.on('switch-protyle', handler)
  plugin.eventBus.on('loaded-protyle-static', handler)

  return () => {
    plugin.eventBus.off('switch-protyle', handler)
    plugin.eventBus.off('loaded-protyle-static', handler)
  }
}
