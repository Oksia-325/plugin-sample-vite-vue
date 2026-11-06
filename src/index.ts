import { getFrontend, Plugin } from 'siyuan'
import PluginInfoString from '@/../plugin.json'
import { destroyPopup, initPopup } from '@/main'
import { showPigoPopup, togglePigoPopup } from '@/core/uiStore'
import '@/index.scss'

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

    console.log('Pigo plugin loaded, the plugin is ', this)
  }

  onunload() {
    destroyPopup()
  }

  openSetting() {
    showPigoPopup('settings')
  }
}
