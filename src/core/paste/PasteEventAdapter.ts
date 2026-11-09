export interface PasteTakeoverConfig {
  autoUploadOnPaste: boolean
  allowPicAndText: boolean
}

export interface PasteInputSnapshot {
  pageId: string
  targetBlockId: string
  files: File[]
  textHTML: string
  textPlain: string
  siyuanHTML: string
  preventedBy: string[]
}

export interface PasteTakeoverResult {
  taken: boolean
  reason?: string
  snapshot?: PasteInputSnapshot
}

class EmptyFilesLike {
  public readonly length = 0

  public item(): File | null {
    return null
  }

  public [Symbol.iterator](): IterableIterator<File> {
    return [][Symbol.iterator]()
  }
}

/**
 * 思源粘贴事件适配器。
 *
 * 接管决策必须保持同步：在调用 preventDefault / resolve 空载荷之前不跨 await，
 * 避免思源默认上传流程与 Pigo 上传同时发生。
 */
export class PasteEventAdapter {
  public tryTakeover(event: any, config: PasteTakeoverConfig): PasteTakeoverResult {
    const detail = event?.detail ?? {}
    const pageId = detail?.protyle?.block?.rootID ?? detail?.protyle?.block?.id ?? ''
    if (!pageId) {
      return { taken: false, reason: 'missing-page-id' }
    }

    const files = this.normalizeFiles(detail.files)
    if (files.length === 0) {
      return { taken: false, reason: 'no-image-files' }
    }

    if (!config.autoUploadOnPaste) {
      return { taken: false, reason: 'auto-upload-disabled' }
    }

    const textHTML = detail.textHTML ?? ''
    const textPlain = detail.textPlain ?? ''
    const siyuanHTML = detail.siyuanHTML ?? ''
    const hasPicAndText = siyuanHTML.trim() !== '' || textHTML.trim() !== '' || textPlain.trim() !== ''

    if (hasPicAndText && !config.allowPicAndText) {
      return { taken: false, reason: 'pic-and-text-disabled' }
    }

    if (!this.canBlockHostPaste(detail, event)) {
      return { taken: false, reason: 'default-prevention-unavailable' }
    }

    return {
      taken: true,
      snapshot: {
        pageId,
        targetBlockId: this.findCurrentBlockId() || pageId,
        files,
        textHTML,
        textPlain,
        siyuanHTML,
        preventedBy: this.preventHostPaste(detail, event),
      },
    }
  }

  private normalizeFiles(filesLike: any): File[] {
    if (!filesLike || typeof filesLike.length !== 'number') {
      return []
    }

    const files: File[] = []
    for (let index = 0; index < filesLike.length; index++) {
      const item = filesLike[index]
      const file = typeof item?.getAsFile === 'function' ? item.getAsFile() : item
      if (file && typeof file.arrayBuffer === 'function') {
        files.push(file as File)
      }
    }
    return files
  }

  private canBlockHostPaste(detail: any, event: any): boolean {
    return (
      typeof detail?.resolve === 'function'
      || typeof detail?.source?.preventDefault === 'function'
      || typeof event?.preventDefault === 'function'
    )
  }

  private preventHostPaste(detail: any, event: any): string[] {
    const preventedBy: string[] = []

    if (typeof event?.preventDefault === 'function') {
      event.preventDefault()
      preventedBy.push('plugin-custom-event.preventDefault')
    }

    if (typeof detail?.source?.preventDefault === 'function') {
      detail.source.preventDefault()
      preventedBy.push('detail.source.preventDefault')
    }

    if (typeof detail?.resolve === 'function') {
      detail.resolve({
        textHTML: '',
        textPlain: '',
        siyuanHTML: '',
        files: new EmptyFilesLike(),
      })
      preventedBy.push('detail.resolve(empty-paste-payload)')
    }

    return preventedBy
  }

  private findCurrentBlockId(): string {
    if (typeof window === 'undefined' || typeof window.getSelection !== 'function') {
      return ''
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return ''
    }

    let node: Node | null = selection.getRangeAt(0).startContainer
    while (node) {
      if (node.nodeType === 1) {
        const element = node as HTMLElement
        const nodeId = element.getAttribute('data-node-id')
        if (nodeId) {
          return nodeId
        }
      }
      node = node.parentNode
    }

    return ''
  }
}
