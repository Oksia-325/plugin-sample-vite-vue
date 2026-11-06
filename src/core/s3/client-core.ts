import type { S3Config } from '../config'
import { AwsClient } from './vendor/aws4fetch.ts'
import { buildObjectUrl, buildPublicUrl } from './url.ts'
import { parseListBucketResult, type ListBucketResult, type S3ObjectInfo } from './xml.ts'

export type S3Requester = (request: Request) => Promise<Response>

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

export interface S3ClientCore {
  listObjectsV2: (options?: ListObjectsOptions) => Promise<ListBucketResult>
  listAllObjects: (prefix: string, onPage?: (objects: S3ObjectInfo[], total: number) => void) => Promise<S3ObjectInfo[]>
  headObject: (key: string) => Promise<HeadObjectResult>
  getObject: (key: string) => Promise<Uint8Array>
  putObject: (key: string, body: Uint8Array | ArrayBuffer | Blob | string, contentType: string, acl?: string) => Promise<PutObjectResult>
  deleteObject: (key: string) => Promise<void>
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
      body?: BodyInit
    } = {}
  ): Promise<Response> {
    const url = buildObjectUrl(config, key, options.query)
    const headers = options.headers ?? {}
    const request = await signer.sign(url, {
      method,
      headers,
      body: options.body,
    }) as Request
    return requester(request)
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
          prefix,
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

    buildPublicUrl(key: string) {
      return buildPublicUrl(config, key)
    },
  }
}

function normalizeBody(body: Uint8Array | ArrayBuffer | Blob | string): BodyInit {
  if (typeof body === 'string' || body instanceof Blob) {
    return body
  }
  return body as BodyInit
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
