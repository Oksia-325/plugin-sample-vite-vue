import md5 from './vendor/md5.ts'

export interface KeyTemplateInput {
  fileName: string
  ext: string
  buffer: Uint8Array
  now?: Date
}

export async function buildObjectKey(input: KeyTemplateInput, template: string): Promise<string> {
  const now = input.now ?? new Date()
  const ext = normalizeExt(input.ext)
  const fullName = sanitizeSegment(ensureExt(input.fileName || `image.${ext}`, ext))
  const fileName = fullName.endsWith(`.${ext}`)
    ? fullName.slice(0, -(ext.length + 1))
    : stripExt(fullName)

  const variables: Record<string, () => string | Promise<string>> = {
    year: () => String(now.getFullYear()),
    month: () => String(now.getMonth() + 1).padStart(2, '0'),
    day: () => String(now.getDate()).padStart(2, '0'),
    timestamp: () => String(Math.floor(now.getTime() / 1000)),
    timestampMS: () => String(now.getTime()),
    md5: () => md5.hex(input.buffer),
    md5B64: () => md5.base64(input.buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    md5B64Short: () => md5.base64(input.buffer).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 7),
    sha256: () => sha256Hex(input.buffer),
    ext: () => ext,
    filename: () => fileName,
    fullName: () => fullName,
  }

  const matches = [...template.matchAll(/\{([a-zA-Z0-9]+)\}/g)]
  let rendered = template
  for (const match of matches) {
    const variable = match[1]
    const provider = variables[variable]
    if (provider) {
      rendered = rendered.split(match[0]).join(await provider())
    }
  }

  return sanitizeKey(rendered)
}

export function getStaticPrefix(template: string): string {
  const normalized = (template || '').trim().replace(/\\/g, '/').replace(/^\/+/, '')
  const firstVariable = normalized.indexOf('{')
  const prefix = firstVariable === -1 ? normalized : normalized.slice(0, firstVariable)
  if (!prefix) {
    return ''
  }
  const withSlash = prefix.endsWith('/') ? prefix : `${prefix}/`
  return withSlash.replace(/\/{2,}/g, '/')
}

export function sanitizeKey(key: string): string {
  return key
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/\.\./g, '_')
}

function normalizeExt(ext: string): string {
  return (ext || '').replace(/^\./, '').toLowerCase() || 'bin'
}

function ensureExt(fileName: string, ext: string): string {
  const safeName = fileName || `image.${ext}`
  return safeName.toLowerCase().endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`
}

function stripExt(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  return index > 0 ? fileName.slice(0, index) : fileName
}

function sanitizeSegment(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
  return (sanitized || 'image').slice(0, 180)
}

async function sha256Hex(buffer: Uint8Array): Promise<string> {
  const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
