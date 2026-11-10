import { fetchSyncPost } from 'siyuan'
import type { S3Config } from '../config'
import { base64ToBytes, bytesToBase64 } from './base64.ts'

/** 请求体：直连时交给 fetch，代理时直接做 base64，避免再从 Request 里复制一份。 */
export type S3RequestBody = Uint8Array | ArrayBuffer | Blob | string | undefined

export async function s3Fetch(request: Request, config: S3Config, body?: S3RequestBody): Promise<Response> {
  if (config.useSiyuanProxy) {
    return await fetchViaSiyuanProxy(request, config, body)
  }

  try {
    return await fetch(request, { signal: createTimeoutSignal(config.timeoutMs) })
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`S3 直连失败：${reason}。可以在设置中开启“通过思源内核代理访问 S3”。`)
  }
}

async function fetchViaSiyuanProxy(
  request: Request,
  config: S3Config,
  body: S3RequestBody
): Promise<Response> {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, name) => {
    const lower = name.toLowerCase()
    if (lower === 'host' || lower === 'content-length') {
      return
    }
    headers[name] = value
  })

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const bodyBytes = hasBody ? await toBytes(body) : new Uint8Array(0)
  const payload = bodyBytes.byteLength > 0 ? bytesToBase64(bodyBytes) : ''
  const contentType = headers['content-type'] || headers['Content-Type'] || 'application/octet-stream'

  const response = await fetchSyncPost('/api/network/forwardProxy', {
    url: request.url,
    method,
    timeout: config.timeoutMs,
    contentType,
    headers: [headers],
    payload,
    payloadEncoding: 'base64',
    responseEncoding: 'base64',
  })

  if (!response || response.code !== 0) {
    throw new Error(`思源代理请求失败：${response?.msg || '未知错误'}`)
  }

  const data = response.data || {}
  const status = Number(data.status || 0)
  const bodyEncoding = String(data.bodyEncoding || '')
  const rawBody = String(data.body || '')
  const responseBytes = bodyEncoding === 'base64'
    ? base64ToBytes(rawBody)
    : new TextEncoder().encode(rawBody)

  // HEAD 响应需要保留 content-length，否则 S3 对象大小会被当成未知。
  const responseHeaders = normalizeProxyHeaders(data.headers || {}, { keepContentLength: method === 'HEAD' })
  const noBody = method === 'HEAD' || status === 204 || status === 304

  return new Response(noBody ? null : (responseBytes.buffer as ArrayBuffer), {
    status: status || 500,
    statusText: String(data.statusText || ''),
    headers: responseHeaders,
  })
}

async function toBytes(body: S3RequestBody): Promise<Uint8Array> {
  if (!body) {
    return new Uint8Array(0)
  }
  if (typeof body === 'string') {
    return new TextEncoder().encode(body)
  }
  if (body instanceof Uint8Array) {
    return body
  }
  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body)
  }
  return new Uint8Array(await body.arrayBuffer())
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const timeout = Math.max(5000, Number(timeoutMs) || 60000)
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeout)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return controller.signal
}

function normalizeProxyHeaders(
  headers: Record<string, unknown>,
  options: { keepContentLength?: boolean } = {}
): Record<string, string> {
  const normalized: Record<string, string> = {}

  Object.entries(headers).forEach(([name, value]) => {
    const lower = name.toLowerCase()
    if (lower === 'content-encoding' || lower === 'transfer-encoding') {
      return
    }
    if (lower === 'content-length' && !options.keepContentLength) {
      return
    }
    if (Array.isArray(value)) {
      normalized[name] = value.join(', ')
    }
    else if (value !== undefined && value !== null) {
      normalized[name] = String(value)
    }
  })

  return normalized
}
