import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createS3Core } from '../src/core/s3/client-core.ts'
import { buildObjectUrl, buildPublicUrl, encodeKeyPath } from '../src/core/s3/url.ts'
import { buildDeleteObjectsXml, parseListBucketResult } from '../src/core/s3/xml.ts'
import { buildObjectKey, getStaticPrefix, sanitizeKey } from '../src/core/upload/keyTemplate.ts'

const baseS3 = {
  endpoint: 'https://cos.ap-guangzhou.myqcloud.com',
  region: 'ap-guangzhou',
  bucket: 'picgo-1312673255',
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'SECRETEXAMPLE',
  uploadPath: 'siyuan/{year}/{month}/{md5}.{ext}',
  customUrl: 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com',
  extraUrlPrefixes: [],
  pathStyleAccess: false,
  acl: 'public-read',
  useSiyuanProxy: true,
  timeoutMs: 60000,
}

test('getStaticPrefix extracts the stable upload prefix', () => {
  assert.equal(getStaticPrefix('siyuan/{year}/{month}/{md5}.{ext}'), 'siyuan/')
  assert.equal(getStaticPrefix('siyuan/'), 'siyuan/')
  assert.equal(getStaticPrefix('notes'), 'notes/')
  assert.equal(getStaticPrefix('{fullName}'), '')
  assert.equal(getStaticPrefix('/notes/images/{year}/a.jpg'), 'notes/images/')
})

test('buildObjectKey renders variables and MD5 content hash', async () => {
  const key = await buildObjectKey(
    {
      fileName: 'hello.txt',
      ext: '.txt',
      buffer: new TextEncoder().encode('hello'),
      now: new Date('2026-11-06T12:00:00Z'),
    },
    'siyuan/{year}/{month}/{md5}.{ext}'
  )

  assert.equal(key, 'siyuan/2026/11/5d41402abc4b2a76b9719d911017c592.txt')
})

test('buildObjectKey sanitizes file names', async () => {
  const key = await buildObjectKey(
    {
      fileName: '图片 1.jpg',
      ext: 'jpg',
      buffer: new TextEncoder().encode('x'),
      now: new Date('2026-01-02T00:00:00Z'),
    },
    'siyuan/{fullName}'
  )

  assert.equal(key, 'siyuan/图片-1.jpg')
  assert.equal(sanitizeKey('/a/../b//c\\d.jpg'), 'a/_/b/c/d.jpg')
})

test('buildObjectUrl supports virtual host, path style and encoding', () => {
  assert.equal(
    buildObjectUrl(baseS3, 'siyuan/a b.jpg'),
    'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/a%20b.jpg'
  )
  assert.equal(
    buildObjectUrl({ ...baseS3, pathStyleAccess: true }, 'siyuan/a.jpg'),
    'https://cos.ap-guangzhou.myqcloud.com/picgo-1312673255/siyuan/a.jpg'
  )
  assert.equal(
    buildObjectUrl(baseS3, 'siyuan/中文.jpg'),
    'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/%E4%B8%AD%E6%96%87.jpg'
  )
  assert.equal(
    buildObjectUrl(baseS3, '', { 'list-type': '2', 'max-keys': 1 }),
    'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com?list-type=2&max-keys=1'
  )
  assert.equal(encodeKeyPath('a/b c.jpg'), 'a/b%20c.jpg')
})

test('buildPublicUrl prefers customUrl', () => {
  assert.equal(
    buildPublicUrl(baseS3, 'siyuan/a.jpg'),
    'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/a.jpg'
  )
})

test('parseListBucketResult reads objects and pagination', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>token-2</NextContinuationToken>
  <Contents><Key>siyuan/a.jpg</Key><Size>123</Size><LastModified>2026-11-06T00:00:00.000Z</LastModified><ETag>&quot;etag-a&quot;</ETag></Contents>
  <Contents><Key>siyuan/a&amp;b.jpg</Key><Size>456</Size><LastModified>2026-11-06T00:00:01.000Z</LastModified></Contents>
</ListBucketResult>`

  const result = parseListBucketResult(xml)

  assert.equal(result.objects.length, 2)
  assert.equal(result.objects[0].key, 'siyuan/a.jpg')
  assert.equal(result.objects[0].size, 123)
  assert.equal(result.objects[0].etag, 'etag-a')
  assert.equal(result.objects[1].key, 'siyuan/a&b.jpg')
  assert.equal(result.isTruncated, true)
  assert.equal(result.nextContinuationToken, 'token-2')
})

test('buildDeleteObjectsXml escapes keys', () => {
  assert.equal(
    buildDeleteObjectsXml(['a&b.jpg', 'c<d>.jpg']),
    '<Delete><Quiet>true</Quiet><Object><Key>a&amp;b.jpg</Key></Object><Object><Key>c&lt;d&gt;.jpg</Key></Object></Delete>'
  )
})

test('createS3Core signs and sends list/put/head/delete requests', async () => {
  const requests = []
  const listXml = '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>siyuan/a.jpg</Key><Size>1</Size><LastModified>x</LastModified></Contents></ListBucketResult>'

  const client = createS3Core(baseS3, async (request) => {
    requests.push(request)
    const method = request.method
    if (method === 'GET' && request.url.includes('list-type=2')) {
      return new Response(listXml, { status: 200, headers: { 'content-type': 'application/xml' } })
    }
    if (method === 'PUT') {
      return new Response(null, { status: 200 })
    }
    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'content-length': '5',
          etag: '"etag"',
        },
      })
    }
    if (method === 'DELETE') {
      return new Response(null, { status: 204 })
    }
    return new Response('unexpected', { status: 500 })
  })

  const page = await client.listObjectsV2({ prefix: 'siyuan/', maxKeys: 1 })
  assert.equal(page.objects.length, 1)
  assert.equal(page.objects[0].key, 'siyuan/a.jpg')

  const put = await client.putObject('siyuan/a.txt', new TextEncoder().encode('hello'), 'text/plain')
  assert.equal(put.key, 'siyuan/a.txt')
  assert.equal(put.url, 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/a.txt')

  const head = await client.headObject('siyuan/a.txt')
  assert.equal(head.exists, true)
  assert.equal(head.contentType, 'text/plain')
  assert.equal(head.contentLength, 5)

  await client.deleteObject('siyuan/a.txt')

  const putRequest = requests.find((request) => request.method === 'PUT')
  assert.ok(putRequest)
  assert.equal(putRequest.headers.get('x-amz-acl'), 'public-read')
  assert.match(putRequest.headers.get('authorization') || '', /AWS4-HMAC-SHA256/)

  const deleteRequest = requests.find((request) => request.method === 'DELETE')
  assert.ok(deleteRequest)
  assert.ok(deleteRequest.headers.get('x-amz-content-sha256'))
})

test('createS3Core reports missing objects and S3 errors', async () => {
  const notFoundClient = createS3Core(baseS3, async () => new Response(null, { status: 404 }))
  assert.deepEqual(await notFoundClient.headObject('missing.jpg'), { exists: false })

  const forbiddenClient = createS3Core(baseS3, async () => new Response('AccessDenied', { status: 403 }))
  await assert.rejects(
    () => forbiddenClient.listObjectsV2({ prefix: 'siyuan/' }),
    /S3 403/
  )
})
