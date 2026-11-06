export interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  uploadPath: string
  customUrl: string
  extraUrlPrefixes: string[]
  pathStyleAccess: boolean
  acl: string
  useSiyuanProxy: boolean
  timeoutMs: number
}

export interface BehaviorConfig {
  autoUploadOnPaste: boolean
  replaceLink: boolean
  allowPicAndText: boolean
  concurrency: number
  includeTitleImage: boolean
  includeRemoteImages: boolean
  skipIfAlreadyS3: boolean
  debug: boolean
}

export interface PigoMigrationState {
  fromPicgo?: boolean
  migratedAt?: number
}

export interface PigoConfig {
  version: 1
  s3: S3Config
  behavior: BehaviorConfig
  migration?: PigoMigrationState
}

export interface ValidationIssue {
  field: string
  message: string
}

export const CONFIG_STORAGE_NAME = 'config'

export const ACL_OPTIONS = [
  { value: '', label: '不设置 ACL' },
  { value: 'public-read', label: 'public-read' },
  { value: 'private', label: 'private' },
  { value: 'authenticated-read', label: 'authenticated-read' },
  { value: 'public-read-write', label: 'public-read-write' },
]

export const DEFAULT_CONFIG: PigoConfig = {
  version: 1,
  s3: {
    endpoint: '',
    region: '',
    bucket: '',
    accessKeyId: '',
    secretAccessKey: '',
    uploadPath: 'siyuan/{year}/{month}/{md5}.{ext}',
    customUrl: '',
    extraUrlPrefixes: [],
    pathStyleAccess: false,
    acl: 'public-read',
    useSiyuanProxy: true,
    timeoutMs: 60000,
  },
  behavior: {
    autoUploadOnPaste: true,
    replaceLink: true,
    allowPicAndText: false,
    concurrency: 4,
    includeTitleImage: true,
    includeRemoteImages: true,
    skipIfAlreadyS3: true,
    debug: false,
  },
}

const KEY_TEMPLATE_VARIABLES = [
  '{year}',
  '{month}',
  '{day}',
  '{timestamp}',
  '{timestampMS}',
  '{md5}',
  '{sha256}',
  '{ext}',
  '{filename}',
  '{fullName}',
]

export function cloneConfig(config: PigoConfig = DEFAULT_CONFIG): PigoConfig {
  return JSON.parse(JSON.stringify(config)) as PigoConfig
}

export function mergeConfig(raw: unknown): PigoConfig {
  const rawObject = isPlainObject(raw) ? raw as Record<string, any> : {}
  const rawS3 = isPlainObject(rawObject.s3) ? rawObject.s3 as Record<string, any> : {}
  const rawBehavior = isPlainObject(rawObject.behavior) ? rawObject.behavior as Record<string, any> : {}
  const rawMigration = isPlainObject(rawObject.migration) ? rawObject.migration as PigoMigrationState : undefined

  return normalizeConfig({
    ...cloneConfig(DEFAULT_CONFIG),
    ...rawObject,
    version: 1,
    s3: {
      ...DEFAULT_CONFIG.s3,
      ...rawS3,
    },
    behavior: {
      ...DEFAULT_CONFIG.behavior,
      ...rawBehavior,
    },
    migration: rawMigration,
  } as PigoConfig)
}

export function normalizeConfig(input: PigoConfig): PigoConfig {
  const s3 = input.s3 ?? DEFAULT_CONFIG.s3
  const behavior = input.behavior ?? DEFAULT_CONFIG.behavior

  const endpoint = trimString(s3.endpoint).replace(/\/+$/, '')
  const customUrl = trimString(s3.customUrl).replace(/\/+$/, '')
  const uploadPath = normalizeUploadPath(s3.uploadPath)
  const extraUrlPrefixes = uniqueStrings(
    (Array.isArray(s3.extraUrlPrefixes) ? s3.extraUrlPrefixes : [])
      .map((item) => trimString(item).replace(/\/+$/, ''))
      .filter(Boolean)
  )

  return {
    version: 1,
    s3: {
      endpoint,
      region: trimString(s3.region),
      bucket: trimString(s3.bucket),
      accessKeyId: trimString(s3.accessKeyId),
      secretAccessKey: trimString(s3.secretAccessKey),
      uploadPath,
      customUrl,
      extraUrlPrefixes,
      pathStyleAccess: Boolean(s3.pathStyleAccess),
      acl: trimString(s3.acl),
      useSiyuanProxy: s3.useSiyuanProxy !== false,
      timeoutMs: clampNumber(s3.timeoutMs, 5000, 300000, DEFAULT_CONFIG.s3.timeoutMs),
    },
    behavior: {
      autoUploadOnPaste: behavior.autoUploadOnPaste !== false,
      replaceLink: behavior.replaceLink !== false,
      allowPicAndText: Boolean(behavior.allowPicAndText),
      concurrency: Math.round(clampNumber(behavior.concurrency, 1, 10, DEFAULT_CONFIG.behavior.concurrency)),
      includeTitleImage: behavior.includeTitleImage !== false,
      includeRemoteImages: behavior.includeRemoteImages !== false,
      skipIfAlreadyS3: behavior.skipIfAlreadyS3 !== false,
      debug: Boolean(behavior.debug),
    },
    migration: input.migration,
  }
}

