import type { ImageRef } from '../scan/types'
import type { S3ObjectInfo } from '../s3/xml.ts'

export type MatchSource = 'ref' | 'fileMap' | 'basename' | 'url'

export interface MatchedSyncEntry {
  key: string
  object: S3ObjectInfo
  refs: ImageRef[]
  sources: MatchSource[]
}

export interface MissingSyncEntry {
  key: string
  refs: ImageRef[]
}

export interface SyncEvidence {
  key: string
  refs: ImageRef[]
  source: MatchSource
}

export interface SyncSummary {
  matched: number
  onlyS3: number
  onlySiyuan: number
  notUploaded: number
  outsidePrefix: number
  ignored: number
  /** 参与对比的文档总数。 */
  docCount: number
  /** 存储桶中读取到的对象总数（含前缀外 / 测试对象 / 目录占位）。 */
  totalObjects: number
}

export interface CleanupItem {
  key: string
  etag?: string
}

export interface CleanupPlan {
  items: CleanupItem[]
  keys: string[]
  count: number
  prefix: string
  protectedPrefix: string
}

export interface SyncReport {
  prefix: string
  matched: MatchedSyncEntry[]
  onlyS3: S3ObjectInfo[]
  onlySiyuan: MissingSyncEntry[]
  notUploaded: ImageRef[]
  outsidePrefix: S3ObjectInfo[]
  testObjects: S3ObjectInfo[]
  folderMarkers: S3ObjectInfo[]
  cleanupCandidates: S3ObjectInfo[]
  summary: SyncSummary
  scannedAt: number
}

export interface BuildSyncReportOptions {
  refs: ImageRef[]
  uniqueRefs: ImageRef[]
  objects: S3ObjectInfo[]
  prefix: string
  /** 参与对比的文档总数，仅用于展示。 */
  docCount?: number
  /** fileMap / 原始链接等额外证据，避免把仍在使用的对象误判为孤儿。 */
  extraEvidence?: SyncEvidence[]
  /** 本地资源文件名 -> 引用，用于保护被旧笔记以本地链接使用的 S3 对象。 */
  basenameRefs?: Map<string, ImageRef[]>
  scannedAt?: number
}

interface EvidenceEntry {
  refs: ImageRef[]
  sources: Set<MatchSource>
}

export function buildSyncReport(options: BuildSyncReportOptions): SyncReport {
  const prefix = normalizePrefix(options.prefix)
  const objectMap = new Map(options.objects.map((object) => [object.key, object]))
  const evidence = new Map<string, EvidenceEntry>()
  const refsByKey = new Map<string, ImageRef[]>()

  options.refs.forEach((ref) => {
    const key = ref.s3Key
    if (ref.sourceType !== 's3' || !key) {
      return
    }
    const list = refsByKey.get(key)
    if (list) {
      list.push(ref)
    }
    else {
      refsByKey.set(key, [ref])
    }
    addEvidence(evidence, key, [ref], 'ref')
  })

  options.extraEvidence?.forEach((item) => {
    if (!item.key) {
      return
    }
    addEvidence(evidence, item.key, item.refs, item.source)
  })

  const onlySiyuan: MissingSyncEntry[] = []
  refsByKey.forEach((refs, key) => {
    if (!objectMap.has(key)) {
      onlySiyuan.push({ key, refs })
    }
  })

  const matched: MatchedSyncEntry[] = []
  const onlyS3: S3ObjectInfo[] = []
  const outsidePrefix: S3ObjectInfo[] = []
  const testObjects: S3ObjectInfo[] = []
  const folderMarkers: S3ObjectInfo[] = []

  options.objects.forEach((object) => {
    if (isFolderMarker(object)) {
      folderMarkers.push(object)
      return
    }

    if (isTestKey(object.key, prefix)) {
      testObjects.push(object)
      return
    }

    const matchedEvidence = evidence.get(object.key)
    if (matchedEvidence) {
      matched.push({
        key: object.key,
        object,
        refs: matchedEvidence.refs,
        sources: [...matchedEvidence.sources],
      })
      return
    }

    if (prefix && !object.key.startsWith(prefix)) {
      outsidePrefix.push(object)
      return
    }

    const basename = objectBasename(object.key)
    const basenameMatches = basename ? options.basenameRefs?.get(basename) : undefined
    if (basenameMatches && basenameMatches.length > 0) {
      matched.push({
        key: object.key,
        object,
        refs: basenameMatches,
        sources: ['basename'],
      })
      return
    }

    onlyS3.push(object)
  })

  const cleanupCandidates = onlyS3.filter((object) => isSafeCleanupKey(object.key, prefix))
  const notUploaded = options.uniqueRefs.filter((ref) => ref.sourceType !== 's3')

  return {
    prefix,
    matched,
    onlyS3,
    onlySiyuan,
    notUploaded,
    outsidePrefix,
    testObjects,
    folderMarkers,
    cleanupCandidates,
    summary: {
      matched: matched.length,
      onlyS3: onlyS3.length,
      onlySiyuan: onlySiyuan.length,
      notUploaded: notUploaded.length,
      outsidePrefix: outsidePrefix.length,
      ignored: testObjects.length + folderMarkers.length,
      docCount: Math.max(0, options.docCount ?? 0),
      totalObjects: options.objects.length,
    },
    scannedAt: options.scannedAt ?? Date.now(),
  }
}

