import type { S3Config } from '../config'
import { matchS3Key } from './s3Key.ts'
import type { ImageRefKind, ImageSourceType, ParsedImage } from './types'

export interface ParsedMarkdownImage {
  url: string
  alt: string
  title: string
}

/**
 * 解析 Markdown 图片语法。
 *
 * 支持：
 * - ![alt](url)
 * - ![alt](url "title")
 * - ![alt](<url with spaces>)
 * - URL 中包含括号、查询串、无扩展名
 * - 后面的 {: ...} 属性会被忽略
 */
export function parseMarkdownImages(markdown: string): ParsedMarkdownImage[] {
  const results: ParsedMarkdownImage[] = []
  if (!markdown) {
    return results
  }

  let cursor = 0
  while (cursor < markdown.length) {
    const start = markdown.indexOf('![', cursor)
    if (start === -1) {
      break
    }

    const altStart = start + 2
    const altEnd = findClosingBracket(markdown, altStart)
    if (altEnd === -1) {
      cursor = start + 2
      continue
    }

    if (markdown[altEnd + 1] !== '(') {
      cursor = altEnd + 1
      continue
    }

    const destinationStart = altEnd + 2
    const destinationEnd = findClosingParen(markdown, destinationStart)
    if (destinationEnd === -1) {
      cursor = destinationStart
      continue
    }

    const destination = markdown.slice(destinationStart, destinationEnd).trim()
    const parsed = parseDestination(destination)
    if (parsed.url) {
      results.push({
        url: parsed.url,
        alt: markdown.slice(altStart, altEnd),
        title: parsed.title,
      })
    }

    cursor = destinationEnd + 1
  }

  return results
}

/**
 * 解析 HTML <img src="...">。
 */
export function parseHtmlImages(markdown: string): ParsedMarkdownImage[] {
  const results: ParsedMarkdownImage[] = []
  if (!markdown || !markdown.includes('<img')) {
    return results
  }

  const regex = /<img\b([^>]*)>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    const attributes = match[1] || ''
    const src = getHtmlAttribute(attributes, 'src')
    if (!src) {
      continue
    }
    results.push({
      url: decodeHtmlEntities(src),
      alt: decodeHtmlEntities(getHtmlAttribute(attributes, 'alt') || ''),
      title: decodeHtmlEntities(getHtmlAttribute(attributes, 'title') || ''),
    })
  }

  return results
}

/**
 * 解析题头图属性 title-img。
 *
 * 支持：
 * - background-image:url("assets/x.webp")
 * - background-image:url('https://...')
 * - background-image:url(assets/x.webp)
 * - 直接一个 URL
 */
export function parseTitleImage(titleImg: string): ParsedMarkdownImage | null {
  const trimmed = decodeHtmlEntities((titleImg || '').trim())
  if (!trimmed) {
    return null
  }

  const urlMatch = trimmed.match(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/i)
  const rawUrl = urlMatch
    ? urlMatch[1] ?? urlMatch[2] ?? urlMatch[3] ?? ''
    : trimmed

  const url = rawUrl.trim()
  if (!url) {
    return null
  }

  return {
    url,
    alt: '',
    title: '',
  }
}

/**
 * 解析思源 blocks.ial 属性串。
 *
 * 例如：{: id="..." title-img="background-image:url(&quot;assets/a.webp&quot;)"}
 */
export function extractIalAttributes(ial: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  if (!ial) {
    return attributes
  }

  const regex = /([\w-]+)="([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(ial)) !== null) {
    attributes[match[1]] = decodeHtmlEntities(match[2])
  }
  return attributes
}

export function extractTitleImageFromIal(ial: string): string {
  return extractIalAttributes(ial)['title-img'] || ''
}

export function extractFileMapFromIal(ial: string): Record<string, unknown> | null {
  const raw = extractIalAttributes(ial)['custom-picgo-file-map-key']
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  }
  catch {
    // Ignore corrupted fileMap.
  }
  return null
}

export function createParsedImage(
  url: string,
  alt: string,
  title: string,
  kind: ImageRefKind,
  config: S3Config
): ParsedImage {
  const classified = classifyUrl(url, config)
  return {
    url,
    alt,
    title,
    kind,
    sourceType: classified.sourceType,
    normalizedUrl: classified.normalizedUrl,
    s3Key: classified.s3Key,
    assetPath: classified.assetPath,
  }
}