export function validateConfig(input: PigoConfig): ValidationIssue[] {
  const s3 = input.s3 ?? DEFAULT_CONFIG.s3
  const behavior = input.behavior ?? DEFAULT_CONFIG.behavior
  const issues: ValidationIssue[] = []

  const endpoint = trimString(s3.endpoint)
  const region = trimString(s3.region)
  const bucket = trimString(s3.bucket)
  const accessKeyId = trimString(s3.accessKeyId)
  const secretAccessKey = trimString(s3.secretAccessKey)
  const customUrl = trimString(s3.customUrl)
  const acl = trimString(s3.acl)
  const rawUploadPath = trimString(s3.uploadPath)
  const uploadPath = rawUploadPath.replace(/\\/g, '/').replace(/^\/+/, '')

  if (!endpoint) {
    issues.push({ field: 's3.endpoint', message: '请填写 S3 Endpoint' })
  }
  else if (!isHttpUrl(endpoint)) {
    issues.push({ field: 's3.endpoint', message: 'Endpoint 必须是 http:// 或 https:// 开头的地址' })
  }

  if (!region) {
    issues.push({ field: 's3.region', message: '请填写 Region' })
  }

  if (!bucket) {
    issues.push({ field: 's3.bucket', message: '请填写 Bucket' })
  }
  else if (/[/\\\s]/.test(bucket)) {
    issues.push({ field: 's3.bucket', message: 'Bucket 不能包含斜杠或空格' })
  }

  if (!accessKeyId) {
    issues.push({ field: 's3.accessKeyId', message: '请填写 AccessKeyId' })
  }

  if (!secretAccessKey) {
    issues.push({ field: 's3.secretAccessKey', message: '请填写 SecretAccessKey' })
  }

  if (!rawUploadPath) {
    issues.push({ field: 's3.uploadPath', message: '请填写上传路径模板' })
  }
  else {
    if (rawUploadPath.startsWith('/')) {
      issues.push({ field: 's3.uploadPath', message: '上传路径不能以 / 开头' })
    }
    if (uploadPath.includes('..')) {
      issues.push({ field: 's3.uploadPath', message: '上传路径不能包含 ..' })
    }
    if (!KEY_TEMPLATE_VARIABLES.some((variable) => uploadPath.includes(variable))) {
      issues.push({ field: 's3.uploadPath', message: '上传路径至少包含一个模板变量，例如 {md5} 或 {fullName}' })
    }
    if (!uploadPath.includes('{ext}') && !uploadPath.includes('{fullName}') && !uploadPath.includes('{filename}')) {
      issues.push({ field: 's3.uploadPath', message: '上传路径需要包含 {ext} 或 {fullName}，避免丢失文件扩展名' })
    }
  }

  if (customUrl && !isHttpUrl(customUrl)) {
    issues.push({ field: 's3.customUrl', message: 'CustomUrl 必须是 http:// 或 https:// 开头的地址' })
  }

  const extraPrefixes = Array.isArray(s3.extraUrlPrefixes) ? s3.extraUrlPrefixes : []
  extraPrefixes.forEach((prefix) => {
    if (!isHttpUrl(trimString(prefix))) {
      issues.push({ field: 's3.extraUrlPrefixes', message: `额外 URL 前缀不是合法地址：${prefix}` })
    }
  })

  if (acl && !ACL_OPTIONS.some((option) => option.value === acl)) {
    issues.push({ field: 's3.acl', message: 'ACL 不在允许的取值范围内' })
  }

  const concurrency = Number(behavior.concurrency)
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
    issues.push({ field: 'behavior.concurrency', message: '并发数必须是 1-10 的整数' })
  }

  const timeoutMs = Number(s3.timeoutMs)
  if (!Number.isFinite(timeoutMs) || timeoutMs < 5000 || timeoutMs > 300000) {
    issues.push({ field: 's3.timeoutMs', message: '超时时间必须在 5000-300000 毫秒之间' })
  }

  return issues
}

export function keyTemplateFromLegacyPath(path: string): string {
  const normalized = trimString(path).replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized) {
    return DEFAULT_CONFIG.s3.uploadPath
  }
  if (normalized.includes('{')) {
    return normalized
  }
  const prefix = normalized.endsWith('/') ? normalized : `${normalized}/`
  return `${prefix}{year}/{month}/{md5}.{ext}`
}

function normalizeUploadPath(path: string): string {
  let normalized = trimString(path).replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized) {
    normalized = DEFAULT_CONFIG.s3.uploadPath
  }
  if (normalized.endsWith('/')) {
    normalized = `${normalized}{md5}.{ext}`
  }
  return normalized
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numberValue)) {
    return fallback
  }
  return Math.min(max, Math.max(min, numberValue))
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value)
}
