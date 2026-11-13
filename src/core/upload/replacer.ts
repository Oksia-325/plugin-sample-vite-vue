import { batchUpdateBlock, getBlockAttrs, getBlockByID, getBlocksMarkdown, setBlockAttrs, updateBlock } from '@/api'
import type { ImageRef } from '../scan/types'
import { replaceImageUrlsInMarkdown, replaceTitleImageUrl } from '../scan/parser.ts'
import {
  loadFileMap,
  mergeFileMap,
  saveFileMap,
  type FileMapEntry,
} from './fileMap.ts'
import type { UploadProgress, UploadResult } from './types.ts'

export interface ReplaceOptions {
  /** 是否替换文档里的图片链接；关闭时只写 fileMap。 */
  replace?: boolean
  onProgress?: (progress: UploadProgress) => void
  isCancelled?: () => boolean
}

export interface ReplaceResult {
  replacedBlocks: number
  replacedTitleImages: number
  fileMapEntries: number
  notReplaced: number
  /** 本次确实被替换的旧图片 URL（用于界面乐观更新）。 */
  replacedUrls: string[]
  errors: string[]
  cancelled: boolean
}

export async function applyUploadResults(
  allRefs: ImageRef[],
  results: UploadResult[],
  options: ReplaceOptions = {}
): Promise<ReplaceResult> {
  const urlByNormalized = new Map<string, string>()
  const entriesByDoc = new Map<string, FileMapEntry[]>()
  const refsByNormalized = new Map<string, ImageRef[]>()

  allRefs.forEach((ref) => {
    const refs = refsByNormalized.get(ref.normalizedUrl) || []
    refs.push(ref)
    refsByNormalized.set(ref.normalizedUrl, refs)
  })

  results.forEach((result) => {
    if (!result.ok || !result.url) {
      return
    }
    urlByNormalized.set(result.ref.normalizedUrl, result.url)
    if (result.fileMapEntry && !result.reused) {
      const occurrences = refsByNormalized.get(result.ref.normalizedUrl) || [result.ref]
      occurrences.forEach((ref) => {
        const entry: FileMapEntry = {
          ...result.fileMapEntry as FileMapEntry,
          originUrl: ref.url,
          blockId: ref.blockId,
          isTitle: ref.kind === 'title',
        }
        const entries = entriesByDoc.get(ref.docId) || []
        entries.push(entry)
        entriesByDoc.set(ref.docId, entries)
      })
    }
  })

  const refsByDoc = new Map<string, ImageRef[]>()
  allRefs.forEach((ref) => {
    if (!urlByNormalized.has(ref.normalizedUrl)) {
      return
    }
    const refs = refsByDoc.get(ref.docId) || []
    refs.push(ref)
    refsByDoc.set(ref.docId, refs)
  })

  const docIds = [...refsByDoc.keys()]
  const replacedUrlSet = new Set<string>()
  const result: ReplaceResult = {
    replacedBlocks: 0,
    replacedTitleImages: 0,
    fileMapEntries: 0,
    notReplaced: 0,
    replacedUrls: [],
    errors: [],
    cancelled: false,
  }

  let done = 0
  const report = (current?: string) => {
    options.onProgress?.({
      phase: 'replacing',
      done,
      total: docIds.length,
      uploaded: 0,
      reused: 0,
      skipped: 0,
      failed: result.errors.length,
      current,
    })
  }

  for (const docId of docIds) {
    if (options.isCancelled?.()) {
      result.cancelled = true
      break
    }

    const docRefs = refsByDoc.get(docId) || []
    const docEntries = entriesByDoc.get(docId) || []

    try {
      if (docEntries.length > 0) {
        const currentMap = await loadFileMap(docId)
        const merged = mergeFileMap(currentMap, docEntries)
        await saveFileMap(docId, merged)
        result.fileMapEntries += docEntries.length
      }
    }
    catch (error) {
      result.errors.push(`写入 fileMap 失败（${docId}）：${errorMessage(error)}`)
    }

    if (options.replace === false) {
      done++
      report(docId)
      continue
    }

    const markdownRefs = docRefs.filter((ref) => ref.kind === 'markdown')
    const refsByBlock = new Map<string, ImageRef[]>()
    markdownRefs.forEach((ref) => {
      const refs = refsByBlock.get(ref.blockId) || []
      refs.push(ref)
      refsByBlock.set(ref.blockId, refs)
    })

    const pendingUpdates: Array<{ id: string; dataType: 'markdown'; data: string; refCount: number; urls: string[] }> = []
    // 一次 SQL 取回所有待替换块的 markdown，避免逐块 getBlockByID。
    let markdownByBlock: Record<string, string> | null = null
    try {
      markdownByBlock = await getBlocksMarkdown([...refsByBlock.keys()])
    }
    catch (error) {
      result.errors.push(`读取图片块失败，回退逐块读取：${errorMessage(error)}`)
    }

    for (const [blockId, blockRefs] of refsByBlock) {
      if (options.isCancelled?.()) {
        result.cancelled = true
        break
      }

      try {
        const markdown = markdownByBlock
          ? (markdownByBlock[blockId] || null)
          : await readBlockMarkdown(blockId)
        if (!markdown) {
          result.notReplaced += blockRefs.length
          result.errors.push(`图片块不存在或没有 Markdown（${blockId}）`)
          continue
        }

        const replacements = new Map<string, string>()
        blockRefs.forEach((ref) => {
          const newUrl = urlByNormalized.get(ref.normalizedUrl)
          if (newUrl) {
            replacements.set(ref.url, newUrl)
          }
        })

        const newMarkdown = replaceImageUrlsInMarkdown(markdown, replacements)
        if (newMarkdown === markdown) {
          result.notReplaced += blockRefs.length
          continue
        }

        pendingUpdates.push({
          id: blockId,
          dataType: 'markdown',
          data: newMarkdown,
          refCount: blockRefs.length,
          urls: blockRefs
            .map((ref) => ref.url)
            .filter((url) => replacements.has(url)),
        })
      }
      catch (error) {
        result.notReplaced += blockRefs.length
        result.errors.push(`替换图片块失败（${blockId}）：${errorMessage(error)}`)
      }
    }

    if (pendingUpdates.length > 0 && !result.cancelled) {
      await applyBlockUpdates(pendingUpdates, result, (urls) => {
        urls.forEach((url) => replacedUrlSet.add(url))
      })
    }

    const titleRef = docRefs.find((ref) => ref.kind === 'title' && urlByNormalized.has(ref.normalizedUrl))
    if (titleRef && !result.cancelled) {
      try {
        const attrs = await getBlockAttrs(docId)
        const titleImg = attrs?.['title-img'] || ''
        if (!titleImg) {
          result.notReplaced++
          result.errors.push(`文档没有 title-img（${docId}）`)
        }
        else {
          const newUrl = urlByNormalized.get(titleRef.normalizedUrl) as string
          const newTitleImg = replaceTitleImageUrl(titleImg, titleRef.url, newUrl)
          if (newTitleImg === titleImg) {
            result.notReplaced++
          }
          else {
            await setBlockAttrs(docId, { 'title-img': newTitleImg })
            result.replacedTitleImages++
            replacedUrlSet.add(titleRef.url)
          }
        }
      }
      catch (error) {
        result.notReplaced++
        result.errors.push(`替换题头图失败（${docId}）：${errorMessage(error)}`)
      }
    }

    done++
    report(docId)
  }

  result.replacedUrls = [...replacedUrlSet]
  return result
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function readBlockMarkdown(blockId: string): Promise<string | null> {
  const block = await getBlockByID(blockId)
  return block?.markdown || null
}

/**
 * 优先一次性批量更新（一次事务）；失败时回退为逐块更新，保证部分成功。
 */
async function applyBlockUpdates(
  updates: Array<{ id: string; dataType: 'markdown'; data: string; refCount: number; urls: string[] }>,
  result: ReplaceResult,
  onReplaced: (urls: string[]) => void
): Promise<void> {
  try {
    await batchUpdateBlock(updates.map(({ id, dataType, data }) => ({ id, dataType, data })))
    result.replacedBlocks += updates.length
    updates.forEach((item) => onReplaced(item.urls))
    return
  }
  catch (error) {
    result.errors.push(`批量替换失败，回退逐块更新：${errorMessage(error)}`)
  }

  for (const item of updates) {
    try {
      await updateBlock('markdown', item.data, item.id)
      result.replacedBlocks++
      onReplaced(item.urls)
    }
    catch (error) {
      result.notReplaced += item.refCount
      result.errors.push(`替换图片块失败（${item.id}）：${errorMessage(error)}`)
    }
  }
}
