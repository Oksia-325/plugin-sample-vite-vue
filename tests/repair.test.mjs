import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cloneConfig, DEFAULT_CONFIG } from '../src/core/config.ts'
import {
  computeRefStats,
  countUploadedButNotReplaced,
  isUploadedButNotReplaced,
  withAssetStats,
} from '../src/core/stats/aggregate.ts'
import { applyPipelineOutcome } from '../src/core/stats/optimistic.ts'
import { buildFileMapEntry } from '../src/core/upload/fileMapPure.ts'
import { shouldReplaceLinks } from '../src/core/upload/policy.ts'

const CDN = 'https://cdn.example.com'

function makeConfig() {
  const config = cloneConfig(DEFAULT_CONFIG)
  config.s3.extraUrlPrefixes = [CDN]
  return config
}

function makeRef(overrides = {}) {
  const url = overrides.url || 'assets/photo.png'
  return {
    id: 'ref-1',
    url,
    alt: 'photo',
    title: '',
    kind: 'markdown',
    sourceType: 'local',
    normalizedUrl: overrides.normalizedUrl || `local:${url}`,
    assetPath: overrides.assetPath || url,
    blockId: 'block-1',
    docId: 'doc-1',
    docTitle: 'Doc 1',
    docPath: '/Doc 1',
    occurrence: 0,
    ...overrides,
  }
}

function makeSnapshot(refs, fileMaps = new Map()) {
  const seen = new Set()
  const uniqueRefs = refs.filter((ref) => {
    if (seen.has(ref.normalizedUrl)) {
      return false
    }
    seen.add(ref.normalizedUrl)
    return true
  })

  const computed = computeRefStats(refs, uniqueRefs, 1)
  const stats = withAssetStats(computed, {
    uploadedButNotReplaced: countUploadedButNotReplaced(uniqueRefs, fileMaps),
    assetFiles: 0,
    titleAssets: 0,
  })

  const result = {
    doc: { id: 'doc-1', title: 'Doc 1', path: '/Doc 1' },
    refs,
    uniqueRefs,
    stats,
    scannedAt: 0,
    durationMs: 0,
  }

  return {
    scope: 'doc',
    docId: 'doc-1',
    result,
    stats,
    fileMaps,
    scannedAt: 0,
    durationMs: 0,
  }
}

function makeOutcome(ref, options = {}) {
  return {
    upload: {
      results: [{
        ref,
        ok: true,
        url: options.url || `${CDN}/siyuan/photo.png`,
        fileMapEntry: options.fileMapEntry,
        reused: options.reused ?? false,
      }],
    },
    replace: {
      replacedUrls: options.replacedUrls ?? [],
    },
  }
}

function makeEntry() {
  return buildFileMapEntry({
    originUrl: 'assets/photo.png',
    url: `${CDN}/siyuan/photo.png`,
    blockId: 'block-1',
    name: 'photo.png',
  })
}

test('shouldReplaceLinks always replaces for repair tasks', () => {
  const config = makeConfig()
  config.behavior.replaceLink = false

  assert.equal(shouldReplaceLinks(config), false)
  assert.equal(shouldReplaceLinks(config, { repairOnly: true }), true)
  assert.equal(shouldReplaceLinks(config, { replaceLink: true }), true)
  assert.equal(shouldReplaceLinks(config, { repairOnly: true, replaceLink: false }), true)
})

test('applyPipelineOutcome marks uploaded-but-not-replaced refs as pending', () => {
  const config = makeConfig()
  const ref = makeRef()
  const snapshot = makeSnapshot([ref])
  const outcome = makeOutcome(ref, { fileMapEntry: makeEntry() })

  assert.equal(applyPipelineOutcome(snapshot, outcome, config, { replacedUrls: [] }), true)
  assert.equal(snapshot.result.refs[0].sourceType, 'local')
  assert.equal(snapshot.stats.local, 1)
  assert.equal(snapshot.stats.s3, 0)
  assert.equal(snapshot.stats.uploadedButNotReplaced, 1)
  assert.equal(isUploadedButNotReplaced(ref, snapshot.fileMaps), true)
})

test('applyPipelineOutcome turns replaced refs into S3 immediately', () => {
  const config = makeConfig()
  const ref = makeRef()
  const snapshot = makeSnapshot([ref])
  const outcome = makeOutcome(ref, {
    fileMapEntry: makeEntry(),
    replacedUrls: ['assets/photo.png'],
  })

  assert.equal(applyPipelineOutcome(snapshot, outcome, config, {
    replacedUrls: outcome.replace.replacedUrls,
  }), true)
  assert.equal(snapshot.result.refs[0].sourceType, 's3')
  assert.equal(snapshot.result.refs[0].s3Key, 'siyuan/photo.png')
  assert.equal(snapshot.stats.local, 0)
  assert.equal(snapshot.stats.s3, 1)
  assert.equal(snapshot.stats.uploadedButNotReplaced, 0)
})

test('applyPipelineOutcome clears pending state after a repair (reused upload record)', () => {
  const config = makeConfig()
  const entry = makeEntry()
  const ref = makeRef()
  const fileMaps = new Map([['doc-1', { [entry.hash]: entry }]])
  const snapshot = makeSnapshot([ref], fileMaps)

  assert.equal(snapshot.stats.uploadedButNotReplaced, 1)

  // 修复时会重新扫描，结果里的 ref 是新对象，但仍通过 URL / normalizedUrl 对应。
  const freshRef = makeRef()
  const outcome = makeOutcome(freshRef, {
    fileMapEntry: entry,
    reused: true,
    replacedUrls: ['assets/photo.png'],
  })

  assert.equal(applyPipelineOutcome(snapshot, outcome, config, {
    replacedUrls: outcome.replace.replacedUrls,
  }), true)
  assert.equal(snapshot.result.refs[0].sourceType, 's3')
  assert.equal(snapshot.stats.uploadedButNotReplaced, 0)
  assert.equal(snapshot.stats.s3, 1)
})

test('applyPipelineOutcome does not rewrite the same URL in other documents', () => {
  const config = makeConfig()
  const uploaded = makeRef({ id: 'a', docId: 'doc-1' })
  const other = makeRef({ id: 'b', docId: 'doc-2', docTitle: 'Doc 2', docPath: '/Doc 2' })
  const snapshot = makeSnapshot([uploaded, other])

  const outcome = makeOutcome(uploaded, {
    fileMapEntry: makeEntry(),
    replacedUrls: ['assets/photo.png'],
  })

  applyPipelineOutcome(snapshot, outcome, config, {
    replacedUrls: outcome.replace.replacedUrls,
  })

  assert.equal(uploaded.sourceType, 's3')
  assert.equal(other.sourceType, 'local')
})
