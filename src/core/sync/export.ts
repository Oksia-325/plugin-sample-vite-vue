import type { PigoConfig } from '../config'
import type { ImageRef } from '../scan/types'
import { buildPublicUrl } from '../s3/url.ts'
import type { S3ObjectInfo } from '../s3/xml.ts'
import type { SyncSnapshot } from './service.ts'

interface SyncCsvRow {
  category: string
  key: string
  url: string
  docId: string
  docTitle: string
  size: string | number
  lastModified: string
  reason: string
}

export function buildSyncJson(snapshot: SyncSnapshot, config: PigoConfig): string {
  const report = snapshot.report
  const payload = {
    scannedAt: new Date(report.scannedAt).toISOString(),
    durationMs: snapshot.durationMs,
    prefix: report.prefix,
    summary: report.summary,
    matched: report.matched.map((entry) => ({
      key: entry.key,
      url: buildPublicUrl(config.s3, entry.key),
      size: entry.object.size,
      lastModified: entry.object.lastModified,
      refs: entry.refs.map(toRefExport),
    })),
    onlyS3: report.onlyS3.map((object) => toObjectExport(object, config)),
    onlySiyuan: report.onlySiyuan.map((entry) => ({
      key: entry.key,
      reason: 'S3 对象不存在',
      refs: entry.refs.map(toRefExport),
    })),
    notUploaded: report.notUploaded.map(toRefExport),
    outsidePrefix: report.outsidePrefix.map((object) => toObjectExport(object, config)),
    testObjects: report.testObjects.map((object) => toObjectExport(object, config)),
    folderMarkers: report.folderMarkers.map((object) => toObjectExport(object, config)),
  }

  return JSON.stringify(payload, null, 2)
}

export function buildSyncCsv(snapshot: SyncSnapshot, config: PigoConfig): string {
  const report = snapshot.report
  const rows: SyncCsvRow[] = []

  report.matched.forEach((entry) => {
    const url = buildPublicUrl(config.s3, entry.key)
    if (entry.refs.length === 0) {
      rows.push({
        category: 'matched',
        key: entry.key,
        url,
        docId: '',
        docTitle: '',
        size: entry.object.size,
        lastModified: entry.object.lastModified,
        reason: '双向匹配',
      })
      return
    }
    entry.refs.forEach((ref) => {
      rows.push({
        category: 'matched',
        key: entry.key,
        url,
        docId: ref.docId,
        docTitle: ref.docTitle,
        size: entry.object.size,
        lastModified: entry.object.lastModified,
        reason: '双向匹配',
      })
    })
  })

  report.onlyS3.forEach((object) => {
    rows.push({
      category: 'onlyS3',
      key: object.key,
      url: buildPublicUrl(config.s3, object.key),
      docId: '',
      docTitle: '',
      size: object.size,
      lastModified: object.lastModified,
      reason: 'S3 存在，笔记未引用',
    })
  })

  report.onlySiyuan.forEach((entry) => {
    entry.refs.forEach((ref) => {
      rows.push({
        category: 'onlySiyuan',
        key: entry.key,
        url: ref.url,
        docId: ref.docId,
        docTitle: ref.docTitle,
        size: '',
        lastModified: '',
        reason: 'S3 对象不存在',
      })
    })
  })

  report.notUploaded.forEach((ref) => {
    rows.push({
      category: 'notUploaded',
      key: '',
      url: ref.url,
      docId: ref.docId,
      docTitle: ref.docTitle,
      size: '',
      lastModified: '',
      reason: `未上传（${ref.sourceType}）`,
    })
  })

  report.outsidePrefix.forEach((object) => {
    rows.push({
      category: 'outsidePrefix',
      key: object.key,
      url: buildPublicUrl(config.s3, object.key),
      docId: '',
      docTitle: '',
      size: object.size,
      lastModified: object.lastModified,
      reason: '不在上传前缀内，不参与清理',
    })
  })

  const header = ['category', 'key', 'url', 'docId', 'docTitle', 'size', 'lastModified', 'reason']
  const lines = [header.join(',')]
  rows.forEach((row) => {
    lines.push([
      row.category,
      row.key,
      row.url,
      row.docId,
      row.docTitle,
      row.size,
      row.lastModified,
      row.reason,
    ].map(csvCell).join(','))
  })
  return lines.join('\n')
}

function toObjectExport(object: S3ObjectInfo, config: PigoConfig) {
  return {
    key: object.key,
    url: buildPublicUrl(config.s3, object.key),
    size: object.size,
    lastModified: object.lastModified,
    etag: object.etag || '',
  }
}

function toRefExport(ref: ImageRef) {
  return {
    docId: ref.docId,
    docTitle: ref.docTitle,
    docPath: ref.docPath,
    blockId: ref.blockId,
    kind: ref.kind,
    sourceType: ref.sourceType,
    url: ref.url,
    key: ref.s3Key || '',
  }
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined || value === null ? '' : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}
