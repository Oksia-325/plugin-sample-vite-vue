import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PasteEventAdapter } from '../src/core/paste/PasteEventAdapter.ts'

function makeFile(name = 'pasted.png') {
  return {
    name,
    type: 'image/png',
    arrayBuffer: async () => new ArrayBuffer(8),
  }
}

function makeEvent(options = {}) {
  const {
    files = [makeFile()],
    pageId = 'doc-1',
    textHTML = '',
    textPlain = '',
    siyuanHTML = '',
    resolvable = true,
    preventable = true,
  } = options

  const resolved = []
  const detail = {
    protyle: { block: { rootID: pageId } },
    files,
    textHTML,
    textPlain,
    siyuanHTML,
  }

  if (resolvable) {
    detail.resolve = (payload) => resolved.push(payload)
  }

  const event = {
    detail,
    resolved,
    preventDefaultCalled: false,
  }

  if (preventable) {
    event.preventDefault = function () {
      event.preventDefaultCalled = true
    }
  }

  return event
}

const config = {
  autoUploadOnPaste: true,
  allowPicAndText: false,
}

test('takes over a single pasted image and blocks the default host paste', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent()

  const result = adapter.tryTakeover(event, config)

  assert.equal(result.taken, true)
  assert.equal(result.snapshot.pageId, 'doc-1')
  assert.equal(result.snapshot.files.length, 1)
  assert.equal(event.preventDefaultCalled, true)
  assert.equal(event.resolved.length, 1)
  assert.equal(event.resolved[0].textPlain, '')
  assert.equal(event.resolved[0].files.length, 0)
  assert.ok(result.snapshot.preventedBy.includes('detail.resolve(empty-paste-payload)'))
})

test('takes over multiple pasted images', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent({
    files: [makeFile('a.png'), makeFile('b.png'), makeFile('c.png')],
  })

  const result = adapter.tryTakeover(event, config)

  assert.equal(result.taken, true)
  assert.equal(result.snapshot.files.length, 3)
})

test('does not take over when auto upload is disabled', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent()

  const result = adapter.tryTakeover(event, {
    ...config,
    autoUploadOnPaste: false,
  })

  assert.equal(result.taken, false)
  assert.equal(result.reason, 'auto-upload-disabled')
  assert.equal(event.preventDefaultCalled, false)
})

test('does not take over mixed image and text by default', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent({ textPlain: 'hello' })

  const result = adapter.tryTakeover(event, config)

  assert.equal(result.taken, false)
  assert.equal(result.reason, 'pic-and-text-disabled')
})

test('takes over mixed content when enabled', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent({ textHTML: '<p>hello</p>' })

  const result = adapter.tryTakeover(event, {
    ...config,
    allowPicAndText: true,
  })

  assert.equal(result.taken, true)
  assert.equal(result.snapshot.textHTML, '<p>hello</p>')
})

test('does not take over when there are no files', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent({ files: [] })

  const result = adapter.tryTakeover(event, config)

  assert.equal(result.taken, false)
  assert.equal(result.reason, 'no-image-files')
})

test('does not take over without a page id', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent({ pageId: '' })

  const result = adapter.tryTakeover(event, config)

  assert.equal(result.taken, false)
  assert.equal(result.reason, 'missing-page-id')
})

test('does not take over when the host paste cannot be blocked', () => {
  const adapter = new PasteEventAdapter()
  const event = makeEvent({ resolvable: false, preventable: false })

  const result = adapter.tryTakeover(event, config)

  assert.equal(result.taken, false)
  assert.equal(result.reason, 'default-prevention-unavailable')
})
