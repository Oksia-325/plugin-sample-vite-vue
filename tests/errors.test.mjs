import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PigoError, toPigoError, toUserMessage } from '../src/core/errors.ts'

test('maps S3 auth errors to a readable message', () => {
  const error = toPigoError(new Error('S3 403 Forbidden: AccessDenied'))
  assert.equal(error.code, 'auth')
  assert.match(toUserMessage(error), /AccessKey/)
})

test('maps network and timeout errors', () => {
  assert.equal(toPigoError(new Error('Failed to fetch')).code, 'network')
  assert.equal(toPigoError(new Error('AbortError: signal is aborted')).code, 'timeout')
})

test('keeps PigoError unchanged and falls back to unknown', () => {
  const original = new PigoError('file', '本地文件丢失')
  assert.equal(toPigoError(original), original)
  assert.equal(toPigoError(new Error('some unexpected failure')).code, 'unknown')
})
