import {
  getFrontend,
  Plugin,
} from "siyuan"
import PluginInfoString from '@/../plugin.json'
import { getContext } from '@/icons8/context'
import {
  destroy,
  init,
} from '@/main'
import "@/index.scss"

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

export default class Icon8SyncPlugin extends Plugin {
  // Run as mobile
  public isMobile: boolean
  public platform: SyFrontendTypes
  public readonly version = version

  async onload() {
    const frontEnd = getFrontend()
    this.platform = frontEnd as SyFrontendTypes
    this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile"

    // preload settings & manifest (idempotent, non-blocking)
    const context = getContext(this)
    context.settings.load().catch((err) => console.error('[Icon8Sync] load settings failed:', err))
    context.manifest.load().catch((err) => console.error('[Icon8Sync] load manifest failed:', err))

    init(this)
  }

  onunload() {
    destroy()
  }

  openSetting() {
    window._sy_icon8sync?.openSetting()
  }
}
