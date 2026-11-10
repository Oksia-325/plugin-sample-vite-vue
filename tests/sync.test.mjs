import assert from 'node:assert/strict'
import { test } from 'node:test'
import md5 from '../src/core/upload/vendor/md5.ts'
import { createS3Core } from '../src/core/s3/client-core.ts'
import { buildDeleteObjectsXml, parseDeleteObjectsErrors } from '../src/core/s3/xml.ts'
import {
  buildCleanupPlan,
  buildSyncReport,
  isSafeCleanupKey,
  isTestKey,
} from '../src/core/sync/report.ts'

function makeRef(overrides = {}) {
  return {
    id: 'ref-1',
    url: 'https://cdn.example.com/a.png',
    alt: 'a',
    title: '',
    kind: 'markdown',
    sourceType: 's3',
    normalizedUrl: 'https://cdn.example.com/a.png',
    s3Key: 'siyuan/a.png',
    blockId: 'block-1',
    docId: 'doc-1',
    docTitle: 'Doc 1',
    docPath: '/Doc 1',
    occurrence: 0,
    ...overrides,
  }
}

function makeObject(key, size = 10) {
  return { key, size, lastModified: '2026-11-09T00:00:00.000Z' }
}

const config = {
  version: 1,
  s3: {
    endpoint: 'https://cos.ap-guangzhou.myqcloud.com',
    region: 'ap-guangzhou',
    bucket: 'test-bucket',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'SECRETEXAMPLE',
    uploadPath: 'siyuan/{year}/{month}/{md5}.{ext}',
    customUrl: 'https://cdn.example.com',
    extraUrlPrefixes: [],
    pathStyleAccess: false,
    acl: '',
    useSiyuanProxy: false,
    timeoutMs: 60000,
  },
  behavior: {
    autoUploadOnPaste: true,
    replaceLink: true,
    allowPicAndText: false,
    concurrency: 4,
    includeTitleImage: true,
    includeRemoteImages: true,
    skipIfAlreadyS3: true,
    debug: false,
  },
}

test('buildSyncReport classifies matched, orphan, missing, not uploaded and protected objects', () => {
  const refA1 = makeRef({ id: 'a1', docId: 'doc-1', s3Key: 'siyuan/a.png' })
  const refA2 = makeRef({ id: 'a2', docId: 'doc-2', s3Key: 'siyuan/a.png' })
  const refMissing = makeRef({ id: 'm1', docId: 'doc-3', s3Key: 'siyuan/missing.png' })
  const refLocal = makeRef({
    id: 'l1',
    docId: 'doc-4',
    sourceType: 'local',
    s3Key: undefined,
    url: 'assets/local.png',
    normalizedUrl: 'assets/local.png',
  })
  const refRemote = makeRef({
    id: 'r1',
    docId: 'doc-4',
    sourceType: 'remote',
    s3Key: undefined,
    url: 'https://other.example.com/r.png',
    normalizedUrl: 'https://other.example.com/r.png',
  })

  const report = buildSyncReport({
    refs: [refA1, refA2, refMissing, refLocal, refRemote],
    uniqueRefs: [refA1, refMissing, refLocal, refRemote],
    objects: [
      makeObject('siyuan/a.png'),
      makeObject('siyuan/orphan.png'),
      makeObject('siyuan/_pigo_test/test.png'),
      makeObject('siyuan/folder/', 0),
      makeObject('other/keep.txt'),
    ],
    prefix: 'siyuan/',
    scannedAt: 1,
  })

  assert.equal(report.summary.matched, 1)
  assert.equal(report.summary.onlyS3, 1)
  assert.equal(report.summary.onlySiyuan, 1)
  assert.equal(report.summary.notUploaded, 2)
  assert.equal(report.summary.outsidePrefix, 1)
  assert.equal(report.summary.ignored, 2)
  assert.equal(report.summary.totalObjects, 5)
  assert.equal(report.summary.docCount, 0)

  assert.equal(report.matched[0].key, 'siyuan/a.png')
  assert.equal(report.matched[0].refs.length, 2)
  assert.equal(report.onlyS3[0].key, 'siyuan/orphan.png')
  assert.equal(report.onlySiyuan[0].key, 'siyuan/missing.png')
  assert.equal(report.outsidePrefix[0].key, 'other/keep.txt')
  assert.deepEqual(report.cleanupCandidates.map((item) => item.key), ['siyuan/orphan.png'])
})

test('same object with one missing reference is both matched and missing', () => {
  const report = buildSyncReport({
    refs: [
      makeRef({ id: 'ok', s3Key: 'siyuan/ok.png' }),
      makeRef({ id: 'missing', s3Key: 'siyuan/missing.png' }),
    ],
    uniqueRefs: [],
    objects: [makeObject('siyuan/ok.png')],
    prefix: 'siyuan/',
  })

  assert.equal(report.summary.matched, 1)
  assert.equal(report.summary.onlySiyuan, 1)
  assert.equal(report.summary.onlyS3, 0)
})

