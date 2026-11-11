import type { Icons8Client } from "./client"
import type { ManifestManager } from "./manifest"
import type {
  CollectionOverview,
  CollectionStatus,
  LastSyncResults,
  SyncOverview,
} from "./types"
import { IGNORED_COLLECTIONS } from "./types"

export interface OverviewOptions {
  client: Icons8Client
  manifest: ManifestManager
  lastSyncAt?: number
  lastSyncFailed?: number
  lastSyncResults?: LastSyncResults
}

/**
 * 读取云端收藏夹并合并本地 manifest 统计，用于打开面板时的总览展示。
 * 只请求收藏夹列表，不逐个头像拉取，避免打开弹窗时产生大量网络请求。
 */
export async function buildOverview(options: OverviewOptions): Promise<SyncOverview> {
  const collections = (await options.client.getCollections())
    .filter((collection) => collection.name && !IGNORED_COLLECTIONS.has(collection.name))
  const localCounts = options.manifest.getCollectionCounts()

  const items: CollectionOverview[] = []
  let local = 0
  let remote = 0
  let pending = 0

  for (const collection of collections) {
    const localTotal = localCounts[collection.id] ?? 0
    const pendingTotal = Math.max(0, collection.totalIcons - localTotal)
    const saved = options.lastSyncResults?.[collection.id]
    let status: CollectionStatus = pendingTotal > 0 ? "pending" : "done"
    let downloaded = 0
    let failed = 0
    let error: string | undefined
    if (saved) {
      downloaded = saved.downloaded
      failed = saved.failed
      error = saved.error
      if (saved.status === "error") {
        status = "error"
      } else if (pendingTotal === 0) {
        status = "done"
      }
    }
    local += localTotal
    remote += collection.totalIcons
    pending += pendingTotal
    items.push({
      id: collection.id,
      apiCode: collection.apiCode,
      name: collection.name,
      remoteTotal: collection.totalIcons,
      localTotal,
      pendingTotal,
      downloaded,
      failed,
      error,
      status,
    })
  }

  const matchedFailed = items.reduce((sum, item) => sum + item.failed, 0)
  return {
    collections: items,
    totals: {
      collections: items.length,
      local,
      remote,
      pending,
      failed: Math.max(matchedFailed, Math.max(0, Math.floor(Number(options.lastSyncFailed) || 0))),
    },
    lastSyncAt: Math.max(0, Math.floor(Number(options.lastSyncAt) || 0)),
    loadedAt: Date.now(),
  }
}
