import type { S3Config } from '../config'

/**
 * 把 S3 公网 URL 反推为对象 key。
 *
 * 支持：
 * - customUrl / extraUrlPrefixes（自定义域名、CDN）
 * - 虚拟主机风格：https://bucket.endpoint/key
 * - 路径风格：https://endpoint/bucket/key
 * - 腾讯云 COS：https://bucket.cos.region.myqcloud.com/key
 * - AWS S3：https://bucket.s3.region.amazonaws.com/key
 */
export function matchS3Key(url: string, config: S3Config): string | undefined {
  if (!url || !/^https?:\/\//i.test(url)) {
    return undefined
  }

  const cleanUrl = stripQuery(url)
  const prefixes = buildUrlPrefixes(config)

  for (const prefix of prefixes) {
    if (startsWithIgnoreCase(cleanUrl, prefix)) {
      const key = safeDecode(cleanUrl.slice(prefix.length))
      if (key) {
        return key
      }
    }
  }

  return undefined
}

export function isS3Url(url: string, config: S3Config): boolean {
  return typeof matchS3Key(url, config) === 'string'
}

function buildUrlPrefixes(config: S3Config): string[] {
  const prefixes: string[] = []

  addPrefix(prefixes, config.customUrl)
  config.extraUrlPrefixes.forEach((prefix) => addPrefix(prefixes, prefix))

  const endpoint = normalizePrefix(config.endpoint)
  const bucket = (config.bucket || '').trim()
  const region = (config.region || '').trim()

  if (endpoint && bucket) {
    let endpointUrl: URL | null = null
    try {
      endpointUrl = new URL(endpoint)
    }
    catch {
      endpointUrl = null
    }

    if (endpointUrl) {
      const protocol = endpointUrl.protocol
      const host = endpointUrl.host

      if (config.pathStyleAccess) {
        addPrefix(prefixes, `${endpointUrl.origin}/${bucket}`)
        addPrefix(prefixes, `${endpoint}/${bucket}`)
      }

      addPrefix(prefixes, `${protocol}//${bucket}.${host}`)
    }

    if (region) {
      addPrefix(prefixes, `https://${bucket}.cos.${region}.myqcloud.com`)
      addPrefix(prefixes, `https://${bucket}.s3.${region}.amazonaws.com`)
      addPrefix(prefixes, `https://${bucket}.s3-${region}.amazonaws.com`)
      addPrefix(prefixes, `https://s3.${region}.amazonaws.com/${bucket}`)
      addPrefix(prefixes, `https://s3-${region}.amazonaws.com/${bucket}`)
    }
  }

  return [...new Set(prefixes)]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
}

function addPrefix(prefixes: string[], value: string | undefined): void {
  const prefix = normalizePrefix(value)
  if (prefix) {
    prefixes.push(prefix)
  }
}

function normalizePrefix(value: string | undefined): string {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

function stripQuery(url: string): string {
  return url.split('#')[0].split('?')[0]
}

function startsWithIgnoreCase(source: string, prefix: string): boolean {
  return source.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase()
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}
