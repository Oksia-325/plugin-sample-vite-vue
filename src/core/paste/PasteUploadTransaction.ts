import { insertBlock } from '@/api'
import type { PigoConfig } from '../config'
import { buildFileMapEntry, loadFileMap, mergeFileMap, saveFileMap } from '../upload/fileMap.ts'
import { uploadFilesToS3 } from '../upload/standalone.ts'
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
  options.onStatus?.(`正在上传粘贴图片 0/${snapshot.files.length}`)

  const upload = await uploadFilesToS3(snapshot.files, config, {
    isCancelled: options.isCancelled,
    onProgress: (done, total) => {
      options.onStatus?.(`正在上传粘贴图片 ${done}/${total}`)
    },
  })

  const results: PastedFileResult[] = upload.results.map((file) => ({
    fileName: file.fileName,
    key: file.key,
    url: file.url,
    contentType: file.contentType,
    size: file.size,
  }))
  const errors = [...upload.errors]

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
