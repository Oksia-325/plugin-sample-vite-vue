import type { S3Config } from '../config'
import { createS3Client } from './client'
import { getStaticPrefix } from '../upload/keyTemplate'

export interface S3HealthResult {
  ok: boolean
  /** 展示用文案，例如「Tencent COS (ap-guangzhou) 连接正常」。 */
  message: string
  /** 失败原因，成功时为空。 */
  error: string
  checkedAt: number
  latencyMs: number
}

const HEALTH_CACHE_MS = 60_000

let cached: { key: string, result: S3HealthResult } | null = null
let inFlight: { key: string, promise: Promise<S3HealthResult> } | null = null

/**
 * 只读健康检查：`listObjectsV2` 取 1 个对象，不写入、不删除任何数据。
 * 结果按配置指纹缓存 60 秒；`force` 可跳过缓存。
 */
export async function checkS3Health(
  config: S3Config,
  options: { force?: boolean } = {}
): Promise<S3HealthResult> {
  const key = fingerprint(config)
  const now = Date.now()

  if (!options.force && cached && cached.key === key && now - cached.result.checkedAt < HEALTH_CACHE_MS) {
    return cached.result
  }

  if (!options.force && inFlight && inFlight.key === key) {
    return await inFlight.promise
  }

  const promise = probe(config, key)
  inFlight = { key, promise }

  try {
    return await promise
  }
  finally {
    if (inFlight?.promise === promise) {
      inFlight = null
    }
  }
}

export function clearS3HealthCache(): void {
  cached = null
  inFlight = null
}

async function probe(config: S3Config, key: string): Promise<S3HealthResult> {
  const startedAt = Date.now()
  const prefix = getStaticPrefix(config.uploadPath)
  let result: S3HealthResult

  try {
    // 健康检查只做一次轻量 list，超时收紧到 10s，避免配置错误的端点长时间转圈。
    const client = createS3Client({
      ...config,
      timeoutMs: Math.min(config.timeoutMs || 10_000, 10_000),
    })
    await client.listObjectsV2({ prefix: prefix || undefined, maxKeys: 1 })
    result = {
      ok: true,
      message: prefix ? `存储桶可访问（前缀 ${prefix}）` : '存储桶可访问',
      error: '',
      checkedAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result = {
      ok: false,
      message: `存储桶不可访问：${message}`,
      error: message,
      checkedAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    }
  }

  cached = { key, result }
  return result
}

function fingerprint(config: S3Config): string {
  // 密钥不直接入 key，用长度 + 前 4 位即可区分配置变更。
  const secret = String(config.secretAccessKey || '')
  return [
    config.endpoint,
    config.region,
    config.bucket,
    config.accessKeyId,
    `${secret.length}:${secret.slice(0, 4)}`,
    config.uploadPath,
    config.useSiyuanProxy ? '1' : '0',
    config.pathStyleAccess ? '1' : '0',
  ].join('|')
}
