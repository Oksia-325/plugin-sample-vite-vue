import type { ManifestManager } from "./manifest"
import type {
  CollectionInfo,
  IconInfo,
  PluginSettings,
  SyncResult,
} from "./types"
import { putFile } from "@/api"
import {
  Icons8Client,
  UnauthorizedError,
} from "./client"
import {
  emojiFilePath,
  sanitizeName,
} from "./naming"
import { IGNORED_COLLECTIONS } from "./types"

export interface SyncCallbacks {
  onCollectionStart?: (collection: CollectionInfo, index: number, total: number) => void
  onCollectionProgress?: (collectionId: string, downloaded: number, failed: number, total: number) => void
  onCollectionDone?: (result: SyncResult) => void
}

const SAVE_THRESHOLD = 10

export class SyncManager {
  private cancelRequested = false
  private saveCounter = 0
  private saveChain: Promise<void> = Promise.resolve()

  constructor(
    private client: Icons8Client,
    private manifest: ManifestManager,
    private getSettings: () => PluginSettings,
    private callbacks: SyncCallbacks = {},
  ) {}

  cancel(): void {
    this.cancelRequested = true
  }

  async syncAll(): Promise<SyncResult[]> {
    this.cancelRequested = false
    const collections = await this.loadCollections()
    return this.runCollections(collections)
  }

  async syncIncremental(): Promise<SyncResult[]> {
    this.cancelRequested = false
    const collections = await this.loadCollections()
    const localCounts = this.manifest.getCollectionCounts()
    const changed = collections.filter((collection) => {
      const localTotal = localCounts[collection.id] ?? 0
      return collection.totalIcons > localTotal
    })
    return this.runCollections(changed)
  }

  async syncCollections(collectionIds?: string[]): Promise<SyncResult[]> {
    this.cancelRequested = false
    const collections = await this.loadCollections()
    const targetIds = collectionIds && collectionIds.length > 0 ? new Set(collectionIds) : null
    const selected = targetIds
      ? collections.filter((collection) => targetIds.has(collection.id))
      : collections
    return this.runCollections(selected)
  }

  private async loadCollections(): Promise<CollectionInfo[]> {
    return (await this.client.getCollections())
      .filter((collection) => collection.name && !IGNORED_COLLECTIONS.has(collection.name))
  }

  private async runCollections(collections: CollectionInfo[]): Promise<SyncResult[]> {
    const results: SyncResult[] = []
    for (let index = 0; index < collections.length; index++) {
      if (this.cancelRequested) {
        break
      }
      const result = await this.syncCollection(collections[index], index, collections.length)
      results.push(result)
      this.callbacks.onCollectionDone?.(result)
      if (result.downloaded > 0 || result.failed > 0) {
        await this.flushSaves()
      }
    }
    await this.flushSaves()
    return results
  }

  private async syncCollection(collection: CollectionInfo, index: number, total: number): Promise<SyncResult> {
    this.callbacks.onCollectionStart?.(collection, index, total)
    const result: SyncResult = {
      collectionName: collection.name,
      collectionId: collection.id,
      remoteTotal: 0,
      localTotal: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
    }

    let remoteIcons: IconInfo[]
    try {
      remoteIcons = await this.client.getCollectionIcons(collection.apiCode)
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err
      }
      result.error = err instanceof Error ? err.message : String(err)
      result.failed = 1
      return result
    }
    result.remoteTotal = remoteIcons.length

    // 增量差集：manifest 以 icon ID 为唯一标识
    const settings = this.getSettings()
    const localEntries = this.manifest.getCollectionEntries(collection.id)
    result.localTotal = localEntries.length
    const localIds = new Set(localEntries.map((entry) => entry.iconId))
    const skipSynced = settings.skipSynced !== false
    const newIcons = skipSynced
      ? remoteIcons.filter((icon) => !localIds.has(icon.id))
      : remoteIcons
    if (newIcons.length === 0) {
      result.skipped = remoteIcons.length
      return result
    }

    // 预生成唯一文件名（本批次内预留，防止并发撞名）
    const extension = settings.downloadFormat
    const reservedFilenames = new Set<string>()
    const planned: Array<{ icon: IconInfo, filename: string }> = []
    for (const icon of newIcons) {
      const existing = this.manifest.getEntry(collection.id, icon.id)
      const canReuse = !!existing
        && existing.localFilename.toLowerCase().endsWith(`.${extension}`)
        && !reservedFilenames.has(existing.localFilename)
      const filename = canReuse
        ? existing.localFilename
        : this.manifest.generateUniqueFilename(
            collection.id,
            sanitizeName(icon.name),
            extension,
            reservedFilenames,
          )
      reservedFilenames.add(filename)
      planned.push({
        icon,
        filename,
      })
    }

    // 并发下载（信号量限流），写入 /emojis/<收藏夹小写>/<名称>.<ext>
    let downloaded = 0
    let failed = 0
    let added = 0
    if (planned.length > 0) {
      this.callbacks.onCollectionProgress?.(collection.id, 0, 0, planned.length)
    }
    const tasks = planned.map((item) => async () => {
      if (this.cancelRequested) {
        return
      }
      try {
        const blob = await this.client.downloadIcon(item.icon.id)
        if (this.cancelRequested) {
          return
        }
        await putFile(emojiFilePath(collection.name, item.filename), false, blob)
        this.manifest.addEntry(item.icon.id, collection.id, collection.name, item.icon.name, item.filename)
        if (!localIds.has(item.icon.id)) {
          added++
        }
        downloaded++
        this.scheduleSave()
      } catch (err) {
        failed++
        console.error(`[Icon8Sync] download failed ${item.icon.id} (${item.icon.name}):`, err)
      }
      this.callbacks.onCollectionProgress?.(collection.id, downloaded, failed, planned.length)
    })
    await runPool(tasks, settings.maxConcurrentDownloads)

    result.downloaded = downloaded
    result.failed = failed
    result.localTotal += added
    return result
  }

  private scheduleSave(): void {
    this.saveCounter++
    if (this.saveCounter >= SAVE_THRESHOLD) {
      this.saveCounter = 0
      this.saveChain = this.saveChain
        .then(() => this.manifest.save())
        .catch((err) => console.error("[Icon8Sync] manifest save failed:", err))
    }
  }

  private async flushSaves(): Promise<void> {
    this.saveCounter = 0
    await this.saveChain
    await this.manifest.save().catch((err) => console.error("[Icon8Sync] manifest save failed:", err))
  }
}

async function runPool(tasks: Array<() => Promise<void>>, concurrency: number): Promise<void> {
  if (tasks.length === 0) {
    return
  }
  let next = 0
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length))
  const workers = Array.from({ length: workerCount }, async () => {
    while (next < tasks.length) {
      const task = tasks[next++]
      await task()
    }
  })
  await Promise.all(workers)
}
