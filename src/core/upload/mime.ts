const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ico: 'image/x-icon',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
}

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export function mimeFromExtension(fileName: string): string | undefined {
  const ext = extensionFromFileName(fileName)
  return ext ? EXTENSION_TO_MIME[ext] : undefined
}

export function extensionFromMime(contentType: string): string {
  const normalized = (contentType || '').split(';')[0].trim().toLowerCase()
  return MIME_TO_EXTENSION[normalized] || ''
}

export function extensionFromFileName(fileName: string): string {
  const clean = stripQueryAndHash(fileName || '')
  const match = clean.match(/\.([a-zA-Z0-9]{1,5})$/)
  return match ? match[1].toLowerCase() : ''
}

export function detectImageContentType(buffer: Uint8Array, fileName?: string): string {
  const magicType = sniffImageMime(buffer)
  if (magicType) {
    return magicType
  }

  if (fileName) {
    const extType = mimeFromExtension(fileName)
    if (extType) {
      return extType
    }
  }

  return 'application/octet-stream'
}

export function sniffImageMime(buffer: Uint8Array): string | undefined {
  if (!buffer || buffer.length < 2) {
    return undefined
  }

  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4E
    && buffer[3] === 0x47
    && buffer[4] === 0x0D
    && buffer[5] === 0x0A
    && buffer[6] === 0x1A
    && buffer[7] === 0x0A
  ) {
    return 'image/png'
  }

  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg'
  }

  if (buffer.length >= 6) {
    const header = ascii(buffer.subarray(0, 6))
    if (header === 'GIF87a' || header === 'GIF89a') {
      return 'image/gif'
    }
  }

  if (buffer.length >= 12 && ascii(buffer.subarray(0, 4)) === 'RIFF' && ascii(buffer.subarray(8, 12)) === 'WEBP') {
    return 'image/webp'
  }

  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'image/bmp'
  }

  if (
    buffer.length >= 4
    && ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00)
      || (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A))
  ) {
    return 'image/tiff'
  }

  if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return 'image/x-icon'
  }

  if (buffer.length >= 12 && ascii(buffer.subarray(4, 8)) === 'ftyp') {
    const brand = ascii(buffer.subarray(8, 12)).toLowerCase()
    if (brand === 'avif' || brand === 'avis') {
      return 'image/avif'
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx') {
      return 'image/heic'
    }
    if (brand === 'mif1' || brand === 'msf1') {
      return 'image/heif'
    }
  }

  const head = ascii(buffer.subarray(0, Math.min(buffer.length, 512))).trimStart().toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) {
    return 'image/svg+xml'
  }

  return undefined
}

function ascii(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes)
}

function stripQueryAndHash(value: string): string {
  return value.split('#')[0].split('?')[0]
}