export function classifyUrl(
  url: string,
  config: S3Config
): {
  sourceType: ImageSourceType
  normalizedUrl: string
  s3Key?: string
  assetPath?: string
} {
  const raw = (url || '').trim()

  if (!raw) {
    return { sourceType: 'remote', normalizedUrl: 'remote:' }
  }

  if (raw.startsWith('data:')) {
    return {
      sourceType: 'data',
      normalizedUrl: `data:${hashString(raw)}`,
    }
  }

  const s3Key = matchS3Key(raw, config)
  if (s3Key) {
    return {
      sourceType: 's3',
      normalizedUrl: `s3:${s3Key}`,
      s3Key,
    }
  }

  const assetPath = extractAssetPath(raw)
  if (assetPath) {
    return {
      sourceType: 'local',
      normalizedUrl: `local:${assetPath}`,
      assetPath,
    }
  }

  return {
    sourceType: 'remote',
    normalizedUrl: `remote:${raw}`,
  }
}

export function extractAssetPath(url: string): string | undefined {
  const raw = (url || '').trim()
  if (!raw) {
    return undefined
  }

  const clean = raw.split('#')[0].split('?')[0].replace(/\\/g, '/')

  if (clean.startsWith('assets/') || clean.startsWith('./assets/') || clean.startsWith('/assets/')) {
    return normalizeAssetPath(clean)
  }

  const match = clean.match(/\/assets\/[^/].*$/)
  if (match) {
    return normalizeAssetPath(match[0])
  }

  return undefined
}

export function extractFileName(url: string): string {
  const clean = (url || '').split('#')[0].split('?')[0]
  const parts = clean.split('/')

  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index]
    if (part && part.includes('.')) {
      return safeDecode(part)
    }
  }

  const last = parts[parts.length - 1] || clean
  return safeDecode(last) || 'image'
}

export function hashString(input: string): string {
  let hash = 0x811C9DC5
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function decodeHtmlEntities(value: string): string {
  if (!value || !value.includes('&')) {
    return value
  }

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    const lower = code.toLowerCase()
    if (lower.startsWith('#x')) {
      return safeCodePoint(Number.parseInt(lower.slice(2), 16), entity)
    }
    if (lower.startsWith('#')) {
      return safeCodePoint(Number.parseInt(lower.slice(1), 10), entity)
    }

    switch (lower) {
      case 'amp':
        return '&'
      case 'lt':
        return '<'
      case 'gt':
        return '>'
      case 'quot':
        return '"'
      case 'apos':
        return '\''
      case 'nbsp':
        return ' '
      default:
        return entity
    }
  })
}

function parseDestination(destination: string): { url: string, title: string } {
  if (!destination) {
    return { url: '', title: '' }
  }

  if (destination.startsWith('<')) {
    const end = destination.indexOf('>')
    if (end > 0) {
      return {
        url: destination.slice(1, end),
        title: parseTitle(destination.slice(end + 1).trim()),
      }
    }
  }

  const quotedTitle = destination.match(/^(\S+)\s+(?:"([^"]*)"|'([^']*)')$/)
  if (quotedTitle) {
    return {
      url: quotedTitle[1],
      title: quotedTitle[2] ?? quotedTitle[3] ?? '',
    }
  }

  const spaceIndex = destination.search(/\s/)
  if (spaceIndex > 0) {
    return {
      url: destination.slice(0, spaceIndex),
      title: parseTitle(destination.slice(spaceIndex).trim()),
    }
  }

  return { url: destination, title: '' }
}

function parseTitle(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function findClosingBracket(text: string, start: number): number {
  let depth = 0
  for (let index = start; index < text.length; index++) {
    const char = text[index]
    if (char === '\\') {
      index++
      continue
    }
    if (char === '[') {
      depth++
      continue
    }
    if (char === ']') {
      if (depth === 0) {
        return index
      }
      depth--
    }
  }
  return -1
}

function findClosingParen(text: string, start: number): number {
  let depth = 0
  for (let index = start; index < text.length; index++) {
    const char = text[index]
    if (char === '\\') {
      index++
      continue
    }
    if (char === '(') {
      depth++
      continue
    }
    if (char === ')') {
      if (depth === 0) {
        return index
      }
      depth--
    }
  }
  return -1
}

function getHtmlAttribute(attributes: string, name: string): string | undefined {
  const regex = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i')
  const match = attributes.match(regex)
  if (!match) {
    return undefined
  }
  return match[1] ?? match[2] ?? match[3] ?? ''
}

function normalizeAssetPath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^\/+/, '')
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

function safeCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isFinite(codePoint)) {
    return fallback
  }
  try {
    return String.fromCodePoint(codePoint)
  }
  catch {
    return fallback
  }
}
