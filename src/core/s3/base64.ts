/**
 * Base64 编解码。
 *
 * 上传大图时（思源代理模式）每张图片都要经过一次 base64，
 * `btoa(String.fromCharCode(...chunk))` 实测只有约 23 MB/s，是主要的 JS 热点。
 * Chromium 133+ 提供原生的 `Uint8Array.prototype.toBase64()`（C++ 实现），
 * 这里优先使用原生实现，旧环境回退到查表编码（约 3 倍于原实现）。
 */

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BASE64_CODES = new Uint8Array(64)
for (let index = 0; index < 64; index++) {
  BASE64_CODES[index] = BASE64_ALPHABET.charCodeAt(index)
}

const PAD = 61 // '='
const STRING_CHUNK = 0x4000

interface NativeBase64Encode {
  toBase64?: () => string
}

interface NativeUint8Array extends Uint8ArrayConstructor {
  fromBase64?: (value: string) => Uint8Array
}

const nativePrototype = Uint8Array.prototype as unknown as NativeBase64Encode
const nativeConstructor = Uint8Array as unknown as NativeUint8Array

export function hasNativeBase64Decode(): boolean {
  return typeof nativeConstructor.fromBase64 === 'function'
}

export function hasNativeBase64Encode(): boolean {
  return typeof nativePrototype.toBase64 === 'function'
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return ''
  }
  if (typeof nativePrototype.toBase64 === 'function') {
    return nativePrototype.toBase64.call(bytes)
  }
  return encodeByTable(bytes)
}

export function base64ToBytes(text: string): Uint8Array {
  if (!text) {
    return new Uint8Array(0)
  }
  if (typeof nativeConstructor.fromBase64 === 'function') {
    return nativeConstructor.fromBase64.call(Uint8Array, text)
  }

  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/**
 * 3 字节 -> 4 个 base64 字符。先写入 ASCII 字节数组，再分块转字符串，
 * 避免 `String.fromCharCode(...veryLargeArray)` 的参数爆炸与逐块字符串拼接。
 */
function encodeByTable(bytes: Uint8Array): string {
  const length = bytes.length
  const out = new Uint8Array(Math.ceil(length / 3) * 4)
  let offset = 0
  const full = length - (length % 3)

  for (let index = 0; index < full; index += 3) {
    const a = bytes[index]
    const b = bytes[index + 1]
    const c = bytes[index + 2]
    out[offset++] = BASE64_CODES[a >> 2]
    out[offset++] = BASE64_CODES[((a & 3) << 4) | (b >> 4)]
    out[offset++] = BASE64_CODES[((b & 15) << 2) | (c >> 6)]
    out[offset++] = BASE64_CODES[c & 63]
  }

  const remain = length - full
  if (remain === 1) {
    const a = bytes[full]
    out[offset++] = BASE64_CODES[a >> 2]
    out[offset++] = BASE64_CODES[(a & 3) << 4]
    out[offset++] = PAD
    out[offset++] = PAD
  }
  else if (remain === 2) {
    const a = bytes[full]
    const b = bytes[full + 1]
    out[offset++] = BASE64_CODES[a >> 2]
    out[offset++] = BASE64_CODES[((a & 3) << 4) | (b >> 4)]
    out[offset++] = BASE64_CODES[(b & 15) << 2]
    out[offset++] = PAD
  }

  const parts: string[] = []
  for (let index = 0; index < offset; index += STRING_CHUNK) {
    parts.push(String.fromCharCode.apply(null, out.subarray(index, index + STRING_CHUNK) as unknown as number[]))
  }
  return parts.join('')
}
