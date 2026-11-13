import type { PigoConfig } from '../config'
import { logInfo, logWarn } from '../log.ts'
import { scanAll, scanDoc } from '../scan/scanner.ts'
import type { ImageRef, ImageSourceType, ScanAllResult, ScanDocResult } from '../scan/types'
import { shouldReplaceLinks } from './policy.ts'
import { applyUploadResults, type ReplaceResult } from './replacer.ts'
import { selectRefs } from './select.ts'
import { uploadRefs } from './uploader.ts'
import type { UploadBatchResult } from './types.ts'

export type PipelinePhase = 'scanning' | 'uploading' | 'replacing' | 'done'

export interface PipelineProgress {
  phase: PipelinePhase
  done: number
  total: number
  uploaded: number
  reused: number
  skipped: number
  failed: number
  current?: string
  scannedDocs?: number
  totalDocs?: number
}

export interface PipelineOptions {
  force?: boolean
  repairOnly?: boolean
  concurrency?: number
  includeTitleImage?: boolean
  includeRemoteImages?: boolean
  /** 显式限定来源类型，例如「上传本地图片」使用 ['local']。 */
  sourceTypes?: ImageSourceType[]
  /** 是否替换文档中的图片链接，默认跟随设置项。 */
  replaceLink?: boolean
  onProgress?: (progress: PipelineProgress) => void
  isCancelled?: () => boolean
}

export interface PipelineResult {
  scan: ScanDocResult | ScanAllResult
  upload: UploadBatchResult
  replace: ReplaceResult
  selected: number
  elapsedMs: number
}

export async function uploadCurrentDoc(
  scan: ScanDocResult,
  config: PigoConfig,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const selected = selectRefs(scan.uniqueRefs, config, options)
  return await execute(scan, selected, config, options)
}

export async function uploadAllNotes(
  config: PigoConfig,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const scan = await scanAll(config, {
    isCancelled: options.isCancelled,
    onProgress: (progress) => {
      options.onProgress?.({
        phase: 'scanning',
        done: progress.processed,
        total: progress.total,
        uploaded: 0,
        reused: 0,
        skipped: 0,
        failed: 0,
        current: progress.docTitle,
        scannedDocs: progress.processed,
        totalDocs: progress.total,
      })
    },
  })

  const selected = selectRefs(scan.uniqueRefs, config, options)
  return await execute(scan, selected, config, options)
}

export async function uploadSingleRef(
  ref: ImageRef,
  config: PigoConfig,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const scan = await scanDoc(ref.docId, config)
  const selected = selectRefs([ref], config, {
    ...options,
    force: options.force ?? true,
  })
  return await execute(scan, selected, config, {
    ...options,
    force: options.force ?? true,
    includeTitleImage: true,
    includeRemoteImages: true,
  })
}

async function execute(
  scan: ScanDocResult | ScanAllResult,
  selected: ImageRef[],
  config: PigoConfig,
  options: PipelineOptions
): Promise<PipelineResult> {
  const startedAt = Date.now()

  const report = (progress: PipelineProgress) => {
    options.onProgress?.(progress)
  }

  report({
    phase: 'uploading',
    done: 0,
    total: selected.length,
    uploaded: 0,
    reused: 0,
    skipped: 0,
    failed: 0,
  })

  const upload = await uploadRefs(selected, config, {
    force: options.force,
    repairOnly: options.repairOnly,
    concurrency: options.concurrency,
    includeTitleImage: options.includeTitleImage,
    includeRemoteImages: options.includeRemoteImages,
    isCancelled: options.isCancelled,
    onProgress: (progress) => {
      report({
        phase: 'uploading',
        done: progress.done,
        total: progress.total,
        uploaded: progress.uploaded,
        reused: progress.reused,
        skipped: progress.skipped,
        failed: progress.failed,
        current: progress.current,
      })
    },
  })

  const replace = await applyUploadResults(scan.refs, upload.results, {
    // 「修复链接」必须真正替换链接，不能沿用「上传后替换」开关。
    replace: shouldReplaceLinks(config, options),
    isCancelled: options.isCancelled,
    onProgress: (progress) => {
      report({
        phase: 'replacing',
        done: progress.done,
        total: progress.total,
        uploaded: upload.uploaded,
        reused: upload.reused,
        skipped: upload.skipped,
        failed: upload.failed,
        current: progress.current,
      })
    },
  })

  report({
    phase: 'done',
    done: selected.length,
    total: selected.length,
    uploaded: upload.uploaded,
    reused: upload.reused,
    skipped: upload.skipped,
    failed: upload.failed,
  })

  logInfo(`任务完成：替换块 ${replace.replacedBlocks}，题头图 ${replace.replacedTitleImages}，未替换 ${replace.notReplaced}，耗时 ${Date.now() - startedAt}ms`)
  replace.errors.slice(0, 10).forEach((item) => logWarn(`替换失败：${item}`))

  return {
    scan,
    upload,
    replace,
    selected: selected.length,
    elapsedMs: Date.now() - startedAt,
  }
}
