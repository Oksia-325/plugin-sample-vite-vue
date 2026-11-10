import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extensionOf, parseContentRange } from '../src/core/stats/assetMeta.ts'

test('parseContentRange reads the total size from a range response', () => {
  assert.equal(parseContentRange('bytes 0-0/43461'), 43461)
  assert.equal(parseContentRange('bytes 10-19/100'), 100)
})

test('parseContentRange ignores malformed or absent headers', () => {
  assert.equal(parseContentRange(undefined), undefined)
  assert.equal(parseContentRange(''), undefined)
  assert.equal(parseContentRange('bytes */100'), undefined)
  assert.equal(parseContentRange('bytes 0-0/*'), undefined)
})

test('extensionOf extracts lowercase extensions from paths and urls', () => {
  assert.equal(extensionOf('assets/F-0Dnn1bKAAGS1q-20231207103303-8kywjd4.jfif'), 'jfif')
  assert.equal(extensionOf('https://picgo.example.com/siyuan/06-01.PNG'), 'png')
  assert.equal(extensionOf('https://static.example.com/a.webp?x=1#frag'), 'webp')
})

test('extensionOf returns empty when there is no extension', () => {
  assert.equal(extensionOf(''), '')
  assert.equal(extensionOf('assets/no-ext'), '')
  assert.equal(extensionOf('assets/trailing.'), '')
  assert.equal(extensionOf('assets/.gitignore'), '')
})
