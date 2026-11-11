import type { Plugin } from "siyuan"
import type {
  DownloadFormat,
  LastSyncResults,
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

function normalizeTimestamp(value: unknown): number {
  const num = Math.floor(Number(value))
  return Number.isFinite(num) && num > 0 ? num : 0
}

function normalizeCount(value: unknown): number {
  const num = Math.floor(Number(value))
  return Number.isFinite(num) && num > 0 ? num : 0
}

function normalizeResults(value: unknown): LastSyncResults {
  if (!value || typeof value !== "object") {
    return {}
  }
  const results: LastSyncResults = {}
  for (const [collectionId, raw] of Object.entries(value as Record<string, any>)) {
    if (!raw || typeof raw !== "object" || !collectionId) {
      continue
    }
    results[collectionId] = {
      status: raw.status === "error" ? "error" : "done",
      downloaded: normalizeCount(raw.downloaded),
      failed: normalizeCount(raw.failed),
      remoteTotal: normalizeCount(raw.remoteTotal),
      localTotal: normalizeCount(raw.localTotal),
      error: typeof raw.error === "string" && raw.error ? raw.error : undefined,
      at: normalizeTimestamp(raw.at),
    }
  }
  return results
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
    merged.lastSyncAt = normalizeTimestamp(merged.lastSyncAt)
    merged.lastSyncFailed = normalizeCount(merged.lastSyncFailed)
    merged.lastSyncResults = normalizeResults(merged.lastSyncResults)
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
      lastSyncAt: normalizeTimestamp(settings.lastSyncAt),
      lastSyncFailed: normalizeCount(settings.lastSyncFailed),
      lastSyncResults: normalizeResults(settings.lastSyncResults),
    }
    this.cache = normalized
    this.loaded = true
    await this.plugin.saveData(SETTINGS_FILE, normalized)
  }

  async saveLastSync(at: number, failed: number, results: LastSyncResults): Promise<void> {
    const current = this.cache ?? { ...DEFAULT_SETTINGS }
    const next: PluginSettings = {
      ...current,
      lastSyncAt: normalizeTimestamp(at),
      lastSyncFailed: normalizeCount(failed),
      lastSyncResults: normalizeResults(results),
    }
    this.cache = next
    this.loaded = true
    await this.plugin.saveData(SETTINGS_FILE, next)
  }
}
