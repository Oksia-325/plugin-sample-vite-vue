import type { PigoConfig } from '../config'
import type { ImageRef } from '../scan/types'
import { matchS3Key } from '../scan/s3Key.ts'
import { logInfo, logWarn } from '../log.ts'
import { createS3Client } from '../s3/client.ts'
import type { S3ClientCore } from '../s3/client-core.ts'
import { buildFileMapEntry, findFileMapEntry, loadFileMap, type FileMapEntry } from './fileMap.ts'
import { buildObjectKey } from './keyTemplate.ts'
import { runWithConcurrency } from './concurrency.ts'
import { readImageSource } from './source.ts'
import type { UploadBatchResult, UploadOptions, UploadProgress, UploadResult } from './types.ts'

const PROGRESS_INTERVAL_MS = 100

export async function uploadRefs(
  refs: ImageRef[],
  config: PigoConfig,
  options: UploadOptions = {}
): Promise<UploadBatchResult> {
  const client = createS3Client(config.s3)
  const concurrency = clamp(options.concurrency ?? config.behavior.concurrency, 1, 10)
  const fileMapCache = new Map<string, Promise<Record<string, FileMapEntry>>>()
  const results: UploadResult[] = []
  const includeTitle = options.includeTitleImage ?? config.behavior.includeTitleImage
  const includeRemote = options.includeRemoteImages ?? config.behavior.includeRemoteImages
  let done = 0
  let uploaded = 0
  let reused = 0
  let skipped = 0
  let failed = 0
  let cancelled = false

  /**
   * 进度回调节流：80 张图逐张回调会触发 80 次整页重新渲染，
   * 这是上传期间渲染进程 CPU 偏高的重要原因之一。
   * 这里把「上传中」的进度合并到约 10 次/秒，保证数字仍然实时。
   */
  let lastProgressAt = 0
  let progressTimer: ReturnType<typeof setTimeout> | undefined
  let pendingCurrent: string | undefined

  const emit = (phase: UploadProgress['phase'], current?: string) => {
    lastProgressAt = Date.now()
    options.onProgress?.({
      phase,
      done,
      total: refs.length,
      uploaded,
      reused,
      skipped,
      failed,
      current,
    })
  }

  const report = (phase: UploadProgress['phase'], current?: string) => {
    if (phase !== 'uploading') {
      if (progressTimer) {
        clearTimeout(progressTimer)
        progressTimer = undefined
      }
      emit(phase, current)
      return
    }

    pendingCurrent = current
    const elapsed = Date.now() - lastProgressAt
    if (elapsed >= PROGRESS_INTERVAL_MS) {
      emit(phase, current)
      return
    }
    if (!progressTimer) {
      progressTimer = setTimeout(() => {
        progressTimer = undefined
        emit('uploading', pendingCurrent)
      }, PROGRESS_INTERVAL_MS - elapsed)
    }
  }

  report('preparing')
  logInfo(`开始上传 ${refs.length} 张图片（并发 ${concurrency}）`)

  const getFileMap = (docId: string) => {
    let promise = fileMapCache.get(docId)
    if (!promise) {
      promise = loadFileMap(docId)
      fileMapCache.set(docId, promise)
    }
    return promise
  }

  const tasks = refs.map((ref) => async () => {
    const result = await uploadOne(ref, {
      config,
      client,
      getFileMap,
      options,
      includeTitle,
      includeRemote,
    })
    results.push(result)

    if (result.skipped) {
      skipped++
    }
    else if (result.reused) {
      reused++
    }
    else if (result.ok) {
      uploaded++
    }
    else {
      failed++
    }

    done++
    report('uploading', ref.url)
  })

  await runWithConcurrency(tasks, concurrency, () => {
    if (options.isCancelled?.()) {
      cancelled = true
      return true
    }
    return false
  })

  report('done')
  logInfo(`上传结束：上传 ${uploaded}，复用 ${reused}，跳过 ${skipped}，失败 ${failed}${cancelled ? '，已取消' : ''}`)
  if (failed > 0) {
    results
      .filter((result) => !result.ok && result.error)
      .slice(0, 10)
      .forEach((result) => logWarn(`上传失败：${result.ref.url}`, result.error))
  }

  return {
    results,
    uploaded,
    reused,
    skipped,
    failed,
    cancelled,
  }
}

interface UploadOneContext {
  config: PigoConfig
  client: S3ClientCore
  getFileMap: (docId: string) => Promise<Record<string, FileMapEntry>>
  options: UploadOptions
  includeTitle: boolean
  includeRemote: boolean
}

async function uploadOne(ref: ImageRef, context: UploadOneContext): Promise<UploadResult> {
  const { config, client, getFileMap, options, includeTitle, includeRemote } = context

  if (ref.kind === 'title' && !includeTitle) {
    return { ref, ok: true, skipped: true, error: '已跳过题头图' }
  }

  if (ref.sourceType === 'remote' && !includeRemote && !options.force) {
    return { ref, ok: true, skipped: true, error: '已跳过网络图片' }
  }

  const skipS3 = options.skipIfAlreadyS3 ?? config.behavior.skipIfAlreadyS3
  if (ref.sourceType === 's3' && !options.force && skipS3) {
    return { ref, ok: true, skipped: true, error: '已经是 S3 图片' }
  }

  // 关闭“跳过已上传”时，S3 图片也视为强制重新上传，忽略 fileMap 中的旧记录。
  const forceThis = options.force || (ref.sourceType === 's3' && !skipS3)
  const fileMap = await getFileMap(ref.docId)
  const existing = options.repairOnly || !forceThis
    ? findFileMapEntry(fileMap, ref.url)
    : undefined

  if (existing?.isLocal === false && existing.url) {
    const key = ref.sourceType === 's3' ? ref.s3Key : matchS3Key(existing.url, config.s3)
    return {
      ref,
      ok: true,
      reused: true,
      key,
      url: existing.url,
      fileMapEntry: existing,
    }
  }

  if (options.repairOnly) {
    return { ref, ok: true, skipped: true, error: 'fileMap 中没有可复用的上传记录' }
  }

  try {
    const source = await readImageSource(ref, {
      readS3Object: (key) => client.getObject(key),
    })

    const objectKey = await buildObjectKey(
      {
        fileName: source.fileName,
        ext: source.ext,
        buffer: source.buffer,
      },
      config.s3.uploadPath
    )

    const putResult = await client.putObject(
      objectKey,
      source.buffer,
      source.contentType
    )

    const entry = buildFileMapEntry({
      originUrl: ref.url,
      url: putResult.url,
      alt: ref.alt,
      title: ref.title,
      blockId: ref.blockId,
      isTitle: ref.kind === 'title',
      name: source.fileMapName,
    })

    return {
      ref,
      ok: true,
      key: objectKey,
      url: putResult.url,
      contentType: source.contentType,
      size: source.size,
      fileMapEntry: entry,
    }
  }
  catch (error) {
    return {
      ref,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.round(numberValue)))
}
