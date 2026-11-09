import { sql } from '@/api'
import { extractFileMapFromIal } from '../scan/parser.ts'
import type { FileMapEntry } from '../upload/fileMapPure.ts'

interface IalRow {
  id: string
  ial?: string | null
}

interface CountRow {
  c?: number | string | null
}

/**
 * 一次 SQL 读取所有带 fileMap 的文档，避免逐文档调用 getBlockAttrs。
 */
export async function loadDocFileMaps(): Promise<Map<string, Record<string, FileMapEntry>>> {
  const result = new Map<string, Record<string, FileMapEntry>>()

  try {
    const rows = await sql(`
      select id, ial
      from blocks
      where type = 'd'
        and ial like '%custom-picgo-file-map-key%'
      limit 100000
    `) as IalRow[]

    if (!Array.isArray(rows)) {
      return result
    }

    rows.forEach((row) => {
      const parsed = extractFileMapFromIal(row.ial || '')
      if (parsed) {
        result.set(row.id, parsed as Record<string, FileMapEntry>)
      }
    })
  }
  catch {
    // 老工作空间可能没有 assets 表或 IAL 字段差异，统计降级为 0。
  }

  return result
}

export async function countAssetFiles(): Promise<{ assetFiles: number, titleAssets: number }> {
  const [assetFiles, titleAssets] = await Promise.all([
    count(`select count(*) as c from assets`),
    count(`select count(*) as c from assets where title = 'title-img'`),
  ])

  return { assetFiles, titleAssets }
}

async function count(statement: string): Promise<number> {
  try {
    const rows = await sql(statement) as CountRow[]
    if (!Array.isArray(rows) || rows.length === 0) {
      return 0
    }
    const value = Number(rows[0]?.c ?? 0)
    return Number.isFinite(value) ? value : 0
  }
  catch {
    return 0
  }
}
