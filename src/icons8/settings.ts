import type { Plugin } from "siyuan"
import type {
  DownloadFormat,
  PluginSettings,
} from "./types"
import { DEFAULT_SETTINGS } from "./types"

const SETTINGS_FILE = "settings.json"
const MIN_CONCURRENCY = 1
const MAX_CONCURRENCY = 8

export function stripBearer(token: string): string {
  const trimmed = (token ?? "").trim()
  return trimmed.startsWith("Bearer ") ? trimmed.slice("Bearer ".length).trim() : trimmed
}

function clampConcurrency(value: unknown): number {
  const num = Math.floor(Number(value))
  if (!Number.isFinite(num)) return DEFAULT_SETTINGS.maxConcurrentDownloads
  return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, num))
}

export class SettingsManager {
  private cache: PluginSettings | null = null
  private loaded = false

  constructor(private plugin: Plugin) {}

  async load(): Promise<PluginSettings> {
    if (this.loaded && this.cache) {
      return this.cache
    }
    const stored = (await this.plugin.loadData(SETTINGS_FILE)) as Partial<PluginSettings> | null
    const merged: PluginSettings = {
      ...DEFAULT_SETTINGS,
      ...(stored ?? {}),
    }
    merged.authorization = stripBearer(merged.authorization)
    merged.downloadFormat = (merged.downloadFormat === "svg" ? "svg" : "png") as DownloadFormat
    merged.downloadSize = Number(merged.downloadSize) || DEFAULT_SETTINGS.downloadSize
    merged.maxConcurrentDownloads = clampConcurrency(merged.maxConcurrentDownloads)
    this.cache = merged
    this.loaded = true
    return merged
  }

  get(): PluginSettings {
    return this.cache ?? DEFAULT_SETTINGS
  }

  isConfigured(): boolean {
    return !!this.cache?.authorization
  }

  async save(settings: PluginSettings): Promise<void> {
    const normalized: PluginSettings = {
      authorization: stripBearer(settings.authorization),
      downloadFormat: settings.downloadFormat === "svg" ? "svg" : "png",
      downloadSize: Number(settings.downloadSize) || DEFAULT_SETTINGS.downloadSize,
      maxConcurrentDownloads: clampConcurrency(settings.maxConcurrentDownloads),
    }
    this.cache = normalized
    this.loaded = true
    await this.plugin.saveData(SETTINGS_FILE, normalized)
  }
}
