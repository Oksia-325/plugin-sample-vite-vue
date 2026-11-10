import { fetchSyncPost } from 'siyuan'
import type { ImageRef } from '../scan/types'
import type { S3ClientCore } from '../s3/client-core'
import { findFileMapEntry, type FileMapEntry } from '../upload/fileMapPure'
import { getAssetSize } from './assetMeta'

const REMOTE_SIZE_TIMEOUT_MS = 1500

/**
 * 单个图片文件的字节大小（用于缩略图角标）。
 *
 * - 本地：Range 请求读 Content-Range；
 * - S3：优先 fileMap 中的本地原文件，其次 HEAD 对象；
 * - 网络：HEAD 取 content-length（直连 + 思源代理各尝试一次，不重试循环）；
 * - 失败一律返回 undefined，界面静默不显示大小。
 */
export async function resolveRefSize(
  ref: ImageRef,
  client: S3ClientCore,
  fileMap: Record<string, FileMapEntry> | undefined
): Promise<number | undefined> {
  if (ref.sourceType === 'local' && ref.assetPath) {
    return await getAssetSize(ref.assetPath)
  }

  if (ref.sourceType === 's3' && ref.s3Key) {
    // fileMap 的 originUrl 通常是本地 assets 路径：优先用它，避免额外 HEAD。
    const localPath = findS3OriginPath(fileMap, ref.url)
    if (localPath.startsWith('assets/')) {
      const localSize = await getAssetSize(localPath)
      if (localSize !== undefined) {
        return localSize
      }
    }

    try {
      const head = await client.headObject(ref.s3Key)
      return head.exists ? head.contentLength : undefined
    }
    catch {
      // S3 对象失效：只尝试一次，不重试、不显示大小。
      return undefined
    }
  }

  if (ref.sourceType === 'remote') {
    return await readRemoteSize(ref.url)
  }

  return undefined
}

/**
 * 缩略图角标：K 只显示整数，M 保留 1 位小数。
 */
export function formatSizeBadge(size: number | undefined): string {
  if (!size || !Number.isFinite(size) || size <= 0) {
    return ''
  }
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}K`
  }
  return `${(size / 1024 / 1024).toFixed(1)}M`
}

function findS3OriginPath(
  fileMap: Record<string, FileMapEntry> | undefined,
  s3Url: string
): string {
  if (!fileMap) {
    return ''
  }

  const direct = findFileMapEntry(fileMap, s3Url)?.originUrl
  if (direct) {
    return direct
  }

  // 图片已经替换成 S3 链接时，fileMap 的 originUrl 是本地路径，需要按上传后的 url 反查。
  const match = Object.values(fileMap).find((entry) => entry.url === s3Url)
  return match?.originUrl || ''
}

async function readRemoteSize(url: string): Promise<number | undefined> {
  if (!url || url.startsWith('data:')) {
    return undefined
  }

  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REMOTE_SIZE_TIMEOUT_MS)
    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
      if (response.ok) {
        const length = Number(response.headers.get('content-length'))
        if (Number.isFinite(length) && length > 0) {
          return length
        }
      }
    }
    finally {
      window.clearTimeout(timer)
    }
  }
  catch {
    // CORS 或网络失败时走思源代理。
  }

  try {
    const response = await fetchSyncPost('/api/network/forwardProxy', {
      url,
      method: 'HEAD',
      timeout: REMOTE_SIZE_TIMEOUT_MS,
      contentType: 'application/json',
      headers: [],
      payload: '',
      payloadEncoding: 'base64',
      responseEncoding: 'base64',
    })

    if (response?.code === 0) {
      const length = Number(headerValue(response.data?.headers, 'content-length'))
      if (Number.isFinite(length) && length > 0) {
        return length
      }
    }
  }
  catch {
    // 图片失效或代理不支持 HEAD：不重试、不显示大小。
  }

  return undefined
}

function headerValue(headers: Record<string, unknown> | undefined, name: string): string {
  if (!headers) {
    return ''
  }
  const key = Object.keys(headers).find((item) => item.toLowerCase() === name)
  if (!key) {
    return ''
  }
  const value = headers[key]
  return Array.isArray(value) ? value.join(', ') : String(value ?? '')
}

/**
 * 给一批 ref 并发补全尺寸。
 *
 * 失败也会回调 `setSize(id, undefined)`，调用方可以用「空结果」做负缓存，
 * 避免切换筛选时对失效图片反复请求。
 */
export async function fillRefSizes(
  targets: ImageRef[],
  client: S3ClientCore,
  getFileMap: (ref: ImageRef) => Record<string, FileMapEntry> | undefined,
  setSize: (id: string, size: number | undefined) => void
): Promise<void> {
  if (targets.length === 0) {
    return
  }

  let index = 0
  const workerCount = Math.min(4, targets.length)
  const workers = Array.from({ length: workerCount }, async () => {
    while (index < targets.length) {
      const ref = targets[index++]
      const size = await resolveRefSize(ref, client, getFileMap(ref))
      setSize(ref.id, size)
    }
  })

  await Promise.all(workers)
}
