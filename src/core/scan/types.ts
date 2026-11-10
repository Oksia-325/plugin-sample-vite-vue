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
  /** 含图文档数量（全库统计时 = 至少出现一张图片的文档数）。 */
  docs: number
  /** 扫描到的文档总数（当前文档范围时为 1）。 */
  totalDocs: number
  /** 文档仍是本地/网络图片，但 fileMap 中已有 S3 上传记录。 */
  uploadedButNotReplaced: number
  /** assets 表中的资源文件数量。 */
  assetFiles: number
  /** assets 表中 title='title-img' 的资源数量。 */
  titleAssets: number
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