test('fileMap/url evidence and local basenames protect objects from cleanup', () => {
  const localRef = makeRef({
    id: 'local-1',
    sourceType: 'local',
    s3Key: undefined,
    url: 'assets/local.png',
    normalizedUrl: 'assets/local.png',
    assetPath: 'assets/local.png',
  })

  const report = buildSyncReport({
    refs: [],
    uniqueRefs: [localRef],
    objects: [
      makeObject('siyuan/by-filemap.png'),
      makeObject('siyuan/local.png'),
      makeObject('siyuan/by-url.png'),
      makeObject('siyuan/real-orphan.png'),
    ],
    prefix: 'siyuan/',
    extraEvidence: [
      { key: 'siyuan/by-filemap.png', refs: [], source: 'fileMap' },
      { key: 'siyuan/by-url.png', refs: [], source: 'url' },
    ],
    basenameRefs: new Map([['local.png', [localRef]]]),
  })

  assert.deepEqual(report.onlyS3.map((item) => item.key), ['siyuan/real-orphan.png'])
  assert.equal(report.summary.matched, 3)
  assert.equal(report.cleanupCandidates.length, 1)
  assert.deepEqual(report.matched.find((item) => item.key === 'siyuan/local.png').sources, ['basename'])
  assert.deepEqual(report.matched.find((item) => item.key === 'siyuan/by-url.png').sources, ['url'])
})

test('test keys and cleanup protection', () => {
  assert.equal(isTestKey('siyuan/_pigo_test/a.png', 'siyuan/'), true)
  assert.equal(isTestKey('siyuan/a_pigo_test.png', 'siyuan/'), false)
  assert.equal(isTestKey('_pigo_test/a.png', ''), true)

  assert.equal(isSafeCleanupKey('siyuan/a.png', 'siyuan/'), true)
  assert.equal(isSafeCleanupKey('siyuan/_pigo_test/a.png', 'siyuan/'), false)
  assert.equal(isSafeCleanupKey('other/a.png', 'siyuan/'), false)
  assert.equal(isSafeCleanupKey('siyuan/folder/', 'siyuan/'), false)
  assert.equal(isSafeCleanupKey('any/a.png', ''), true)
})

test('buildDeleteObjectsXml escapes keys and parseDeleteObjectsErrors reads errors', () => {
  const xml = buildDeleteObjectsXml(['a&b.png', 'x<y>.png'])
  assert.match(xml, /<Key>a&amp;b\.png<\/Key>/)
  assert.match(xml, /<Key>x&lt;y&gt;\.png<\/Key>/)

  const errors = parseDeleteObjectsErrors('<DeleteResult><Error><Key>a.png</Key><Code>AccessDenied</Code><Message>denied</Message></Error></DeleteResult>')
  assert.deepEqual(errors, [{ key: 'a.png', code: 'AccessDenied', message: 'denied' }])
})

test('deleteObjectsBatched signs POST ?delete and chunks keys', async () => {
  const requests = []
  const bodies = []
  const core = createS3Core(config.s3, async (request) => {
    requests.push(request)
    bodies.push(await request.text())
    return new Response('<DeleteResult></DeleteResult>', { status: 200 })
  })

  const result = await core.deleteObjectsBatched(['a.png', 'b.png', 'c.png'], { batchSize: 2 })

  assert.equal(result.deleted, 3)
  assert.equal(result.failed.length, 0)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].method, 'POST')
  assert.match(requests[0].url, /\?delete$/)
  assert.match(requests[0].headers.get('content-type') || '', /application\/xml/)
  assert.equal(requests[0].headers.get('content-md5'), md5.base64(bodies[0]))
  assert.match(bodies[0], /<Key>a\.png<\/Key>/)
  assert.match(bodies[1], /<Key>c\.png<\/Key>/)
})

test('deleteObjectsBatched stops when a batch fails', async () => {
  let calls = 0
  const core = createS3Core(config.s3, async () => {
    calls++
    if (calls === 2) {
      return new Response('<Error><Code>InternalError</Code></Error>', { status: 500 })
    }
    return new Response('<DeleteResult></DeleteResult>', { status: 200 })
  })

  await assert.rejects(
    () => core.deleteObjectsBatched(['a.png', 'b.png', 'c.png'], { batchSize: 2 }),
    /S3 500/
  )
  assert.equal(calls, 2)
})

test('buildCleanupPlan only includes safe prefixed orphan objects', () => {
  const report = buildSyncReport({
    refs: [],
    uniqueRefs: [],
    objects: [
      { key: 'siyuan/orphan-a.png', size: 10, etag: '"etag-a"' },
      { key: 'siyuan/orphan-b.png', size: 20 },
      { key: 'siyuan/_pigo_test/test.png', size: 1 },
      { key: 'other/keep.png', size: 5 },
      { key: 'siyuan/folder/', size: 0 },
    ],
    prefix: 'siyuan/',
    docCount: 12,
  })

  const plan = buildCleanupPlan(report)

  assert.deepEqual(plan.keys, ['siyuan/orphan-a.png', 'siyuan/orphan-b.png'])
  assert.equal(plan.count, 2)
  assert.equal(plan.prefix, 'siyuan/')
  assert.equal(plan.protectedPrefix, '_pigo_test/*')
  assert.equal(plan.items[0].etag, '"etag-a"')
  assert.equal(report.summary.docCount, 12)
  assert.equal(report.summary.totalObjects, 5)
})
