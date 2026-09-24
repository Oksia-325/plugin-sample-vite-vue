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
}

export interface SyncResult {
  collectionName: string
  collectionId: string
  remoteTotal: number
  localTotal: number
  downloaded: number
  skipped: number
  failed: number
  deletedRemote: number
  error?: string
}

export const DEFAULT_SETTINGS: PluginSettings = {
  authorization: "",
  downloadSize: 512,
  downloadFormat: "png",
  maxConcurrentDownloads: 4,
}

export const IGNORED_COLLECTIONS = new Set(["Favorites", "Downloaded"])

export const EMOJI_DIR = "/emojis"