function addEvidence(
  evidence: Map<string, EvidenceEntry>,
  key: string,
  refs: ImageRef[],
  source: MatchSource
): void {
  let entry = evidence.get(key)
  if (!entry) {
    entry = { refs: [], sources: new Set() }
    evidence.set(key, entry)
  }
  entry.sources.add(source)
  if (refs.length === 0) {
    return
  }
  const seen = new Set(entry.refs.map((ref) => ref.id))
  refs.forEach((ref) => {
    if (seen.has(ref.id)) {
      return
    }
    seen.add(ref.id)
    entry.refs.push(ref)
  })
}

/**
 * 清理计划：只包含「仅 S3 存在 + 前缀内 + 非保护目录」的对象。
 * 删除前还会再做一次 HEAD 复核（见 service.revalidateCleanupPlan）。
 */
export function buildCleanupPlan(report: SyncReport): CleanupPlan {
  const seen = new Set<string>()
  const items: CleanupItem[] = []

  report.cleanupCandidates.forEach((object) => {
    if (!isSafeCleanupKey(object.key, report.prefix) || seen.has(object.key)) {
      return
    }
    seen.add(object.key)
    items.push({ key: object.key, etag: object.etag })
  })

  return {
    items,
    keys: items.map((item) => item.key),
    count: items.length,
    prefix: report.prefix,
    protectedPrefix: '_pigo_test/*',
  }
}

export function normalizePrefix(prefix: string): string {
  const normalized = (prefix || '').trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized) {
    return ''
  }
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

export function isTestKey(key: string, prefix: string): boolean {
  const normalized = normalizePrefix(prefix)
  return key.startsWith(`${normalized}_pigo_test/`)
}

export function isFolderMarker(object: S3ObjectInfo): boolean {
  return object.key.endsWith('/')
}

/**
 * 清理前的最后一道防线：
 * - 必须在静态前缀内（前缀为空表示整个桶）
 * - 不能是 _pigo_test/ 测试对象
 */
export function isSafeCleanupKey(key: string, prefix: string): boolean {
  const normalized = normalizePrefix(prefix)
  if (!key || key.endsWith('/')) {
    return false
  }
  if (isTestKey(key, normalized)) {
    return false
  }
  return normalized === '' || key.startsWith(normalized)
}

function objectBasename(key: string): string {
  const part = (key || '').split('/').pop() || ''
  try {
    return decodeURIComponent(part)
  }
  catch {
    return part
  }
}
