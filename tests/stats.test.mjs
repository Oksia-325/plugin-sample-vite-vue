import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  computeRefStats,
  countUploadedButNotReplaced,
  dedupeRefs,
  isUploadedButNotReplaced,
} from '../src/core/stats/aggregate.ts'
import { buildStatsCsv, buildStatsJson } from '../src/core/stats/export.ts'
import { buildFileMapEntry } from '../src/core/upload/fileMapPure.ts'

function makeRef(overrides = {}) {
  return {
    id: 'ref-1',
    url: 'assets/photo.png',
    alt: 'photo',
    title: '',
    kind: 'markdown',
    sourceType: 'local',
    normalizedUrl: 'assets/photo.png',
    assetPath: 'assets/photo.png',
    blockId: 'block-1',
    docId: 'doc-1',
    docTitle: 'Doc 1',
    docPath: '/Doc 1',
    occurrence: 0,
    ...overrides,
  }
}

function makeFileMap(entries) {
  const map = {}
  entries.forEach((entry) => {
    map[entry.hash] = entry
  })
  return map
}

test('dedupeRefs only keeps one ref per normalized URL', () => {
  const refs = [
    makeRef({ id: 'a', normalizedUrl: 'assets/a.png' }),
    makeRef({ id: 'b', normalizedUrl: 'assets/a.png' }),
    makeRef({ id: 'c', normalizedUrl: 'assets/b.png' }),
  ]

  const unique = dedupeRefs(refs)
  assert.equal(unique.length, 2)
  assert.deepEqual(unique.map((ref) => ref.id), ['a', 'c'])
})

test('computeRefStats counts sources, title images and docs', () => {
  const refs = [
    makeRef({ id: 'a', sourceType: 'local', normalizedUrl: 'a' }),
    makeRef({ id: 'b', sourceType: 's3', normalizedUrl: 'b', docId: 'doc-2' }),
    makeRef({ id: 'c', sourceType: 'remote', normalizedUrl: 'c', docId: 'doc-2' }),
    makeRef({ id: 'd', sourceType: 'data', normalizedUrl: 'd', docId: 'doc-3' }),
    makeRef({ id: 'e', sourceType: 'local', normalizedUrl: 'e', kind: 'title', docId: 'doc-3' }),
  ]

  const unique = dedupeRefs(refs)
  const stats = computeRefStats(refs, unique)

  assert.equal(stats.totalRefs, 5)
  assert.equal(stats.uniqueRefs, 5)
  assert.equal(stats.local, 2)
  assert.equal(stats.s3, 1)
  assert.equal(stats.remote, 1)
  assert.equal(stats.data, 1)
  assert.equal(stats.title, 1)
  assert.equal(stats.docs, 3)
  assert.equal(stats.uploadedButNotReplaced, 0)
  assert.equal(stats.assetFiles, 0)
})

test('isUploadedButNotReplaced detects a local ref with an S3 fileMap record', () => {
  const entry = buildFileMapEntry({
    originUrl: 'assets/photo.png',
    url: 'https://cdn.example.com/photo.png',
    blockId: 'block-1',
    name: 'photo.png',
  })
  const fileMaps = new Map([['doc-1', makeFileMap([entry])]])

  assert.equal(isUploadedButNotReplaced(makeRef(), fileMaps), true)
  assert.equal(countUploadedButNotReplaced([makeRef()], fileMaps), 1)
})

test('isUploadedButNotReplaced ignores S3 refs and identical URLs', () => {
  const entry = buildFileMapEntry({
    originUrl: 'assets/photo.png',
    url: 'https://cdn.example.com/photo.png',
    blockId: 'block-1',
    name: 'photo.png',
  })
  const fileMaps = new Map([['doc-1', makeFileMap([entry])]])

  assert.equal(isUploadedButNotReplaced(makeRef({ sourceType: 's3' }), fileMaps), false)
  assert.equal(
    isUploadedButNotReplaced(makeRef({ url: 'https://cdn.example.com/photo.png' }), new Map([
      ['doc-1', makeFileMap([buildFileMapEntry({
        originUrl: 'https://cdn.example.com/photo.png',
        url: 'https://cdn.example.com/photo.png',
        blockId: 'block-1',
        name: 'photo.png',
      })])],
    ])),
    false
  )
})

test('isUploadedButNotReplaced tolerates missing fileMaps', () => {
  assert.equal(isUploadedButNotReplaced(makeRef(), undefined), false)
  assert.equal(isUploadedButNotReplaced(makeRef(), new Map()), false)
})

test('buildStatsCsv escapes commas, quotes and newlines', () => {
  const refs = [
    makeRef({
      url: 'https://example.com/a.png',
      alt: 'a, "quoted"\nline',
      docTitle: 'Doc, one',
    }),
  ]

  const csv = buildStatsCsv({
    scope: 'doc',
    stats: computeRefStats(refs, refs),
    refs,
    scannedAt: Date.parse('2026-11-09T10:00:00Z'),
    isUploadedButNotReplaced: () => true,
  })

  const lines = csv.split('\n')
  assert.equal(lines[0], 'docId,docTitle,docPath,blockId,kind,sourceType,url,normalizedUrl,s3Key,alt,title,status')
  assert.match(csv, /"Doc, one"/)
  assert.match(csv, /"a, ""quoted""\nline"/)
  assert.match(csv, /uploadedButNotReplaced/)
})

test('buildStatsJson includes stats and ref status', () => {
  const refs = [makeRef()]
  const json = buildStatsJson({
    scope: 'all',
    stats: computeRefStats(refs, refs),
    refs,
    scannedAt: Date.parse('2026-11-09T10:00:00Z'),
    isUploadedButNotReplaced: () => false,
  })

  const parsed = JSON.parse(json)
  assert.equal(parsed.scope, 'all')
  assert.equal(parsed.stats.totalRefs, 1)
  assert.equal(parsed.refs.length, 1)
  assert.equal(parsed.refs[0].status, 'local')
})
