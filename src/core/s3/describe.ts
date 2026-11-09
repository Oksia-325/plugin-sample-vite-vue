import type { S3Config } from '../config.ts'

export interface StorageDescriptor {
  vendor: string
  region: string
  label: string
}

interface VendorRule {
  pattern: RegExp
  vendor: string
}

/**
 * 只做展示用的供应商识别：按 endpoint / customUrl 的 host 判断。
 * 未识别的端点统一显示“S3 兼容存储”，不做任何上传行为分支。
 */
const VENDOR_RULES: VendorRule[] = [
  { pattern: /(^|\.)myqcloud\.com$/i, vendor: 'Tencent COS' },
  { pattern: /(^|\.)aliyuncs\.com$/i, vendor: 'Aliyun OSS' },
  { pattern: /(^|\.)amazonaws\.com(\.cn)?$/i, vendor: 'AWS S3' },
  { pattern: /(^|\.)myhuaweicloud\.com$/i, vendor: 'Huawei OBS' },
  { pattern: /(^|\.)jdcloud\.com$/i, vendor: 'JD Cloud OSS' },
  { pattern: /(^|\.)qiniucs\.com$/i, vendor: 'Qiniu Kodo' },
  { pattern: /(^|\.)qiniu\.com$/i, vendor: 'Qiniu Kodo' },
  { pattern: /(^|\.)upyun\.com$/i, vendor: 'UPYUN' },
  { pattern: /(^|\.)volces\.com$/i, vendor: 'Volcengine TOS' },
  { pattern: /(^|\.)backblazeb2\.com$/i, vendor: 'Backblaze B2' },
  { pattern: /(^|\.)digitaloceanspaces\.com$/i, vendor: 'DigitalOcean Spaces' },
  { pattern: /(^|\.)cloudflarestorage\.com$/i, vendor: 'Cloudflare R2' },
  { pattern: /(^|\.)storage\.googleapis\.com$/i, vendor: 'Google Cloud Storage' },
  { pattern: /(^|\.)aliyun-inc\.com$/i, vendor: 'Aliyun OSS' },
]

const MINIO_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal)$/i
const IP_HOST = /^\d{1,3}(\.\d{1,3}){3}$/

export function detectStorageVendor(source: string): string {
  const host = extractHost(source)
  if (!host) {
    return ''
  }
  if (MINIO_HOST.test(host) || IP_HOST.test(host) || host.includes('minio')) {
    return 'MinIO'
  }
  const rule = VENDOR_RULES.find(item => item.pattern.test(host))
  return rule ? rule.vendor : 'S3 兼容存储'
}

export function describeStorage(
  s3: Pick<S3Config, 'endpoint' | 'customUrl' | 'region'>
): StorageDescriptor {
  const source = (s3.endpoint || s3.customUrl || '').trim()
  const region = (s3.region || '').trim()

  if (!source) {
    return { vendor: '', region, label: '未配置' }
  }

  const vendor = detectStorageVendor(source) || 'S3 兼容存储'
  const label = region ? `${vendor} (${region})` : vendor

  return { vendor, region, label }
}

function extractHost(source: string): string {
  const raw = (source || '').trim()
  if (!raw) {
    return ''
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withScheme).hostname.toLowerCase()
  }
  catch {
    return ''
  }
}
