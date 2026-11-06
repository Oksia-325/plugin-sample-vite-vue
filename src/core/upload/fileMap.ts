import { getBlockAttrs, setBlockAttrs } from '@/api'
import { extractFileName } from '../scan/parser.ts'
import md5 from './vendor/md5.ts'

export const FILE_MAP_KEY = 'custom-picgo-file-map-key'

export interface FileMapEntry {
  name: string
  hash: string
  originUrl: string
  url: string
  alt: string
  title: string
  isLocal: boolean
  blockId: string
  isTitle?: boolean
}

export interface BuildFileMapEntryOptions {
  originUrl: string
  url: string
  alt?: string
  title?: string
  blockId: string
  isTitle?: boolean
  name?: string
}

export async function loadFileMap(docId: string): Promise<Record<string, FileMapEntry>> {
  try {
    const attrs = await getBlockAttrs(docId)
    const raw = attrs?.[FILE_MAP_KEY]
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, FileMapEntry>
    }
  }
  catch {
    // Ignore missing/corrupt fileMap; it will be rebuilt.
  }
  return {}
}

export async function saveFileMap(docId: string, fileMap: Record<string, FileMapEntry>): Promise<void> {
  await setBlockAttrs(docId, {
    [FILE_MAP_KEY]: JSON.stringify(fileMap),
  })
}

export function mergeFileMap(
  base: Record<string, FileMapEntry>,
  entries: FileMapEntry[]
): Record<string, FileMapEntry> {
  const merged = { ...base }

  entries.forEach((input) => {
    const entry = { ...input }
    if (!entry.hash) {
      entry.hash = getFileMapKey(entry.name || entry.originUrl)
    }

    const existing = merged[entry.hash]
    if (existing && !sameOrigin(existing.originUrl, entry.originUrl)) {
      entry.hash = getFileMapKey(entry.originUrl)
    }

    merged[entry.hash] = entry
  })

  return merged
}

export function findFileMapEntry(
  fileMap: Record<string, FileMapEntry>,
  originUrl: string,
  name?: string
): FileMapEntry | undefined {
  const entryName = name || extractFileName(originUrl)
  const primary = fileMap[getFileMapKey(entryName)]
  if (primary && sameOrigin(primary.originUrl, originUrl)) {
    return primary
  }

  const originKey = fileMap[getFileMapKey(originUrl)]
  if (originKey && sameOrigin(originKey.originUrl, originUrl)) {
    return originKey
  }

  return Object.values(fileMap).find((entry) => sameOrigin(entry.originUrl, originUrl))
}

export function buildFileMapEntry(options: BuildFileMapEntryOptions): FileMapEntry {
  const name = options.name || extractFileName(options.originUrl) || options.originUrl
  return {
    name,
    hash: getFileMapKey(name),
    originUrl: options.originUrl,
    url: options.url,
    alt: options.alt ?? '',
    title: options.title ?? '',
    isLocal: false,
    blockId: options.blockId,
    isTitle: options.isTitle,
  }
}

export function getFileMapKey(value: string): string {
  return md5(value)
}

function sameOrigin(left: string, right: string): boolean {
  return normalizeOrigin(left) === normalizeOrigin(right)
}

function normalizeOrigin(value: string): string {
  const raw = (value || '').trim()
  if (!raw) {
    return ''
  }

  const assetMatch = raw.match(/assets\/[^?#]+/)
  if (assetMatch) {
    return safeDecode(assetMatch[0])
  }

  return raw
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}
