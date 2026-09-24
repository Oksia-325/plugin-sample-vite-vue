import type { Plugin } from "siyuan"
import type {
  IconManifestEntry,
  ManifestData,
} from "./types"

const MANIFEST_FILE = "manifest.json"

function entryKey(collectionId: string, iconId: string): string {
  return `${collectionId}:${iconId}`
}

export class ManifestManager {
  private entries: ManifestData = {}
  private loaded = false

  constructor(private plugin: Plugin) {}

  async load(): Promise<void> {
    if (this.loaded) {
      return
    }
    const stored = (await this.plugin.loadData(MANIFEST_FILE)) as ManifestData | null
    if (stored && typeof stored === "object") {
      for (const raw of Object.values(stored)) {
        if (!raw || typeof raw !== "object") {
          continue
        }
        const iconId = String(raw.iconId ?? "")
        const collectionId = String(raw.collectionId ?? "")
        if (!iconId || !collectionId) {
          continue
        }
        // 复合键 collectionId:iconId：兼容旧版以 iconId 为键的清单，自动迁移
        this.entries[entryKey(collectionId, iconId)] = {
          iconId,
          collectionId,
          collectionName: String(raw.collectionName ?? ""),
          iconName: String(raw.iconName ?? ""),
          localFilename: String(raw.localFilename ?? ""),
          downloadTime: String(raw.downloadTime ?? ""),
        }
      }
    }
    this.loaded = true
  }

  async save(): Promise<void> {
    await this.plugin.saveData(MANIFEST_FILE, this.entries)
  }

  getEntry(collectionId: string, iconId: string): IconManifestEntry | undefined {
    return this.entries[entryKey(collectionId, iconId)]
  }

  addEntry(
    iconId: string,
    collectionId: string,
    collectionName: string,
    iconName: string,
    localFilename: string,
  ): void {
    this.entries[entryKey(collectionId, iconId)] = {
      iconId,
      collectionId,
      collectionName,
      iconName,
      localFilename,
      downloadTime: new Date().toISOString(),
    }
  }

  getCollectionEntries(collectionId: string): IconManifestEntry[] {
    return Object.values(this.entries).filter((entry) => entry.collectionId === collectionId)
  }

  getCollectionFilenames(collectionId: string): Set<string> {
    return new Set(this.getCollectionEntries(collectionId).map((entry) => entry.localFilename))
  }

  generateUniqueFilename(
    collectionId: string,
    baseName: string,
    extension: string,
    reservedFilenames: Set<string> = new Set(),
  ): string {
    const taken = new Set([...this.getCollectionFilenames(collectionId), ...reservedFilenames])
    let filename = `${baseName}.${extension}`
    let counter = 1
    while (taken.has(filename)) {
      filename = `${baseName}(${counter}).${extension}`
      counter++
    }
    return filename
  }

  get totalCount(): number {
    return Object.keys(this.entries).length
  }
}
