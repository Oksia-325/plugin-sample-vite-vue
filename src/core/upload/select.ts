import type { PigoConfig } from '../config.ts'
import type { ImageRef, ImageSourceType } from '../scan/types.ts'

export interface RefSelectionOptions {
  /** 强制重新上传（包含已上传 S3 的图片）。 */
  force?: boolean
  /** 只修链接，不重新上传对象。 */
  repairOnly?: boolean
  includeTitleImage?: boolean
  includeRemoteImages?: boolean
  /** 显式限定来源类型；设置后优先于 includeRemoteImages。 */
  sourceTypes?: ImageSourceType[]
  /** 是否跳过已经是 S3 的图片；默认跟随设置项。 */
  skipIfAlreadyS3?: boolean
}

/**
 * 纯函数：从扫描结果中挑出本次要处理的图片。
 *
 * - 默认沿用配置里的“包含题头图 / 包含网络图片 / 跳过已上传 S3”
 * - `sourceTypes` 用于「上传本地图片」这类显式范围
 */
export function selectRefs(
  refs: ImageRef[],
  config: PigoConfig,
  options: RefSelectionOptions = {}
): ImageRef[] {
  const includeTitle = options.includeTitleImage ?? config.behavior.includeTitleImage
  const includeRemote = options.includeRemoteImages ?? config.behavior.includeRemoteImages
  const skipS3 = options.skipIfAlreadyS3 ?? config.behavior.skipIfAlreadyS3
  const sourceTypes = options.sourceTypes

  return refs.filter((ref) => {
    if (sourceTypes && !sourceTypes.includes(ref.sourceType)) {
      return false
    }
    if (ref.kind === 'title' && !includeTitle && !options.force) {
      return false
    }
    if (ref.sourceType === 'remote' && !includeRemote && !options.force) {
      return false
    }
    if (ref.sourceType === 's3' && !options.force && skipS3) {
      return false
    }
    if (options.repairOnly && ref.sourceType === 's3') {
      return false
    }
    return true
  })
}
