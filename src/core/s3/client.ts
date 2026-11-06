import type { S3Config } from '../config'
import { getStaticPrefix } from '../upload/keyTemplate.ts'
import { createS3Core, type S3ClientCore } from './client-core.ts'
import { s3Fetch } from './transport.ts'

export interface TestConnectionStep {
  name: string
  ok: boolean
  message?: string
  durationMs?: number
}

export interface TestConnectionResult {
  ok: boolean
  steps: TestConnectionStep[]
  warnings: string[]
  errors: string[]
  latencyMs: number
}

export function createS3Client(config: S3Config): S3ClientCore {
  return createS3Core(config, (request) => s3Fetch(request, config))
}

export async function testS3Connection(config: S3Config): Promise<TestConnectionResult> {
  const startedAt = Date.now()
  const steps: TestConnectionStep[] = []
  const warnings: string[] = []
  const errors: string[] = []

  const missing = validateRequiredFields(config)
  if (missing.length > 0) {
    return {
      ok: false,
      steps: [{ name: '配置检查', ok: false, message: `缺少：${missing.join('、')}` }],
      warnings,
      errors: [`缺少：${missing.join('、')}`],
      latencyMs: Date.now() - startedAt,
    }
  }

  const client = createS3Client(config)
  const prefix = getStaticPrefix(config.uploadPath)
  const testKey = `${prefix}_pigo_test/${Date.now()}-${randomSuffix()}.txt`
  const testBody = new TextEncoder().encode('pigo s3 connection test')
  let written = false
  let deleted = false

  try {
    await runStep('读取存储桶', async () => {
      const result = await client.listObjectsV2({ prefix, maxKeys: 1 })
      return `可访问，前缀 ${prefix || '(桶根目录)'} 下返回 ${result.objects.length} 个对象`
    })

    await runStep('写入测试对象', async () => {
      const result = await client.putObject(testKey, testBody, 'text/plain')
      written = true
      return `已写入 ${result.key}`
    })

    await runStep('读取测试对象', async () => {
      const result = await client.headObject(testKey)
      if (!result.exists) {
        throw new Error('HEAD 返回 404')
      }
      return `读取成功，大小 ${result.contentLength ?? '未知'} 字节`
    })

    const publicUrl = client.buildPublicUrl(testKey)
    const publicCheck = await probePublicUrl(publicUrl)
    if (publicCheck.ok) {
      steps.push({
        name: '公网 URL 访问',
        ok: true,
        message: publicUrl,
        durationMs: publicCheck.durationMs,
      })
    }
    else {
      warnings.push(`公网 URL 访问失败：${publicCheck.message}。如果是私有桶可忽略；否则请检查 CustomUrl/ACL/桶策略。`)
    }

    await runStep('删除测试对象', async () => {
      await client.deleteObject(testKey)
      deleted = true
      return '测试对象已删除'
    })
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  finally {
    if (written && !deleted) {
      try {
        await client.deleteObject(testKey)
      }
      catch {
        warnings.push(`测试对象清理失败，请手动删除 ${testKey}`)
      }
    }
  }

  return {
    ok: errors.length === 0,
    steps,
    warnings,
    errors,
    latencyMs: Date.now() - startedAt,
  }

  async function runStep(name: string, action: () => Promise<string>): Promise<void> {
    const stepStartedAt = Date.now()
    try {
      const message = await action()
      steps.push({
        name,
        ok: true,
        message,
        durationMs: Date.now() - stepStartedAt,
      })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      steps.push({
        name,
        ok: false,
        message,
        durationMs: Date.now() - stepStartedAt,
      })
      throw error
    }
  }
}

function validateRequiredFields(config: S3Config): string[] {
  const missing: string[] = []
  if (!config.endpoint) {
    missing.push('Endpoint')
  }
  if (!config.region) {
    missing.push('Region')
  }
  if (!config.bucket) {
    missing.push('Bucket')
  }
  if (!config.accessKeyId) {
    missing.push('AccessKeyId')
  }
  if (!config.secretAccessKey) {
    missing.push('SecretAccessKey')
  }
  return missing
}

async function probePublicUrl(url: string): Promise<{ ok: boolean, message: string, durationMs: number }> {
  const startedAt = Date.now()
  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url, { signal: controller.signal })
    window.clearTimeout(timeout)
    return {
      ok: response.ok,
      message: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status} ${response.statusText}`,
      durationMs: Date.now() - startedAt,
    }
  }
  catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10)
}
