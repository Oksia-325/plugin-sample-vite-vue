import '@/index.scss'
import { confirm, getFrontend, Plugin } from 'siyuan'
import PluginInfoString from '@/../plugin.json'
import { destroyPopup, initPopup } from '@/main'
import { pushErrMsg, pushMsg } from '@/api'
import { ensureConfigLoaded, ensureConfigReady, isConfigReady, usePigoConfigStore } from '@/core/configStore'
import { toUserMessage } from '@/core/errors'
import { logDebug, logError, logInfo, logWarn } from '@/core/log'
import { createParsedImage } from '@/core/scan/parser'
import { PasteEventAdapter } from '@/core/paste/PasteEventAdapter'
import { isPigoPanelFocused } from '@/core/paste/panelPaste'
import { executePasteUpload } from '@/core/paste/PasteUploadTransaction'
import { uploadSingleRef } from '@/core/upload/pipeline'
import { disposeStatusBar, initStatusBar, updateStatusBar } from '@/core/statusBar'
import type { ImageRef } from '@/core/scan/types'
import { showPigoPopup, togglePigoPopup } from '@/core/uiStore'

let PluginInfo = {
  version: '',
}
try {
  PluginInfo = PluginInfoString
}
catch (err) {
  console.log('Plugin info parse error: ', err)
}
const { version } = PluginInfo

const PIGO_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"><path d="M448 80c8.8 0 16 7.2 16 16V415.8l-5-6.5-136-176c-4.5-5.9-11.6-9.3-19-9.3s-14.4 3.4-19 9.3L202 340.7l-30.5-42.7C167 291.7 159.8 288 152 288s-15 3.7-19.5 10.1l-80 112L48 416.3l0-.3V96c0-8.8 7.2-16 16-16H448zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm80 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>'

export default class PigoPlugin extends Plugin {
  // Run as mobile
  public isMobile: boolean
  // Run in browser
  public isBrowser: boolean
  // Run as local
  public isLocal: boolean
  // Run in Electron
  public isElectron: boolean
  // Run in window
  public isInWindow: boolean
  public platform: SyFrontendTypes
  public readonly version = version

  private readonly pasteEventAdapter = new PasteEventAdapter()
  private eventsBound = false

  async onload() {
    const frontEnd = getFrontend()
    this.platform = frontEnd as SyFrontendTypes
    this.isMobile = frontEnd === 'mobile' || frontEnd === 'browser-mobile'
    this.isBrowser = frontEnd.includes('browser')
    this.isLocal = location.href.includes('127.0.0.1') || location.href.includes('localhost')
    this.isInWindow = location.href.includes('window.html')

    try {
      require('@electron/remote').require('@electron/remote/main')
      this.isElectron = true
    }
    catch (err) {
      this.isElectron = false
    }

    initPopup(this)
    initStatusBar(this)

    this.addTopBar({
      icon: PIGO_ICON,
      title: this.i18n?.addTopBarIcon ?? 'Pigo 图床',
      position: 'right',
      callback: () => {
        togglePigoPopup('upload')
      },
    })

    this.addCommand({
      langKey: 'openPigo',
      langText: '打开 Pigo 图床',
      hotkey: '',
      callback: () => {
        showPigoPopup('upload')
      },
    })

    logInfo(`Pigo 插件已加载：${this.platform}`)
  }

  onLayoutReady() {
    void this.setupEvents()
  }

  onunload() {
    this.offEvents()
    disposeStatusBar()
    destroyPopup()
    logInfo('Pigo 插件已卸载')
  }

  openSetting() {
    showPigoPopup('settings')
  }

  private async setupEvents() {
    if (this.eventsBound) {
      return
    }

    await ensureConfigLoaded(this)

    this.eventBus.on('paste', this.picturePasteEventListener)
    this.eventBus.on('open-menu-image', this.pictureBlockEventListener)
    this.eventsBound = true
    updateStatusBar('就绪')
    logInfo('粘贴与图片右键菜单事件已注册')
  }

  private offEvents() {
    if (!this.eventsBound) {
      return
    }

    this.eventBus.off('paste', this.picturePasteEventListener)
    this.eventBus.off('open-menu-image', this.pictureBlockEventListener)
    this.eventsBound = false
  }

