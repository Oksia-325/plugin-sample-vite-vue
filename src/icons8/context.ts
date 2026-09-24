import type { Plugin } from "siyuan"
import { ManifestManager } from "./manifest"
import { SettingsManager } from "./settings"

export interface Icon8Context {
  settings: SettingsManager
  manifest: ManifestManager
}

let context: Icon8Context | null = null

export function getContext(plugin: Plugin): Icon8Context {
  if (!context) {
    context = {
      settings: new SettingsManager(plugin),
      manifest: new ManifestManager(plugin),
    }
  }
  return context
}
