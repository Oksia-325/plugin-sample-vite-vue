export type PigoErrorCode =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'not-found'
  | 'invalid-request'
  | 'server'
  | 'invalid-config'
  | 'file'
  | 'cancelled'
  | 'unknown'

export class PigoError extends Error {
  public readonly code: PigoErrorCode
  public readonly detail?: string

  constructor(code: PigoErrorCode, message: string, detail?: string) {
    super(message)
    this.name = 'PigoError'
    this.code = code
    this.detail = detail
  }
}

/**
 * 把底层异常转换成可读的中文提示。
 */
export function toPigoError(error: unknown): PigoError {
  if (error instanceof PigoError) {
    return error
  }

  const raw = error instanceof Error ? error.message : String(error)
  const message = raw || '未知错误'

  if (/S3 401|S3 403|AccessDenied|SignatureDoesNotMatch|InvalidAccessKeyId|NoSuchBucket/i.test(message)) {
    return new PigoError(
      'auth',
      'S3 拒绝访问：请检查 AccessKey/SecretKey、桶权限或 ACL 设置。',
      message
    )
  }

  if (/S3 404|NoSuchKey|Not Found/i.test(message)) {
    return new PigoError('not-found', '目标对象或文件不存在（404）。', message)
  }

  if (/S3 400|InvalidArgument|InvalidRequest|MalformedXML/i.test(message)) {
    return new PigoError('invalid-request', 'S3 请求参数或签名无效（400）。', message)
  }

  if (/S3 429|S3 5\d\d|SlowDown|InternalError|ServiceUnavailable/i.test(message)) {
    return new PigoError('server', 'S3 服务端暂时不可用或触发限流，请稍后重试。', message)
  }

  if (/AbortError|timed? ?out|TimeoutError/i.test(message)) {
    return new PigoError('timeout', '请求超时，请检查网络或适当调大超时时间。', message)
  }

  if (/Failed to fetch|NetworkError|fetch failed|ECONN|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return new PigoError(
      'network',
      '网络请求失败：请检查网络、Endpoint、跨域设置，或开启“通过思源内核代理访问 S3”。',
      message
    )
  }

  if (/本地资源读取失败|网络图片读取失败/.test(message)) {
    return new PigoError('file', message)
  }

  if (/请先打开一篇笔记|配置不完整|请填写|配置/.test(message)) {
    return new PigoError('invalid-config', message)
  }

  return new PigoError('unknown', message)
}

export function toUserMessage(error: unknown): string {
  return toPigoError(error).message
}

/**
 * 给日志使用：保留原始错误细节，便于排查。
 */
export function toErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`
  }
  return String(error)
}