  private readonly picturePasteEventListener = async (event: CustomEvent<any>) => {
    // 焦点在 Pigo 面板内：交给面板自己的「快速添加图片」处理，不接管文档粘贴。
    if (isPigoPanelFocused()) {
      logDebug('粘贴未接管：焦点位于 Pigo 面板')
      return
    }

    if (!isConfigReady()) {
      logWarn('粘贴未接管：S3 配置尚未完成')
      void pushErrMsg('Pigo 尚未完成 S3 配置，已使用思源默认粘贴。请到 Pigo 设置页补全配置。', 5000).catch(() => undefined)
      return
    }

    const store = usePigoConfigStore()
    const takeover = this.pasteEventAdapter.tryTakeover(event, {
      autoUploadOnPaste: store.config.behavior.autoUploadOnPaste,
      allowPicAndText: store.config.behavior.allowPicAndText,
    })

    if (!takeover.taken || !takeover.snapshot) {
      logDebug(`粘贴未接管：${takeover.reason || 'unknown'}`)
      if (takeover.reason === 'default-prevention-unavailable') {
        await pushErrMsg('当前思源粘贴事件不支持默认行为阻断，已取消 Pigo 自动接管，避免双上传。', 7000)
      }
      return
    }

    const snapshot = takeover.snapshot
    updateStatusBar(`正在上传 ${snapshot.files.length} 张粘贴图片…`)
    logInfo(`粘贴接管：${snapshot.files.length} 张图片，目标文档 ${snapshot.pageId}`)

    await executePasteUpload(snapshot, store.config, {
      notifyInfo: (message) => {
        void pushMsg(message, 3000).catch(() => undefined)
        updateStatusBar(message)
      },
      notifySuccess: (message) => {
        void pushMsg(message, 3000).catch(() => undefined)
        updateStatusBar(message)
      },
      notifyError: (message) => {
        void pushErrMsg(message, 7000).catch(() => undefined)
        updateStatusBar(message)
        logError('粘贴上传失败', message)
      },
      onStatus: (message) => {
        updateStatusBar(message)
      },
    })
  }

  private readonly pictureBlockEventListener = (event: CustomEvent<any>) => {
    const detail = event.detail
    const menus = detail?.menu?.menus
    if (!menus) {
      return
    }

    const img = findImageElement(detail.element)
    const src = img?.getAttribute('src') || ''
    if (!img || !src) {
      return
    }

    const pageId = detail?.protyle?.block?.rootID || detail?.protyle?.block?.id || ''
    if (!pageId) {
      return
    }

    const blockId = (img.closest('[data-node-id]') as HTMLElement | null)?.dataset.nodeId || pageId
    const alt = img.getAttribute('alt') || ''
    const title = img.getAttribute('title') || ''
    const store = usePigoConfigStore()
    const parsed = createParsedImage(src, alt, title, 'markdown', store.config.s3)
    const ref: ImageRef = {
      ...parsed,
      id: `menu:${blockId}:${Date.now()}`,
      blockId,
      docId: pageId,
      docTitle: '',
      docPath: '',
      occurrence: 0,
    }
    const isRemote = /^https?:\/\//i.test(src) || parsed.sourceType === 's3'
    const label = parsed.sourceType === 's3'
      ? '重新上传至 Pigo 图床'
      : isRemote
        ? '上传至 Pigo 图床（网络图片）'
        : '上传至 Pigo 图床'

    menus.push({
      iconHTML: `<span class="pigo-menu-icon">${PIGO_ICON}</span>`,
      label,
      click: async () => {
        const ready = await ensureConfigReady(this)
        if (!ready.ok) {
          const message = ready.issues.map((issue) => issue.message).join('；')
          await pushErrMsg(`请先完成 Pigo 配置：${message}`, 7000)
          showPigoPopup('settings')
          return
        }

        if (isRemote) {
          const confirmed = await confirmDialog(
            '温馨提示',
            parsed.sourceType === 's3'
              ? '这张图片已经上传到 S3，是否重新上传？'
              : '这张图片已经是网络图片，是否下载并上传到 Pigo 图床？'
          )
          if (!confirmed) {
            return
          }
        }

        updateStatusBar('正在上传所选图片…')
        logInfo(`右键上传图片：${ref.url}`)
        try {
          const result = await uploadSingleRef(ref, store.config, { force: isRemote })
          if (result.replace.notReplaced > 0) {
            await pushErrMsg('图片已上传，但文档链接未替换，请到 Pigo 上传页使用“修复未替换链接”。', 7000)
            updateStatusBar('图片已上传，链接未替换')
          }
          else if (result.upload.failed > 0) {
            await pushErrMsg('图片上传失败，请查看控制台或 Pigo 上传页。', 7000)
            updateStatusBar('图片上传失败')
          }
          else {
            await pushMsg('🎉图片上传成功', 3000)
            updateStatusBar('图片上传成功')
          }
        }
        catch (error) {
          const message = toUserMessage(error)
          logError('右键上传图片失败', error)
          await pushErrMsg(`图片上传失败：${message}`, 7000)
          updateStatusBar('图片上传失败')
        }
      },
    })
  }
}

function findImageElement(element: Element | null | undefined): HTMLImageElement | null {
  if (!element) {
    return null
  }
  if (element.tagName === 'IMG') {
    return element as HTMLImageElement
  }
  return element.querySelector('img')
}

function confirmDialog(title: string, text: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirm(title, text, () => resolve(true), () => resolve(false))
  })
}
