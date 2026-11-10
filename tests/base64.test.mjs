import assert from 'node:assert/strict'
import { test } from 'node:test'
import { base64ToBytes, bytesToBase64, hasNativeBase64Decode, hasNativeBase64Encode } from '../src/core/s3/base64.ts'

const sizes = [0, 1, 2, 3, 4, 5, 255, 256, 1023, 1024, 32767, 32768, 65535, 65536, 65537, 200000]

function makeBytes(size) {
  const bytes = new Uint8Array(size)
  for (let index = 0; index < size; index++) {
    bytes[index] = (index * 31 + 7) & 0xff
  }
  return bytes
}

test('bytesToBase64 matches Node Buffer for all tail lengths', () => {
  for (const size of sizes) {
    const bytes = makeBytes(size)
    const expected = Buffer.from(bytes).toString('base64')
    assert.equal(bytesToBase64(bytes), expected, `size=${size}`)
  }
})

test('base64ToBytes round-trips arbitrary bytes', () => {
  for (const size of sizes) {
    const bytes = makeBytes(size)
    const encoded = bytesToBase64(bytes)
    assert.deepEqual(base64ToBytes(encoded), bytes, `size=${size}`)
  }
})

test('base64 helpers handle empty input and padding', () => {
  assert.equal(bytesToBase64(new Uint8Array(0)), '')
  assert.equal(base64ToBytes('').length, 0)
  assert.equal(bytesToBase64(new Uint8Array([0x66])), 'Zg==')
  assert.equal(bytesToBase64(new Uint8Array([0x66, 0x6f])), 'Zm8=')
  assert.deepEqual(Array.from(base64ToBytes('Zm9v')), [0x66, 0x6f, 0x6f])
})

test('native capability detection is safe in any runtime', () => {
  assert.equal(typeof hasNativeBase64Encode(), 'boolean')
  assert.equal(typeof hasNativeBase64Decode(), 'boolean')
})
