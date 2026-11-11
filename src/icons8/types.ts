export interface IconInfo {
  id: string
  name: string
  platform: string
  formats: string[]
}

export interface CollectionInfo {
  id: string
  apiCode: string
  name: string
  totalIcons: number
}

export interface IconManifestEntry {
  iconId: string
  collectionId: string
  collectionName: string
  iconName: string
  localFilename: string
  downloadTime: string
}

export type ManifestData = Record<string, IconManifestEntry>

export type DownloadFormat = "png" | "svg"

export interface PluginSettings {
  authorization: string
  downloadSize: number
  downloadFormat: DownloadFormat
  maxConcurrentDownloads: number
  lastSyncAt: number
  lastSyncFailed: number
}

export type CollectionStatus = "pending" | "syncing" | "done" | "error"

export interface CollectionOverview {
  id: string
  apiCode: string
  name: string
  remoteTotal: number
  localTotal: number
  pendingTotal: number
  status: CollectionStatus
}

export interface SyncOverviewTotals {
  collections: number
  local: number
  remote: number
  pending: number
  failed: number
}

export interface SyncOverview {
  collections: CollectionOverview[]
  totals: SyncOverviewTotals
  lastSyncAt: number
  loadedAt: number
}

export interface SyncResult {
  collectionName: string
  collectionId: string
  remoteTotal: number
  localTotal: number
  downloaded: number
  skipped: number
  failed: number
  error?: string
}

export const DEFAULT_SETTINGS: PluginSettings = {
  authorization: "",
  downloadSize: 512,
  downloadFormat: "png",
  maxConcurrentDownloads: 4,
  lastSyncAt: 0,
  lastSyncFailed: 0,
}

export const IGNORED_COLLECTIONS = new Set(["Favorites", "Downloaded"])

export const EMOJI_DIR = "/emojis"
