export interface S3ObjectInfo {
  key: string
  size: number
  lastModified: string
  etag?: string
}

export interface ListBucketResult {
  objects: S3ObjectInfo[]
  isTruncated: boolean
  nextContinuationToken?: string
}

export function parseListBucketResult(xml: string): ListBucketResult {
  if (!xml) {
    return { objects: [], isTruncated: false }
  }

  const objects: S3ObjectInfo[] = []
  const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g
  let match: RegExpExecArray | null

  while ((match = contentsRegex.exec(xml)) !== null) {
    const block = match[1]
    const key = decodeXmlEntities(getTag(block, 'Key') || '')
    if (!key) {
      continue
    }

    objects.push({
      key,
      size: Number(getTag(block, 'Size') || 0) || 0,
      lastModified: getTag(block, 'LastModified') || '',
      etag: (getTag(block, 'ETag') || '').replace(/&quot;/g, '').replace(/"/g, '') || undefined,
    })
  }

  return {
    objects,
    isTruncated: (getTag(xml, 'IsTruncated') || '').toLowerCase() === 'true',
    nextContinuationToken: getTag(xml, 'NextContinuationToken') || undefined,
  }
}

export function buildDeleteObjectsXml(keys: string[]): string {
  const objects = keys
    .map((key) => `<Object><Key>${escapeXml(key)}</Key></Object>`)
    .join('')
  return `<Delete><Quiet>true</Quiet>${objects}</Delete>`
}

export interface S3DeleteError {
  key?: string
  code?: string
  message?: string
}

/**
 * 解析 DeleteObjects 响应中的逐对象错误（Quiet=true 时成功项不会返回）。
 */
export function parseDeleteObjectsErrors(xml: string): S3DeleteError[] {
  const errors: S3DeleteError[] = []
  if (!xml) {
    return errors
  }

  const regex = /<Error>([\s\S]*?)<\/Error>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1]
    errors.push({
      key: decodeXmlEntities(getTag(block, 'Key') || '') || undefined,
      code: getTag(block, 'Code') || undefined,
      message: getTag(block, 'Message') || undefined,
    })
  }

  return errors
}

export function decodeXmlEntities(value: string): string {
  if (!value || !value.includes('&')) {
    return value
  }

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    const lower = code.toLowerCase()
    if (lower.startsWith('#x')) {
      return safeCodePoint(Number.parseInt(lower.slice(2), 16), entity)
    }
    if (lower.startsWith('#')) {
      return safeCodePoint(Number.parseInt(lower.slice(1), 10), entity)
    }

    switch (lower) {
      case 'amp':
        return '&'
      case 'lt':
        return '<'
      case 'gt':
        return '>'
      case 'quot':
        return '"'
      case 'apos':
        return '\''
      default:
        return entity
    }
  })
}

function getTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`)
  return xml.match(regex)?.[1]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function safeCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isFinite(codePoint)) {
    return fallback
  }
  try {
    return String.fromCodePoint(codePoint)
  }
  catch {
    return fallback
  }
}
