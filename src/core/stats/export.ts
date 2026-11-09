import type { ImageRef, ScanStats } from '../scan/types'

export interface StatsExportOptions {
  scope: 'doc' | 'all'
  stats: ScanStats
  refs: ImageRef[]
  scannedAt: number
  isUploadedButNotReplaced?: (ref: ImageRef) => boolean
}

export function buildStatsJson(options: StatsExportOptions): string {
  const payload = {
    scannedAt: new Date(options.scannedAt).toISOString(),
    scope: options.scope,
    stats: options.stats,
    refs: options.refs.map((ref) => ({
      docId: ref.docId,
      docTitle: ref.docTitle,
      docPath: ref.docPath,
      blockId: ref.blockId,
      kind: ref.kind,
      sourceType: ref.sourceType,
      url: ref.url,
      normalizedUrl: ref.normalizedUrl,
      s3Key: ref.s3Key || '',
      alt: ref.alt,
      title: ref.title,
      status: statusOf(ref, options),
    })),
  }

  return JSON.stringify(payload, null, 2)
}

export function buildStatsCsv(options: StatsExportOptions): string {
  const header = [
    'docId',
    'docTitle',
    'docPath',
    'blockId',
    'kind',
    'sourceType',
    'url',
    'normalizedUrl',
    's3Key',
    'alt',
    'title',
    'status',
  ]

  const lines = [header.join(',')]
  options.refs.forEach((ref) => {
    lines.push([
      ref.docId,
      ref.docTitle,
      ref.docPath,
      ref.blockId,
      ref.kind,
      ref.sourceType,
      ref.url,
      ref.normalizedUrl,
      ref.s3Key || '',
      ref.alt,
      ref.title,
      statusOf(ref, options),
    ].map(csvCell).join(','))
  })

  return lines.join('\n')
}

function statusOf(ref: ImageRef, options: StatsExportOptions): string {
  if (options.isUploadedButNotReplaced?.(ref)) {
    return 'uploadedButNotReplaced'
  }
  return ref.sourceType
}

function csvCell(value: string | number | undefined): string {
  const text = value === undefined || value === null ? '' : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function downloadTextFile(fileName: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportFileName(prefix: string, extension: string, scannedAt: number): string {
  const date = new Date(scannedAt)
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `pigo-${prefix}-${stamp}.${extension}`
}
