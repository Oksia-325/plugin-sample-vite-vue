import { reactive } from 'vue'
import type { Plugin } from 'siyuan'
import { getFile } from '@/api'
import {
  cloneConfig,
  CONFIG_STORAGE_NAME,
  DEFAULT_CONFIG,
  keyTemplateFromLegacyPath,
  mergeConfig,
  normalizeConfig,
  validateConfig,
  type PigoConfig,
  type S3Config,
  type ValidationIssue,
} from './config'

interface ConfigState {
  config: PigoConfig
  loaded: boolean
  loading: boolean
  saving: boolean
  error: string
  validation: ValidationIssue[]
}

export interface LegacyS3ImportResult {
  s3: S3Config
  source: string
  warnings: string[]
}

const LEGACY_CONFIG_PATH = '/data/storage/syp/picgo/picgo.cfg.json'

export const configState = reactive<ConfigState>({
  config: cloneConfig(DEFAULT_CONFIG),
  loaded: false,
  loading: false,
  saving: false,
  error: '',
  validation: [],
})

let loadPromise: Promise<void> | null = null

export function usePigoConfigStore() {
  return configState
}

export async function ensureConfigLoaded(plugin: Plugin): Promise<void> {
  if (configState.loaded) {
    return
  }

  if (loadPromise) {
    return await loadPromise
  }

  loadPromise = (async () => {
    configState.loading = true
    configState.error = ''
    try {
      const raw = await plugin.loadData(CONFIG_STORAGE_NAME)
      configState.config = mergeConfig(raw)
      configState.loaded = true
    }
    catch (error) {
      configState.error = errorToMessage(error)
    }
    finally {
      configState.loading = false
      loadPromise = null
    }
  })()

  await loadPromise
}

export async function savePigoConfig(plugin: Plugin): Promise<{ ok: boolean, issues: ValidationIssue[] }> {
  const issues = validateConfig(configState.config)
  configState.validation = issues

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  const normalized = normalizeConfig(configState.config)

  configState.saving = true
  configState.error = ''
  try {
    await plugin.saveData(CONFIG_STORAGE_NAME, normalized)
    configState.config = normalized
    configState.loaded = true
    configState.validation = []
    return { ok: true, issues: [] }
  }
  catch (error) {
    configState.error = errorToMessage(error)
    return { ok: false, issues: [{ field: 'config', message: configState.error }] }
  }
  finally {
    configState.saving = false
  }
}

export function resetPigoConfig(): void {
  configState.config = cloneConfig(DEFAULT_CONFIG)
  configState.validation = []
  configState.error = ''
}

export async function readLegacyPicgoS3Config(): Promise<LegacyS3ImportResult | null> {
  let raw: unknown
  try {
    raw = await getFile(LEGACY_CONFIG_PATH)
  }
  catch {
    return null
  }

  const parsed = parseLegacyConfig(raw)
  if (!parsed) {
    return null
  }

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

function mapTcYunConfig(raw: Record<string, any>): LegacyS3ImportResult {
  const region = String(raw.area || '').trim()
  const bucket = String(raw.bucket || '').trim()
  const customUrl = trimTrailingSlash(String(raw.customUrl || '')) || (bucket && region ? `https://${bucket}.cos.${region}.myqcloud.com` : '')
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

function parseLegacyConfig(raw: unknown): Record<string, any> | null {
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

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function dedupe(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => trimTrailingSlash(value || '')).filter(Boolean))]
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
