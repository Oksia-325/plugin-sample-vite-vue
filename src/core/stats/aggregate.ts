import type { ImageRef, ScanStats } from '../scan/types'
import { findFileMapEntry, type FileMapEntry } from '../upload/fileMapPure.ts'

export type DocFileMaps = Map<string, Record<string, FileMapEntry>>

/**
 * 按规范化 URL 去重，保留首次出现的引用。
 */
export function dedupeRefs(refs: ImageRef[]): ImageRef[] {
  const seen = new Set<string>()
  const unique: ImageRef[] = []

  refs.forEach((ref) => {
    if (seen.has(ref.normalizedUrl)) {
      return
    }
    seen.add(ref.normalizedUrl)
    unique.push(ref)
  })

  return unique
}

/**
 * 纯函数统计：只依赖 refs，不访问思源。
 *
 * `totalDocs` 用于区分「文档总数」与 `docs`（含图文档数）。
 */
export function computeRefStats(
  refs: ImageRef[],
  uniqueRefs: ImageRef[],
  totalDocs = 0
): ScanStats {
  const docsWithImages = new Set<string>()
  const stats: ScanStats = {
    totalRefs: refs.length,
    uniqueRefs: uniqueRefs.length,
    local: 0,
    s3: 0,
    remote: 0,
    data: 0,
    title: 0,
    docs: 0,
    totalDocs: Math.max(0, totalDocs),
    uploadedButNotReplaced: 0,
    assetFiles: 0,
    titleAssets: 0,
  }

  uniqueRefs.forEach((ref) => {
    stats[ref.sourceType] += 1
    if (ref.kind === 'title') {
      stats.title += 1
    }
    docsWithImages.add(ref.docId)
  })

  stats.docs = docsWithImages.size
  return stats
}

/**
 * 文档里仍是本地/网络/data 图片，但 fileMap 已经记录过 S3 地址。
 *
 * 这类图片通常出现在“上传成功但文档链接未替换”或“手动还原了链接”的场景。
 */
export function isUploadedButNotReplaced(ref: ImageRef, fileMaps: DocFileMaps): boolean {
  if (ref.sourceType === 's3' || !fileMaps) {
    return false
  }

  const fileMap = fileMaps.get(ref.docId)
  if (!fileMap) {
    return false
  }

  const entry = findFileMapEntry(fileMap, ref.url)
  if (!entry?.url) {
    return false
  }

  if (entry.url === ref.url) {
    return false
  }

  return /^https?:\/\//i.test(entry.url)
}

export function countUploadedButNotReplaced(uniqueRefs: ImageRef[], fileMaps: DocFileMaps): number {
  return uniqueRefs.reduce((count, ref) => (
    isUploadedButNotReplaced(ref, fileMaps) ? count + 1 : count
  ), 0)
}

export function withAssetStats(
  stats: ScanStats,
  extra: { uploadedButNotReplaced: number, assetFiles: number, titleAssets: number }
): ScanStats {
  return {
    ...stats,
    uploadedButNotReplaced: extra.uploadedButNotReplaced,
    assetFiles: extra.assetFiles,
    titleAssets: extra.titleAssets,
  }
}
