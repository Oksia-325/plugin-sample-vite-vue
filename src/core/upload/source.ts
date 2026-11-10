import { fetchSyncPost } from 'siyuan'
import type { ImageRef } from '../scan/types'
import { extractFileName, hashString } from '../scan/parser.ts'
import { base64ToBytes } from '../s3/base64.ts'
import {
  detectImageContentType,
  extensionFromFileName,
  extensionFromMime,
} from './mime.ts'

const MAX_IMAGE_BYTES = 50 * 1024 * 1024

export interface SourceResult {
  buffer: Uint8Array
  contentType: string
  fileName: string
  ext: string
  size: number
  fileMapName: string
}

export interface ReadSourceOptions {
  readS3Object?: (key: string) => Promise<Uint8Array>
}

export async function readImageSource(ref: ImageRef, options: ReadSourceOptions = {}): Promise<SourceResult> {
  if (ref.sourceType === 'local' && ref.assetPath) {
    return await readLocalAsset(ref.assetPath, ref.url)
  }

  if (ref.sourceType === 'data') {
    return readDataUri(ref.url)
  }

  if (ref.sourceType === 's3' && ref.s3Key && options.readS3Object) {
    const buffer = await options.readS3Object(ref.s3Key)
    return buildSourceResult(buffer, ref.s3Key, ref.url, '')
  }

  return await readRemoteImage(ref.url)
}

async function readLocalAsset(assetPath: string, originUrl: string): Promise<SourceResult> {
  const kernelPath = `/data/${assetPath.replace(/^\/+/, '')}`
  const errors: string[] = []

  try {
    const response = await fetch('/api/file/getFile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: kernelPath }),
    })

    if (response.ok) {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const text = await response.text()
        const parsed = safeParseJson(text)
        if (parsed && typeof parsed.code === 'number' && parsed.code !== 0) {
          errors.push(String(parsed.msg || `code ${parsed.code}`))
        }
      }
      else {
        const buffer = new Uint8Array(await response.arrayBuffer())
        return buildSourceResult(buffer, assetPath, originUrl, '')
      }
    }
    else {
      errors.push(`HTTP ${response.status}`)
    }
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  try {
    const response = await fetch(encodeURI(`/${assetPath.replace(/^\/+/, '')}`), { cache: 'no-store' })
    if (response.ok) {
      const buffer = new Uint8Array(await response.arrayBuffer())
      return buildSourceResult(buffer, assetPath, originUrl, '')
    }
    errors.push(`HTTP ${response.status}`)
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  throw new Error(`本地资源读取失败：${assetPath}（${errors.join('; ')}）`)
}

const REMOTE_ATTEMPT_TIMEOUT_MS = 1500
const REMOTE_MAX_ATTEMPTS = 3
const REMOTE_RETRY_DELAY_MS = 200

/**
 * 网络图片读取：每次尝试最多 1.5s，失败重试，最多 3 次。
 * 直连和思源代理共享单次时间预算，避免失效图片长时间转圈。
 */
async function readRemoteImage(url: string): Promise<SourceResult> {
  const errors: string[] = []

  for (let attempt = 1; attempt <= REMOTE_MAX_ATTEMPTS; attempt++) {
    const deadline = Date.now() + REMOTE_ATTEMPT_TIMEOUT_MS

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: createTimeoutSignal(remainingMs(deadline)),
      })
      if (response.ok) {
        const buffer = new Uint8Array(await response.arrayBuffer())
        assertSize(buffer)
        return buildSourceResult(buffer, url, url, response.headers.get('content-type') || '')
      }
      errors.push(`HTTP ${response.status}`)
    }
    catch (error) {
      errors.push(describeNetworkError(error))
    }

    const proxyBudget = remainingMs(deadline)
    if (proxyBudget > 0) {
      try {
        const proxyResponse = await fetchSyncPost('/api/network/forwardProxy', {
          url,
          method: 'GET',
          timeout: proxyBudget,
          contentType: 'application/json',
          headers: [],
          payload: '',
          payloadEncoding: 'base64',
          responseEncoding: 'base64',
        })

        if (!proxyResponse || proxyResponse.code !== 0) {
          throw new Error(proxyResponse?.msg || '思源代理请求失败')
        }

        const data = proxyResponse.data || {}
        const status = Number(data.status || 0)
        if (status < 200 || status >= 300) {
          throw new Error(`HTTP ${status}`)
        }

        const buffer = base64ToBytes(String(data.body || ''))
        assertSize(buffer)
        return buildSourceResult(buffer, url, url, String(data.contentType || ''))
      }
      catch (error) {
        errors.push(describeNetworkError(error))
      }
    }

    if (attempt < REMOTE_MAX_ATTEMPTS) {
      await delay(REMOTE_RETRY_DELAY_MS)
    }
  }

  const detail = [...new Set(errors)].slice(-3).join('; ')
  throw new Error(`网络图片读取失败（可能已失效）：${url}${detail ? `（${detail}）` : ''}`)
}

