import { sql } from '@/api'
import type { PigoConfig } from '../config'
import { matchS3Key } from '../scan/s3Key'
import { scanAll } from '../scan/scanner'
import type { ImageRef, ScanAllProgress, ScanAllResult } from '../scan/types'
import { createS3Client } from '../s3/client'
import type { DeleteObjectsResult } from '../s3/client-core'
import type { S3ObjectInfo } from '../s3/xml'
import { getStaticPrefix } from '../upload/keyTemplate'
import { buildSyncReport, type SyncEvidence, type SyncReport } from './report'

export type SyncPhase = 'scanning' | 'listing' | 'comparing' | 'protecting' | 'deleting' | 'done'

export interface SyncProgress {
  phase: SyncPhase
  done: number
  total: number
  current?: string
  objects?: number
}

export interface SyncBuildOptions {
  onProgress?: (progress: SyncProgress) => void
  isCancelled?: () => boolean
}

export interface SyncSnapshot {
  report: SyncReport
  scan: ScanAllResult
  objects: S3ObjectInfo[]
  prefix: string
  scannedAt: number
  durationMs: number
}

export interface CleanupOptions {
  batchSize?: number
  onProgress?: (progress: { done: number, total: number, batch: number, batchCount: number }) => void
  isCancelled?: () => boolean
}

/**
 * 扫描全部笔记 + 列出整个存储桶，生成双向对比报告。
 *
 * 注意：同步必须基于“全部笔记”，否则会把其它文档仍在引用的对象误判为孤儿。
 */
export async function buildSyncSnapshot(
  config: PigoConfig,
  options: SyncBuildOptions = {}
): Promise<SyncSnapshot> {
  const startedAt = Date.now()
  const prefix = getStaticPrefix(config.s3.uploadPath)

  const scan = await scanAll(config, {
    isCancelled: options.isCancelled,
    onProgress: (progress: ScanAllProgress) => {
      options.onProgress?.({
        phase: 'scanning',
        done: progress.processed,
        total: progress.total,
        current: progress.docTitle,
      })
    },
  })

  if (options.isCancelled?.()) {
    throw new Error('已取消同步')
  }

  const client = createS3Client(config.s3)
  const objects = await client.listAllObjects('', (_page, total) => {
    if (options.isCancelled?.()) {
      throw new Error('已取消同步')
    }
    options.onProgress?.({
      phase: 'listing',
      done: 0,
      total: 0,
      objects: total,
      current: `已读取 ${total} 个 S3 对象`,
    })
  })

  if (options.isCancelled?.()) {
    throw new Error('已取消同步')
  }

  options.onProgress?.({
    phase: 'comparing',
    done: 1,
    total: 1,
    objects: objects.length,
    current: '正在对比引用关系',
  })

  options.onProgress?.({
    phase: 'protecting',
    done: 1,
    total: 1,
    objects: objects.length,
    current: '读取笔记原文，保护仍被提及的链接',
  })

  const rawKeys = await collectRawS3Keys(config, prefix)
  const basenameRefs = collectLocalBasenames(scan.refs)

  const extraEvidence: SyncEvidence[] = [...rawKeys].map((key) => ({
    key,
    refs: [],
    source: 'url',
  }))

  const report = buildSyncReport({
    refs: scan.refs,
    uniqueRefs: scan.uniqueRefs,
    objects,
    prefix,
    extraEvidence,
    basenameRefs,
  })

  options.onProgress?.({ phase: 'done', done: 1, total: 1, objects: objects.length })

  return {
    report,
    scan,
    objects,
    prefix,
    scannedAt: report.scannedAt,
    durationMs: Date.now() - startedAt,
  }
}

/**
 * 从全部笔记正文和 IAL 中提取 S3 URL，作为“仍被提及”的保护证据。
 *
 * 覆盖：非图片语法链接、HTML 属性、fileMap 中的 S3 地址等。
 * 如果读取失败则中止同步，避免在证据不完整时误删对象。
 */
async function collectRawS3Keys(config: PigoConfig, prefix: string): Promise<Set<string>> {
  const keys = new Set<string>()
  let texts: string[]

  // 只扫描包含上传前缀的正文，减少无关 URL；前缀含 LIKE 通配符时退回全量。
  const needle = prefix && !/[_%\\]/.test(prefix) ? prefix : 'http'

  try {
    const markdownRows = await sql(`
      select markdown as text
      from blocks
      where markdown like '%${needle}%'
      limit 200000
    `) as Array<{ text?: string | null }>
    const ialRows = await sql(`
      select ial as text
      from blocks
      where ial like '%${needle}%'
      limit 200000
    `) as Array<{ text?: string | null }>

    texts = [
      ...markdownRows.map((row) => row.text || ''),
      ...ialRows.map((row) => row.text || ''),
    ]
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`读取笔记原文失败，已中止同步以避免误删：${message}`)
  }

  const urlRegex = /https?:\/\/[^\s"'<>()\]\\]+/gi
  texts.forEach((text) => {
    if (!text || !text.includes('http')) {
      return
    }
    const matches = text.match(urlRegex)
    if (!matches) {
      return
    }
    matches.forEach((match) => {
      const url = match.replace(/[.,;:!?]+$/, '')
      const key = matchS3Key(url, config.s3)
      if (key) {
        keys.add(key)
      }
    })
  })

  return keys
}

function collectLocalBasenames(refs: ImageRef[]): Map<string, ImageRef[]> {
  const result = new Map<string, ImageRef[]>()

  refs.forEach((ref) => {
    if (ref.sourceType !== 'local') {
      return
    }
    const rawPath = ref.assetPath || ref.url
    const basename = safeDecode((rawPath || '').split('/').pop() || '')
    if (!basename) {
      return
    }
    const list = result.get(basename)
    if (list) {
      list.push(ref)
    }
    else {
      result.set(basename, [ref])
    }
  })

  return result
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

export async function cleanupSyncObjects(
  config: PigoConfig,
  keys: string[],
  options: CleanupOptions = {}
): Promise<DeleteObjectsResult> {
  const client = createS3Client(config.s3)
  return await client.deleteObjectsBatched(keys, {
    batchSize: options.batchSize ?? 1000,
    isCancelled: options.isCancelled,
    onProgress: options.onProgress,
  })
}
