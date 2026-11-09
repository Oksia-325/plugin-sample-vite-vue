import { insertBlock } from '@/api'
import type { PigoConfig } from '../config'
import { createS3Client } from '../s3/client.ts'
import { detectImageContentType, extensionFromFileName, extensionFromMime } from '../upload/mime.ts'
import { buildObjectKey } from '../upload/keyTemplate.ts'
import { buildFileMapEntry, loadFileMap, mergeFileMap, saveFileMap } from '../upload/fileMap.ts'
import { runWithConcurrency } from '../upload/concurrency.ts'
import type { PasteInputSnapshot } from './PasteEventAdapter.ts'

export interface PasteUploadOptions {
  notifyInfo?: (message: string) => void
  notifySuccess?: (message: string) => void
  notifyError?: (message: string) => void
  onStatus?: (message: string) => void
  isCancelled?: () => boolean
}

export interface PastedFileResult {
  fileName: string
  key: string
  url: string
  contentType: string
  size: number
}

export interface PasteUploadResult {
  insertedBlockId: string
  uploaded: number
  failed: number
  files: PastedFileResult[]
  errors: string[]
}

export async function executePasteUpload(
  snapshot: PasteInputSnapshot,
  config: PigoConfig,
  options: PasteUploadOptions = {}
): Promise<PasteUploadResult> {
  const client = createS3Client(config.s3)
  const results: PastedFileResult[] = []
  const errors: string[] = []
  let done = 0

  const tasks = snapshot.files.map((file, index) => async () => {
    if (options.isCancelled?.()) {
      return
    }

    try {
      const buffer = new Uint8Array(await file.arrayBuffer())
      const contentType = normalizeImageType(file, buffer)
      const ext = extensionFromFileName(file.name) || extensionFromMime(contentType) || 'png'
      const fileName = file.name || `pasted-${Date.now()}-${index}.${ext}`
      const key = await buildObjectKey(
        {
          fileName,
          ext,
          buffer,
        },
        config.s3.uploadPath
      )
      const put = await client.putObject(key, buffer, contentType)
      results.push({
        fileName,
        key,
        url: put.url,
        contentType,
        size: buffer.byteLength,
      })
    }
    catch (error) {
      errors.push(`${file.name || `图片 ${index + 1}`}：${error instanceof Error ? error.message : String(error)}`)
    }
    finally {
      done++
      options.onStatus?.(`正在上传粘贴图片 ${done}/${snapshot.files.length}`)
    }
  })

  await runWithConcurrency(tasks, clamp(config.behavior.concurrency, 1, 10), () => options.isCancelled?.() === true)

  if (results.length === 0) {
    const message = errors.length > 0 ? errors.join('; ') : '没有可上传的图片'
    options.notifyError?.(`粘贴图片上传失败：${message}`)
    return {
      insertedBlockId: '',
      uploaded: 0,
      failed: snapshot.files.length,
      files: [],
      errors,
    }
  }

  const markdown = results
    .map((file) => `![${escapeAlt(file.fileName)}](${file.url})`)
    .join('\n\n')

  let insertedBlockId = ''
  try {
    const previousID = snapshot.targetBlockId && snapshot.targetBlockId !== snapshot.pageId
      ? snapshot.targetBlockId
      : undefined
    const response = await insertBlock('markdown', markdown, undefined, previousID, snapshot.pageId)
    insertedBlockId = extractInsertedBlockId(response) || previousID || snapshot.pageId
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    options.notifyError?.(`图片已上传，但写入文档失败：${message}。链接：${results.map((file) => file.url).join(' , ')}`)
    return {
      insertedBlockId: '',
      uploaded: results.length,
      failed: snapshot.files.length - results.length,
      files: results,
      errors: [...errors, `写入文档失败：${message}`],
    }
  }

  try {
    const fileMap = await loadFileMap(snapshot.pageId)
    const entries = results.map((file) => buildFileMapEntry({
      originUrl: file.fileName,
      url: file.url,
      alt: file.fileName,
      title: '',
      blockId: insertedBlockId,
      name: file.fileName,
    }))
    const merged = mergeFileMap(fileMap, entries)
    await saveFileMap(snapshot.pageId, merged)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`fileMap 写入失败：${message}`)
  }

  if (errors.length > 0) {
    options.notifyInfo?.(`已上传 ${results.length} 张，失败 ${errors.length} 条`)
  }
  else {
    options.notifySuccess?.(`已上传 ${results.length} 张图片并插入文档`)
  }

  return {
    insertedBlockId,
    uploaded: results.length,
    failed: snapshot.files.length - results.length,
    files: results,
    errors,
  }
}

function normalizeImageType(file: File, buffer: Uint8Array): string {
  const declared = (file.type || '').split(';')[0].trim().toLowerCase()
  if (declared.startsWith('image/')) {
    return declared === 'image/jpg' ? 'image/jpeg' : declared
  }

  const detected = detectImageContentType(buffer, file.name)
  if (!detected.startsWith('image/')) {
    throw new Error(`不是可识别的图片（${detected}）`)
  }
  return detected
}

function extractInsertedBlockId(response: any): string {
  const data = response?.data ?? response
  const operation = Array.isArray(data)
    ? data?.[0]?.doOperations?.[0]
    : data?.doOperations?.[0]
  return operation?.id ?? data?.[0]?.id ?? ''
}

function escapeAlt(value: string): string {
  return (value || 'image')
    .replace(/[[\]\r\n]/g, ' ')
    .trim()
    .slice(0, 180) || 'image'
}

function clamp(value: number, min: number, max: number): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.round(numberValue)))
}
