import type { PigoConfig } from '../config'
import { scanAll, scanDoc } from '../scan/scanner'
import type { ScanAllProgress, ScanAllResult, ScanDocResult, ScanStats } from '../scan/types'
import {
  countUploadedButNotReplaced,
  isUploadedButNotReplaced,
  withAssetStats,
  type DocFileMaps,
} from './aggregate'
import { countAssetFiles, loadDocFileMaps } from './siyuanData'

export type StatsScope = 'doc' | 'all'

export interface StatsSnapshot {
  scope: StatsScope
  docId?: string
  result: ScanDocResult | ScanAllResult
  stats: ScanStats
  fileMaps: DocFileMaps
  scannedAt: number
  durationMs: number
}

export interface BuildStatsOptions {
  docId?: string
  onProgress?: (progress: ScanAllProgress) => void
  isCancelled?: () => boolean
}

/**
 * 扫描 + 附加统计（fileMap 未替换数、assets 数量）。
 */
export async function buildStatsSnapshot(
  scope: StatsScope,
  config: PigoConfig,
  options: BuildStatsOptions = {}
): Promise<StatsSnapshot> {
  const startedAt = Date.now()

  const result = scope === 'doc'
    ? await scanDoc(requireDocId(options.docId), config)
    : await scanAll(config, {
      onProgress: options.onProgress,
      isCancelled: options.isCancelled,
    })

  if (options.isCancelled?.()) {
    throw new Error('统计已取消')
  }

  const [fileMaps, assetCounts] = await Promise.all([
    loadDocFileMaps(),
    countAssetFiles(),
  ])

  const stats = withAssetStats(result.stats, {
    uploadedButNotReplaced: countUploadedButNotReplaced(result.uniqueRefs, fileMaps),
    assetFiles: assetCounts.assetFiles,
    titleAssets: assetCounts.titleAssets,
  })
  result.stats = stats

  return {
    scope,
    docId: options.docId,
    result,
    stats,
    fileMaps,
    scannedAt: result.scannedAt,
    durationMs: Date.now() - startedAt,
  }
}

export function isSnapshotUploadedButNotReplaced(snapshot: StatsSnapshot, ref: Parameters<typeof isUploadedButNotReplaced>[0]): boolean {
  return isUploadedButNotReplaced(ref, snapshot.fileMaps)
}

function requireDocId(docId: string | undefined): string {
  const value = (docId || '').trim()
  if (!value) {
    throw new Error('请先打开一篇笔记。')
  }
  return value
}
