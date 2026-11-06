export type ImageSourceType = 'local' | 's3' | 'remote' | 'data'
export type ImageRefKind = 'markdown' | 'title'

export interface ParsedImage {
  url: string
  alt: string
  title: string
  kind: ImageRefKind
  sourceType: ImageSourceType
  normalizedUrl: string
  s3Key?: string
  assetPath?: string
}

export interface ImageRef extends ParsedImage {
  id: string
  blockId: string
  docId: string
  docTitle: string
  docPath: string
  occurrence: number
}

export interface DocMeta {
  id: string
  title: string
  path: string
}

export interface ScanStats {
  totalRefs: number
  uniqueRefs: number
  local: number
  s3: number
  remote: number
  data: number
  title: number
  docs: number
}

export interface ScanDocResult {
  doc: DocMeta
  refs: ImageRef[]
  uniqueRefs: ImageRef[]
  stats: ScanStats
  scannedAt: number
  durationMs: number
}

export interface ScanAllProgress {
  processed: number
  total: number
  docId?: string
  docTitle?: string
  docPath?: string
}

export interface ScanAllOptions {
  onProgress?: (progress: ScanAllProgress) => void
  isCancelled?: () => boolean
}

export interface ScanAllResult {
  docs: DocMeta[]
  refs: ImageRef[]
  uniqueRefs: ImageRef[]
  stats: ScanStats
  scannedAt: number
  durationMs: number
}

export class ScanCancelledError extends Error {
  constructor() {
    super('扫描已取消')
    this.name = 'ScanCancelledError'
  }
}
