import {
  Plugin,
  getAllEditor,
  getFrontend,
  showMessage,
} from 'siyuan'
import '@/index.scss'
import '@/styles/design.scss'
import PluginInfoString from '@/../plugin.json'
import PluginTopBarIcon from '@/assets/fy1.svg?raw'
import { destroy, init, openSettingDialog, openTranslateDialog, usePlugin } from '@/main'
import { loadConfig } from '@/trans/config'
import { closeWorkbench, workbenchOpen } from '@/store/workbench'

let PluginInfo = {
  version: '',
}
try {
  PluginInfo = PluginInfoString
} catch (err) {
  console.log('Plugin info parse error: ', err)
}
const {
  version,
} = PluginInfo

/** 当前激活的文档 rootID(由 switch-protyle 跟踪) */
let currentRootId: string | null = null

/** 取当前激活的文档 rootID */
function getCurrentDocId(): string | null {
  if (currentRootId) {
    return currentRootId
  }
  // 兜底:从所有打开的编辑器中取一个可见的
  try {
    const editors = getAllEditor()
    for (const ed of editors) {
      const id = (ed as any)?.block?.rootID
      if (id) {
        return id
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export default class SiYuanTransPlugin extends Plugin {
  public isMobile: boolean
  public isBrowser: boolean
  public isLocal: boolean
  public isElectron: boolean
  public isInWindow: boolean
  public platform: SyFrontendTypes
  public readonly version = version

  async onload() {
    const frontEnd = getFrontend()
    this.platform = frontEnd as SyFrontendTypes
    this.isMobile = frontEnd === 'mobile' || frontEnd === 'browser-mobile'
    this.isBrowser = frontEnd.includes('browser')
    this.isLocal
      = location.href.includes('127.0.0.1')
      || location.href.includes('localhost')
    this.isInWindow = location.href.includes('window.html')

    try {
      require('@electron/remote')
        .require('@electron/remote/main')
      this.isElectron = true
    } catch {
      this.isElectron = false
    }

    console.log('SiYuan Trans plugin loaded', this)

    init(this)
    // 预热配置
    void loadConfig(this)

    // 顶栏图标:直接打开翻译工作台(再次点击则关闭)
    this.addTopBar({
      icon: PluginTopBarIcon,
      title: this.i18n.translate || '翻译',
      callback: () => {
        if (workbenchOpen.value) {
          closeWorkbench()
          return
        }
        const id = getCurrentDocId()
        void openTranslateDialog(id ? { docId: id } : {})
      },
    })

    // 快捷键:翻译当前页面(焦点在编辑器时)
    this.addCommand({
      langKey: 'translateCurrent',
      langText: '翻译当前页面',
      hotkey: '⌥⇧⌘T',
      editorCallback: (protyle) => {
        const id = protyle?.block?.rootID
        if (id) {
          openTranslateDialog({ docId: id })
        } else {
          showMessage('未找到当前文档', 3000, 'error')
        }
      },
    })

    // 跟踪当前激活文档
    this.eventBus.on('switch-protyle', (e) => {
      const id = e.detail.protyle?.block?.rootID
      if (id) {
        currentRootId = id
      }
    })

    // 编辑器右键菜单:翻译此文档
    this.eventBus.on('open-menu-content', (e) => {
      const detail = e.detail as any
      const id = detail?.protyle?.block?.rootID
      detail?.menu?.addItem({
        icon: 'iconLanguage',
        label: '翻译此文档',
        click: () => {
          if (id) {
            openTranslateDialog({ docId: id })
          }
        },
      })
    })

    // 文档树右键菜单:翻译指定文档
    this.eventBus.on('open-menu-doctree', (e) => {
      const detail = e.detail as any
      const elements = detail?.elements as NodeListOf<HTMLElement>
      if (!elements || elements.length === 0) {
        return
      }
      const el = elements[0]
      const id = el?.getAttribute('data-node-id') || el?.dataset?.nodeId
      detail?.menu?.addItem({
        icon: 'iconLanguage',
        label: '翻译此文档',
        click: () => {
          if (id) {
            openTranslateDialog({ docId: id })
          }
        },
      })
    })
  }

  onunload() {
    destroy()
  }

  openSetting() {
    usePlugin(this)
    // 打开工作台的「插件设置」页签
    openSettingDialog()
  }
}
