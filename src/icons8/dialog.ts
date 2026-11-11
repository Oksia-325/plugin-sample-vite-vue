import type { Plugin } from "siyuan"
import type { App as VueApp } from "vue"
import { Dialog } from "siyuan"
import { createApp } from "vue"
import Icon8SyncDialog from "@/components/Icon8SyncDialog.vue"

let activeApp: VueApp | null = null
let activeDialog: Dialog | null = null

export function openSyncDialog(plugin: Plugin, initialTab: "sync" | "settings" = "sync") {
  closeSyncDialog()
  const title = (plugin.i18n?.dialogTitle as string) ?? "Icon8Sync"
  activeDialog = new Dialog({
    title,
    content: '<div id="icon8-sync-dialog-root"></div>',
    width: "860px",
    height: "min(860px, calc(100vh - 80px))",
    destroyCallback: () => {
      activeApp?.unmount()
      activeApp = null
      activeDialog = null
    },
  })
  activeDialog.element.classList.add("icon8-sync-plugin-dialog")
  const root = activeDialog.element.querySelector("#icon8-sync-dialog-root") as HTMLElement
  if (!root) {
    return
  }
  activeApp = createApp(Icon8SyncDialog, { initialTab })
  activeApp.mount(root)
}

export function closeSyncDialog() {
  activeDialog?.destroy()
  activeApp?.unmount()
  activeApp = null
  activeDialog = null
}
