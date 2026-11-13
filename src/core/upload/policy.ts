import type { PigoConfig } from '../config.ts'

export interface ReplaceLinkOptions {
  /** 只修链接、不重新上传对象：此时必须替换链接，否则修复没有意义。 */
  repairOnly?: boolean
  /** 显式覆盖「上传后替换文档链接」开关。 */
  replaceLink?: boolean
}

/**
 * 纯函数：决定本次任务是否要把文档里的图片链接替换成 S3 地址。
 *
 * 「修复 S3 链接」本身就是为了替换链接，因此 `repairOnly` 必须强制替换，
 * 不能再受用户配置里的 `behavior.replaceLink` 影响。
 */
export function shouldReplaceLinks(
  config: Pick<PigoConfig, 'behavior'>,
  options: ReplaceLinkOptions = {}
): boolean {
  if (options.repairOnly) {
    return true
  }
  return options.replaceLink ?? config.behavior.replaceLink
}
