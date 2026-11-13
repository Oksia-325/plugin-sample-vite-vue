import type { PigoConfig } from '../config.ts'
import { createParsedImage } from '../scan/parser.ts'
import type { ImageRef } from '../scan/types.ts'
import type { FileMapEntry } from '../upload/fileMapPure.ts'
import { mergeFileMap } from '../upload/fileMapPure.ts'
import type { PipelineResult } from '../upload/pipeline.ts'
import { computeRefStats, countUploadedButNotReplaced, withAssetStats } from './aggregate.ts'
import type { StatsSnapshot } from './service.ts'

export interface ApplyPipelineOutcomeOptions {
  /** 本次真正被替换的旧链接；只更新这些引用，避免把替换失败的图片误标为 S3。 */
  replacedUrls: Iterable<string>
}

/**
 * 把一次上传 / 修复任务的结果直接合并进统计快照。
 *
 * 思源的 SQL 索引在 updateBlock / setBlockAttrs 之后有短暂延迟，
 * 立刻重新扫描会读回旧链接，导致「修复」按钮状态和卡片来源闪回旧值。
 * 这里先按任务结果做一次乐观更新，随后再让带守卫的重新扫描校正。
 *
 * - 已替换：引用直接变成 S3；
 * - 未替换：把新的 fileMap 记录并入快照，「已上传未替换」立即增加。
 *
 * 返回是否改动了快照。
 */
export function applyPipelineOutcome(
  snapshot: StatsSnapshot,
  result: PipelineResult,
  config: PigoConfig,
  options: ApplyPipelineOutcomeOptions
): boolean {
  const replacedUrls = new Set(options.replacedUrls)
  const affectedDocIds = new Set(result.upload.results.map((item) => item.ref.docId))
  const urlByNormalized = new Map<string, string>()

  result.upload.results.forEach((item) => {
    if (item.ok && item.url && !item.skipped) {
      urlByNormalized.set(item.ref.normalizedUrl, item.url)
    }
  })

  let changed = false

  if (replacedUrls.size > 0) {
    const update = (ref: ImageRef): void => {
      if (ref.sourceType === 's3' || !affectedDocIds.has(ref.docId) || !replacedUrls.has(ref.url)) {
        return
      }
      const nextUrl = urlByNormalized.get(ref.normalizedUrl)
      if (!nextUrl) {
        return
      }
      const parsed = createParsedImage(nextUrl, ref.alt, ref.title, ref.kind, config.s3)
      ref.url = parsed.url
      ref.sourceType = parsed.sourceType
      ref.normalizedUrl = parsed.normalizedUrl
      ref.s3Key = parsed.s3Key
      ref.assetPath = parsed.assetPath
      changed = true
    }

    snapshot.result.refs.forEach(update)
    snapshot.result.uniqueRefs.forEach(update)
  }

  const entriesByDoc = new Map<string, FileMapEntry[]>()
  result.upload.results.forEach((item) => {
    if (!item.ok || !item.url || item.skipped || item.reused || !item.fileMapEntry) {
      return
    }
    const entries = entriesByDoc.get(item.ref.docId) || []
    entries.push({
      ...item.fileMapEntry,
      originUrl: item.ref.url,
      blockId: item.ref.blockId,
      isTitle: item.ref.kind === 'title',
    })
    entriesByDoc.set(item.ref.docId, entries)
  })
  entriesByDoc.forEach((entries, docId) => {
    const current = snapshot.fileMaps.get(docId) || {}
    snapshot.fileMaps.set(docId, mergeFileMap(current, entries))
    changed = true
  })

  if (!changed) {
    return false
  }

  const stats = withAssetStats(
    computeRefStats(snapshot.result.refs, snapshot.result.uniqueRefs, snapshot.stats.totalDocs),
    {
      uploadedButNotReplaced: countUploadedButNotReplaced(snapshot.result.uniqueRefs, snapshot.fileMaps),
      assetFiles: snapshot.stats.assetFiles,
      titleAssets: snapshot.stats.titleAssets,
    }
  )
  snapshot.stats = stats
  snapshot.result.stats = stats
  return true
}
