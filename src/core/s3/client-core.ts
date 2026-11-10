import type { S3Config } from '../config'
import md5 from '../upload/vendor/md5.ts'
import { AwsClient } from './vendor/aws4fetch.ts'
import { buildObjectUrl, buildPublicUrl } from './url.ts'
import {
  buildDeleteObjectsXml,
  parseDeleteObjectsErrors,
  parseListBucketResult,
  type ListBucketResult,
  type S3DeleteError,
  type S3ObjectInfo,
} from './xml.ts'

export type S3RequestBody = Uint8Array | ArrayBuffer | Blob | string | undefined

/**
 * 发送 S3 请求。
 *
 * 第二个参数是原始请求体：代理模式不需要把 body 塞进 Request 再复制出来，
 * 直接交给 transport 做 base64，能少一次大图内存拷贝。
 */
export type S3Requester = (request: Request, body?: S3RequestBody) => Promise<Response>

export interface PutObjectResult {
  key: string
  url: string
  status: number
}

export interface HeadObjectResult {
  exists: boolean
  contentType?: string
  contentLength?: number
  etag?: string
}

export interface ListObjectsOptions {
  prefix?: string
  continuationToken?: string
  maxKeys?: number
}

export interface DeleteObjectsProgress {
  done: number
  total: number
  batch: number
  batchCount: number
}

export interface DeleteObjectsOptions {
  batchSize?: number
  onProgress?: (progress: DeleteObjectsProgress) => void
  isCancelled?: () => boolean
}

export interface DeleteObjectsResult {
  deleted: number
  failed: S3DeleteError[]
  cancelled: boolean
  batches: number
}

export interface S3ClientCore {
  listObjectsV2: (options?: ListObjectsOptions) => Promise<ListBucketResult>
  listAllObjects: (prefix: string, onPage?: (objects: S3ObjectInfo[], total: number) => void) => Promise<S3ObjectInfo[]>
  headObject: (key: string) => Promise<HeadObjectResult>
  getObject: (key: string) => Promise<Uint8Array>
  putObject: (key: string, body: Uint8Array | ArrayBuffer | Blob | string, contentType: string, acl?: string) => Promise<PutObjectResult>
  deleteObject: (key: string) => Promise<void>
  deleteObjectsBatched: (keys: string[], options?: DeleteObjectsOptions) => Promise<DeleteObjectsResult>
  buildPublicUrl: (key: string) => string
}

export function createS3Core(config: S3Config, requester: S3Requester): S3ClientCore {
  const signer = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: config.region || 'auto',
  } as any)

  async function signedRequest(
    method: string,
    key: string,
    options: {
      query?: Record<string, string | number | undefined>
      headers?: Record<string, string>
      body?: S3RequestBody
    } = {}
  ): Promise<Response> {
    const url = buildObjectUrl(config, key, options.query)
    const headers = options.headers ?? {}
    // S3 的普通请求使用 UNSIGNED-PAYLOAD，签名不需要 body；
    // 走思源代理时让 Request 保持空 body，避免 aws4fetch 再复制一份大图。
    const signBody = config.useSiyuanProxy ? undefined : options.body
    const request = await signer.sign(url, {
      method,
      headers,
      body: signBody,
    }) as Request
    return requester(request, options.body)
  }

  return {
    async listObjectsV2(options = {}) {
      const response = await signedRequest('GET', '', {
        query: {
          'list-type': '2',
          'max-keys': options.maxKeys ?? 1000,
          'prefix': options.prefix,
          'continuation-token': options.continuationToken,
        },
      })

      if (!response.ok) {
        throw await toS3Error(response)
      }

      return parseListBucketResult(await response.text())
    },

    async listAllObjects(prefix, onPage) {
      const objects: S3ObjectInfo[] = []
      let continuationToken: string | undefined

      do {
        const page = await this.listObjectsV2({
          prefix: prefix || undefined,
          maxKeys: 1000,
          continuationToken,
        })
        objects.push(...page.objects)
        onPage?.(page.objects, objects.length)
        continuationToken = page.isTruncated ? page.nextContinuationToken : undefined
      } while (continuationToken)

      return objects
    },

    async headObject(key) {
      const response = await signedRequest('HEAD', key)

      if (response.status === 404) {
        return { exists: false }
      }
      if (!response.ok) {
        throw await toS3Error(response)
      }

      return {
        exists: true,
        contentType: response.headers.get('content-type') ?? undefined,
        contentLength: Number(response.headers.get('content-length') || 0) || undefined,
        etag: response.headers.get('etag') ?? undefined,
      }
    },

    async getObject(key) {
      const response = await signedRequest('GET', key)
      if (!response.ok) {
        throw await toS3Error(response)
      }
      return new Uint8Array(await response.arrayBuffer())
    },

    async putObject(key, body, contentType, acl) {
      const headers: Record<string, string> = {
        'Content-Type': contentType,
      }
      const finalAcl = acl ?? config.acl
      if (finalAcl) {
        headers['x-amz-acl'] = finalAcl
      }

      const response = await signedRequest('PUT', key, {
        headers,
        body: normalizeBody(body),
      })

      if (!response.ok) {
        throw await toS3Error(response)
      }

      return {
        key,
        url: buildPublicUrl(config, key),
        status: response.status,
      }
    },

    async deleteObject(key) {
      const response = await signedRequest('DELETE', key)

      if (response.status === 404) {
        return
      }
      if (!response.ok) {
        throw await toS3Error(response)
      }
    },

    async deleteObjectsBatched(keys, options = {}) {
      const batchSize = Math.min(1000, Math.max(1, Math.round(options.batchSize ?? 1000)))
      const batchCount = Math.ceil(keys.length / batchSize)
      const failed: S3DeleteError[] = []
      let deleted = 0
      let done = 0

      for (let index = 0; index < keys.length; index += batchSize) {
        if (options.isCancelled?.()) {
          return { deleted, failed, cancelled: true, batches: Math.ceil(done / batchSize) }
        }

        const batch = keys.slice(index, index + batchSize)
        const body = buildDeleteObjectsXml(batch)
        const response = await signedRequest('POST', '', {
          query: { delete: '' },
          headers: {
            'Content-Type': 'application/xml',
            'Content-MD5': md5.base64(body),
          },
          body,
        })

        if (!response.ok) {
          throw await toS3Error(response)
        }

        const errors = parseDeleteObjectsErrors(await response.text())
        failed.push(...errors)
        deleted += batch.length - errors.length
        done += batch.length

        options.onProgress?.({
          done,
          total: keys.length,
          batch: Math.floor(index / batchSize) + 1,
          batchCount,
        })
      }

      return { deleted, failed, cancelled: false, batches: batchCount }
    },

    buildPublicUrl(key: string) {
      return buildPublicUrl(config, key)
    },
  }
}

function normalizeBody(body: Uint8Array | ArrayBuffer | Blob | string): S3RequestBody {
  return body
}

async function toS3Error(response: Response): Promise<Error> {
  let detail = ''
  try {
    detail = await response.text()
  }
  catch {
    detail = ''
  }
  return new Error(`S3 ${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 500)}` : ''}`)
}
