export interface AssetMeta {
  size?: number
  ext: string
}

const sizeCache = new Map<string, number | undefined>()

/**
 * 解析 `Content-Range: bytes 0-0/43461` 中的总大小。
 */
export function parseContentRange(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined
  }
  const match = value.match(/^bytes\s+\d+-\d+\/(\d+)$/i)
  if (!match) {
    return undefined
  }
  const total = Number(match[1])
  return Number.isFinite(total) ? total : undefined
}

/**
 * 从文件名或 URL 中取扩展名（小写，不含点）。
 */
export function extensionOf(nameOrUrl: string): string {
  const clean = (nameOrUrl || '').split('?')[0].split('#')[0]
  const base = clean.split('/').pop() || ''
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) {
    return ''
  }
  return base.slice(dot + 1).toLowerCase()
}

/**
 * 本地资源尺寸：
 * `assets` 表在新版思源里没有 size 字段，改用 Range 请求只取 1 字节，
 * 从 `Content-Range` 里读总大小。
 */
export async function readAssetSize(assetPath: string): Promise<number | undefined> {
  const relative = (assetPath || '').replace(/^\/+/, '')
  if (!relative) {
    return undefined
  }

  try {
    const response = await fetch(encodeURI(`/${relative}`), {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store',
    })
    if (!response.ok) {
      return undefined
    }

    const total = parseContentRange(response.headers.get('content-range'))
    if (total !== undefined) {
      return total
    }

    const length = Number(response.headers.get('content-length'))
    return Number.isFinite(length) && length > 0 ? length : undefined
  }
  catch {
    return undefined
  }
}

/**
 * 带缓存 + 失败不重试的资源尺寸读取。
 */
export async function getAssetSize(assetPath: string): Promise<number | undefined> {
  const key = (assetPath || '').replace(/^\/+/, '')
  if (!key) {
    return undefined
  }
  if (sizeCache.has(key)) {
    return sizeCache.get(key)
  }

  const size = await readAssetSize(key)
  sizeCache.set(key, size)
  return size
}

export function getAssetMeta(assetPath: string): AssetMeta {
  return {
    ext: extensionOf(assetPath),
  }
}

export function clearAssetSizeCache(): void {
  sizeCache.clear()
}
