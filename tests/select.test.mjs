import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cloneConfig, DEFAULT_CONFIG } from '../src/core/config.ts'
import { selectRefs } from '../src/core/upload/select.ts'

function createRef(sourceType, kind = 'markdown') {
  return {
    id: `${sourceType}:${kind}`,
    url: `https://example.com/${sourceType}-${kind}.png`,
    alt: '',
    title: '',
    kind,
    sourceType,
    normalizedUrl: `${sourceType}:${kind}`,
    blockId: 'block-1',
    docId: 'doc-1',
    docTitle: 'doc',
    docPath: '/doc',
    occurrence: 0,
  }
}

const local = createRef('local')
const remote = createRef('remote')
const s3 = createRef('s3')
const localTitle = createRef('local', 'title')

test('selectRefs keeps local and remote refs but skips uploaded S3 by default', () => {
  const selected = selectRefs([local, remote, s3, localTitle], cloneConfig(DEFAULT_CONFIG))

  assert.deepEqual(selected.map((ref) => ref.id), [local.id, remote.id, localTitle.id])
})

test('selectRefs honours sourceTypes for local-only batch uploads', () => {
  const selected = selectRefs([local, remote, s3, localTitle], cloneConfig(DEFAULT_CONFIG), {
    sourceTypes: ['local'],
  })

  assert.deepEqual(selected.map((ref) => ref.id), [local.id, localTitle.id])
})

test('selectRefs force keeps everything including S3', () => {
  const selected = selectRefs([local, remote, s3, localTitle], cloneConfig(DEFAULT_CONFIG), {
    force: true,
  })

  assert.equal(selected.length, 4)
})

test('selectRefs repairOnly skips S3 but keeps remote', () => {
  const selected = selectRefs([local, remote, s3], cloneConfig(DEFAULT_CONFIG), {
    repairOnly: true,
  })

  assert.deepEqual(selected.map((ref) => ref.id), [local.id, remote.id])
})

test('selectRefs respects includeRemoteImages=false', () => {
  const config = cloneConfig(DEFAULT_CONFIG)
  config.behavior.includeRemoteImages = false

  const selected = selectRefs([local, remote, localTitle], config)

  assert.deepEqual(selected.map((ref) => ref.id), [local.id, localTitle.id])
})
