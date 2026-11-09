import {
  cloneConfig,
  DEFAULT_CONFIG,
  keyTemplateFromLegacyPath,
  normalizeConfig,
  type S3Config,
} from './config.ts'

export interface LegacyS3ImportResult {
  s3: S3Config
  source: string
  warnings: string[]
}

/**
 * 把旧 PicGo 配置（已解析的 JSON 对象）映射为 Pigo 的 S3 配置。
 *
 * 只读取公开字段，不修改原对象，便于单元测试和迁移。
 */
export function mapLegacyPicgoConfig(parsed: Record<string, any>): LegacyS3ImportResult | null {
  const picBed = isPlainObject(parsed.picBed) ? parsed.picBed as Record<string, any> : {}
  const uploader = String(picBed.uploader || picBed.current || '')
  const tcYun = isPlainObject(picBed.tcyun) ? picBed.tcyun as Record<string, any> : null
  const awsS3 = isPlainObject(picBed.awss3) ? picBed.awss3 as Record<string, any> : null

  if (uploader === 'tcyun' && tcYun) {
    return mapTcYunConfig(tcYun)
  }
  if (uploader === 'awss3' && awsS3) {
    return mapAwsS3Config(awsS3)
  }
  if (awsS3) {
    return mapAwsS3Config(awsS3)
  }
  if (tcYun) {
    return mapTcYunConfig(tcYun)
  }

  return null
}

export function parseLegacyConfig(raw: unknown): Record<string, any> | null {
  if (isPlainObject(raw)) {
    if (typeof (raw as any).code === 'number') {
      return null
    }
    return raw as Record<string, any>
  }

  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      return isPlainObject(parsed) ? parsed as Record<string, any> : null
    }
    catch {
      return null
    }
  }

  return null
}

function mapTcYunConfig(raw: Record<string, any>): LegacyS3ImportResult {
  const region = String(raw.area || '').trim()
  const bucket = String(raw.bucket || '').trim()
  const customUrl = trimTrailingSlash(String(raw.customUrl || ''))
    || (bucket && region ? `https://${bucket}.cos.${region}.myqcloud.com` : '')
  const warnings: string[] = []

  if (!raw.secretId || !raw.secretKey) {
    warnings.push('旧腾讯云配置缺少 secretId/secretKey，请手动补全。')
  }
  if (!customUrl) {
    warnings.push('旧配置没有 customUrl，已按 COS 规则推导；如使用自定义域名请补充。')
  }

  return {
    source: 'tcyun',
    warnings,
    s3: normalizeS3({
      endpoint: region ? `https://cos.${region}.myqcloud.com` : '',
      region,
      bucket,
      accessKeyId: String(raw.secretId || ''),
      secretAccessKey: String(raw.secretKey || ''),
      uploadPath: keyTemplateFromLegacyPath(String(raw.path || '')),
      customUrl,
      extraUrlPrefixes: dedupe([customUrl]),
      pathStyleAccess: false,
      acl: 'public-read',
      useSiyuanProxy: true,
      timeoutMs: 60000,
    }),
  }
}

function mapAwsS3Config(raw: Record<string, any>): LegacyS3ImportResult {
  const customUrl = trimTrailingSlash(String(raw.customUrl || ''))
  const warnings: string[] = []

  if (!raw.accessKeyID || !raw.secretAccessKey) {
    warnings.push('旧 S3 配置缺少 accessKeyID/secretAccessKey，请手动补全。')
  }

  return {
    source: 'awss3',
    warnings,
    s3: normalizeS3({
      endpoint: trimTrailingSlash(String(raw.endpoint || '')),
      region: String(raw.region || '').trim(),
      bucket: String(raw.bucketName || '').trim(),
      accessKeyId: String(raw.accessKeyID || ''),
      secretAccessKey: String(raw.secretAccessKey || ''),
      uploadPath: keyTemplateFromLegacyPath(String(raw.uploadPath || '')),
      customUrl,
      extraUrlPrefixes: dedupe([customUrl]),
      pathStyleAccess: Boolean(raw.pathStyleAccess),
      acl: String(raw.acl || 'public-read'),
      useSiyuanProxy: true,
      timeoutMs: 60000,
    }),
  }
}

function normalizeS3(config: S3Config): S3Config {
  return normalizeConfig({
    ...cloneConfig(DEFAULT_CONFIG),
    s3: config,
  }).s3
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function dedupe(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => trimTrailingSlash(value || '')).filter(Boolean))]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
