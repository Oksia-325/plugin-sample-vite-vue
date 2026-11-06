import type { ImageRef } from '../scan/types'
import type { FileMapEntry } from './fileMap'

export interface UploadOptions {
  force?: boolean
  repairOnly?: boolean
  skipIfAlreadyS3?: boolean
  concurrency?: number
  includeTitleImage?: boolean
  includeRemoteImages?: boolean
  onProgress?: (progress: UploadProgress) => void
  isCancelled?: () => boolean
}

export interface UploadProgress {
  phase: 'preparing' | 'uploading' | 'replacing' | 'done'
  done: number
  total: number
  uploaded: number
  reused: number
  skipped: number
  failed: number
  current?: string
}

export interface UploadResult {
  ref: ImageRef
  ok: boolean
  reused?: boolean
  skipped?: boolean
  key?: string
  url?: string
  contentType?: string
  size?: number
  error?: string
  fileMapEntry?: FileMapEntry
}

export interface UploadBatchResult {
  results: UploadResult[]
  uploaded: number
  reused: number
  skipped: number
  failed: number
  cancelled: boolean
}
