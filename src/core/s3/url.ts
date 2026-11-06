import type { S3Config } from '../config'

export function buildObjectUrl(
  config: S3Config,
  key: string,
  query: Record<string, string | number | undefined> = {}
): string {
  const endpoint = normalizeEndpoint(config.endpoint)
  const bucket = config.bucket.trim()
  const encodedKey = encodeKeyPath(key)
  let baseUrl: string

  if (config.pathStyleAccess) {
    baseUrl = joinUrl(endpoint, bucket, encodedKey)
  }
  else {
    baseUrl = buildVirtualHostUrl(endpoint, bucket, encodedKey)
  }

  const params = new URLSearchParams()
  Object.entries(query).forEach(([name, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    params.set(name, String(value))
  })

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

export function buildPublicUrl(config: S3Config, key: string): string {
  const customUrl = normalizeEndpoint(config.customUrl)
  if (customUrl) {
    return `${customUrl}/${encodeKeyPath(key)}`
  }
  return buildObjectUrl(config, key)
}

export function encodeKeyPath(key: string): string {
  return key
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildVirtualHostUrl(endpoint: string, bucket: string, encodedKey: string): string {
  try {
    const endpointUrl = new URL(endpoint)
    const pathPrefix = endpointUrl.pathname.replace(/\/+$/, '')
    const host = `${bucket}.${endpointUrl.host}`
    return joinUrl(`${endpointUrl.protocol}//${host}${pathPrefix}`, encodedKey)
  }
  catch {
    return joinUrl(endpoint, bucket, encodedKey)
  }
}

function joinUrl(...parts: string[]): string {
  return parts
    .filter((part) => part !== '')
    .join('/')
    .replace(/([^:]\/)\/{2,}/g, '$1')
    .replace(/\/+$/, '')
}

function normalizeEndpoint(value: string): string {
  return (value || '').trim().replace(/\/+$/, '')
}