function remainingMs(deadline: number): number {
  return Math.max(0, deadline - Date.now())
}

function describeNetworkError(error: unknown): string {
  if (error instanceof Error && (error.name === 'AbortError' || /abort|timeout/i.test(error.message))) {
    return '请求超时（1.5s）'
  }
  return error instanceof Error ? error.message : String(error)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function readDataUri(dataUri: string): SourceResult {
  const match = dataUri.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/)
  if (!match) {
    throw new Error('无效的 data URI')
  }

  const mime = match[1] || ''
  const isBase64 = Boolean(match[2])
  const payload = match[3] || ''
  const buffer = isBase64
    ? base64ToBytes(payload)
    : new TextEncoder().encode(decodeURIComponent(payload))

  assertSize(buffer)
  const ext = extensionFromMime(mime) || 'png'
  const fileName = `image-${hashString(dataUri)}.${ext}`
  return buildSourceResult(buffer, fileName, dataUri, mime)
}

function buildSourceResult(
  buffer: Uint8Array,
  fallbackFileName: string,
  originUrl: string,
  declaredContentType: string
): SourceResult {
  const contentType = normalizeContentType(declaredContentType, buffer, fallbackFileName)
  if (!contentType.startsWith('image/')) {
    throw new Error(`不是可识别的图片（Content-Type: ${contentType}）`)
  }

  const pathFileName = getUrlPathFileName(fallbackFileName)
  const ext = extensionFromFileName(pathFileName)
    || extensionFromMime(contentType)
    || 'bin'
  const rawName = originUrl.startsWith('data:')
    ? fallbackFileName
    : extractFileName(originUrl)
  const cleanName = sanitizeFileName(pathFileName)
  const fileName = extensionFromFileName(cleanName)
    ? cleanName
    : `image-${hashString(originUrl)}.${ext}`
  const fileMapName = originUrl.startsWith('data:')
    ? fileName
    : rawName || fileName

  return {
    buffer,
    contentType,
    fileName,
    ext,
    size: buffer.byteLength,
    fileMapName,
  }
}

function sanitizeFileName(value: string): string {
  const lastSegment = (value || '').split('/').pop() || ''
  return lastSegment
    .split('#')[0]
    .split('?')[0]
    .replace(/[\\:*?"<>|]/g, '_')
    .trim()
}

function getUrlPathFileName(value: string): string {
  const raw = (value || '').trim()
  if (!raw) {
    return ''
  }

  try {
    const url = new URL(raw)
    return safeDecode(url.pathname.split('/').pop() || '')
  }
  catch {
    return safeDecode(raw.split('/').pop() || raw)
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

function normalizeContentType(declared: string, buffer: Uint8Array, fileName: string): string {
  const normalized = (declared || '').split(';')[0].trim().toLowerCase()
  if (normalized.startsWith('image/')) {
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized
  }
  return detectImageContentType(buffer, fileName)
}

function assertSize(buffer: Uint8Array): void {
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`图片超过大小限制（${Math.round(buffer.byteLength / 1024 / 1024)}MB > 50MB）`)
  }
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text)
  }
  catch {
    return null
  }
}
