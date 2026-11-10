import { fetchSyncPost } from 'siyuan'
import type { S3Config } from '../config'

export async function s3Fetch(request: Request, config: S3Config): Promise<Response> {
  if (config.useSiyuanProxy) {
    return await fetchViaSiyuanProxy(request, config)
  }

  try {
    return await fetch(request, { signal: createTimeoutSignal(config.timeoutMs) })
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`S3 直连失败：${reason}。可以在设置中开启“通过思源内核代理访问 S3”。`)
  }
}

async function fetchViaSiyuanProxy(request: Request, config: S3Config): Promise<Response> {
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
  const bodyBuffer = hasBody ? await request.clone().arrayBuffer() : new ArrayBuffer(0)
  const payload = bodyBuffer.byteLength > 0 ? arrayBufferToBase64(bodyBuffer) : ''
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
  const body = bodyEncoding === 'base64'
    ? base64ToArrayBuffer(rawBody)
    : new TextEncoder().encode(rawBody).buffer

  // HEAD 响应需要保留 content-length，否则 S3 对象大小会被当成未知。
  const responseHeaders = normalizeProxyHeaders(data.headers || {}, { keepContentLength: method === 'HEAD' })
  const noBody = method === 'HEAD' || status === 204 || status === 304

  return new Response(noBody ? null : body, {
    status: status || 500,
    statusText: String(data.statusText || ''),
    headers: responseHeaders,
  })
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (!base64) {
    return new ArrayBuffer(0)
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}
