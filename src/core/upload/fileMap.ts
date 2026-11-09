import { getBlockAttrs, setBlockAttrs } from '@/api'
import { FILE_MAP_KEY, type FileMapEntry } from './fileMapPure.ts'

export {
  FILE_MAP_KEY,
  buildFileMapEntry,
  findFileMapEntry,
  getFileMapKey,
  mergeFileMap,
  sameOrigin,
  type BuildFileMapEntryOptions,
  type FileMapEntry,
} from './fileMapPure.ts'

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
