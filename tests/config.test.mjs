import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cloneConfig,
  DEFAULT_CONFIG,
  keyTemplateFromLegacyPath,
  mergeConfig,
  normalizeConfig,
  validateConfig,
} from '../src/core/config.ts'

function createValidConfig() {
  const config = cloneConfig(DEFAULT_CONFIG)
  config.s3.endpoint = 'https://cos.ap-guangzhou.myqcloud.com'
  config.s3.region = 'ap-guangzhou'
  config.s3.bucket = 'picgo-1312673255'
  config.s3.accessKeyId = 'test-ak'
  config.s3.secretAccessKey = 'test-sk'
  config.s3.customUrl = 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com'
  return config
}

test('default config has the Phase 1 S3 and behavior defaults', () => {
  assert.equal(DEFAULT_CONFIG.version, 1)
  assert.equal(DEFAULT_CONFIG.s3.uploadPath, 'siyuan/{year}/{month}/{md5}.{ext}')
  assert.equal(DEFAULT_CONFIG.s3.useSiyuanProxy, true)
  assert.equal(DEFAULT_CONFIG.behavior.concurrency, 4)
  assert.equal(DEFAULT_CONFIG.behavior.autoUploadOnPaste, true)
})

test('mergeConfig returns defaults for empty data', () => {
  const merged = mergeConfig(null)

  assert.equal(merged.s3.uploadPath, DEFAULT_CONFIG.s3.uploadPath)
  assert.equal(merged.behavior.concurrency, DEFAULT_CONFIG.behavior.concurrency)
})

test('mergeConfig keeps partial user data and fills missing fields', () => {
  const merged = mergeConfig({
    s3: {
      bucket: 'my-bucket',
    },
    behavior: {
      concurrency: 8,
    },
  })

  assert.equal(merged.s3.bucket, 'my-bucket')
  assert.equal(merged.s3.endpoint, '')
  assert.equal(merged.behavior.concurrency, 8)
  assert.equal(merged.behavior.replaceLink, true)
})

test('normalizeConfig trims URLs and repairs a prefix-only upload path', () => {
  const config = createValidConfig()
  config.s3.endpoint = '  https://cos.ap-guangzhou.myqcloud.com/  '
  config.s3.customUrl = '  https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/  '
  config.s3.uploadPath = '/siyuan/'

  const normalized = normalizeConfig(config)

  assert.equal(normalized.s3.endpoint, 'https://cos.ap-guangzhou.myqcloud.com')
  assert.equal(normalized.s3.customUrl, 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com')
  assert.equal(normalized.s3.uploadPath, 'siyuan/{md5}.{ext}')
})

test('validateConfig accepts a complete S3 config', () => {
  const issues = validateConfig(createValidConfig())

  assert.deepEqual(issues, [])
})

test('validateConfig rejects missing credentials and invalid concurrency', () => {
  const config = createValidConfig()
  config.s3.accessKeyId = ''
  config.s3.secretAccessKey = ''
  config.behavior.concurrency = 99

  const fields = validateConfig(config).map((issue) => issue.field)

  assert.ok(fields.includes('s3.accessKeyId'))
  assert.ok(fields.includes('s3.secretAccessKey'))
  assert.ok(fields.includes('behavior.concurrency'))
})

test('validateConfig requires a safe upload path template', () => {
  const config = createValidConfig()
  config.s3.uploadPath = 'siyuan/'

  const fields = validateConfig(config).map((issue) => issue.field)

  assert.ok(fields.includes('s3.uploadPath'))
})

test('keyTemplateFromLegacyPath converts old COS prefixes', () => {
  assert.equal(keyTemplateFromLegacyPath('siyuan/'), 'siyuan/{year}/{month}/{md5}.{ext}')
  assert.equal(keyTemplateFromLegacyPath('/siyuan/'), 'siyuan/{year}/{month}/{md5}.{ext}')
  assert.equal(keyTemplateFromLegacyPath('notes/images/'), 'notes/images/{year}/{month}/{md5}.{ext}')
  assert.equal(keyTemplateFromLegacyPath(''), DEFAULT_CONFIG.s3.uploadPath)
  assert.equal(keyTemplateFromLegacyPath('custom/{fullName}'), 'custom/{fullName}')
})
