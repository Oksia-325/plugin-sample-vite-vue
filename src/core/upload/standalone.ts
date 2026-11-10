import type { PigoConfig } from '../config.ts'
import { createS3Client } from '../s3/client.ts'
import type { S3ClientCore } from '../s3/client-core.ts'
import { runWithConcurrency } from './concurrency.ts'
import { buildObjectKey } from './keyTemplate.ts'
import { detectImageContentType, extensionFromFileName, extensionFromMime, mimeFromExtension } from './mime.ts'

export interface StandaloneFileResult {
  fileName: string
  key: string
  url: string
  contentType: string
  size: number
}

export interface StandaloneUploadOptions {
  concurrency?: number
  isCancelled?: () => boolean
  onProgress?: (done: number, total: number, current?: string) => void
  onFileDone?: (result: StandaloneFileResult, file: File, index: number) => void
  onFileError?: (message: string, file: File, index: number) => void
}

export interface StandaloneUploadResult {
  results: StandaloneFileResult[]
  errors: string[]
  cancelled: boolean
}

/**
 * 面板内独立上传：只把文件传到 S3 并返回链接。
 *
 * 不写 fileMap、不修改任何文档，与「文档内粘贴上传」分离。
 */
export async function uploadFilesToS3(
  files: File[],
  config: PigoConfig,
  options: StandaloneUploadOptions = {}
): Promise<StandaloneUploadResult> {
  const client = createS3Client(config.s3)
  const concurrency = clamp(options.concurrency ?? config.behavior.concurrency, 1, 10)
  const results: StandaloneFileResult[] = []
  const errors: string[] = []
  let done = 0

  const tasks = files.map((file, index) => async () => {
    if (options.isCancelled?.()) {
      return
    }

    try {
      const result = await putFile(client, file, config)
      results.push(result)
      options.onFileDone?.(result, file, index)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${file.name || `图片 ${index + 1}`}：${message}`)
      options.onFileError?.(message, file, index)
    }
    finally {
      done++
      options.onProgress?.(done, files.length, file.name)
    }
  })

  await runWithConcurrency(tasks, concurrency, () => options.isCancelled?.() === true)

  return {
    results,
    errors,
    cancelled: Boolean(options.isCancelled?.()),
  }
}

/**
 * 单文件上传，供粘贴流程或单图场景复用。
 */
export async function uploadSingleFile(file: File, config: PigoConfig): Promise<StandaloneFileResult> {
  const client = createS3Client(config.s3)
  return await putFile(client, file, config)
}

async function putFile(
  client: S3ClientCore,
  file: File,
  config: PigoConfig
): Promise<StandaloneFileResult> {
  const buffer = new Uint8Array(await file.arrayBuffer())
  const contentType = normalizeImageType(file, buffer)
  const ext = extensionFromFileName(file.name) || extensionFromMime(contentType) || 'png'
  const fileName = file.name || `image-${Date.now()}.${ext}`
  const key = await buildObjectKey({ fileName, ext, buffer }, config.s3.uploadPath)
  const put = await client.putObject(key, buffer, contentType)

  return {
    fileName,
    key,
    url: put.url,
    contentType,
    size: buffer.byteLength,
  }
}

export function isImageFile(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) {
    return true
  }
  return Boolean(mimeFromExtension(file.name || ''))
}

export function filterImageFiles(files: File[]): File[] {
  return files.filter(isImageFile)
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

function clamp(value: number, min: number, max: number): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.round(numberValue)))
}
