import { sql } from '@/api'
import type { PigoConfig } from '../config'
import {
  createParsedImage,
  extractTitleImageFromIal,
  hashString,
  parseHtmlImages,
  parseMarkdownImages,
  parseTitleImage,
} from './parser.ts'
import { computeRefStats, dedupeRefs } from '../stats/aggregate.ts'
import {
  ScanCancelledError,
  type DocMeta,
  type ImageRef,
  type ScanAllOptions,
  type ScanAllResult,
  type ScanDocResult,
} from './types.ts'

interface DocRow {
  id: string
  content?: string | null
  hpath?: string | null
  ial?: string | null
}

interface BlockRow {
  id: string
  root_id: string
  markdown?: string | null
}

export async function scanDoc(docId: string, config: PigoConfig): Promise<ScanDocResult> {
  const startedAt = Date.now()

  const docRows = await query<DocRow>(`
    select id, content, hpath, ial
    from blocks
    where id = '${escapeSqlString(docId)}'
    limit 1
  `)
  const docRow = docRows[0]
  if (!docRow) {
    throw new Error('文档不存在或未找到')
  }

  const blockRows = await query<BlockRow>(`
    select id, root_id, markdown
    from blocks
    where root_id = '${escapeSqlString(docId)}'
      and (markdown like '%![%' or markdown like '%<img%')
    order by sort
    limit 100000
  `)

  const doc = toDocMeta(docRow)
  const refs = buildRefsForDoc(doc, blockRows, extractTitleImageFromIal(docRow.ial || ''), config)
  const uniqueRefs = dedupeRefs(refs)

  return {
    doc,
    refs,
    uniqueRefs,
    stats: computeRefStats(refs, uniqueRefs),
    scannedAt: Date.now(),
    durationMs: Date.now() - startedAt,
  }
}

export async function scanAll(config: PigoConfig, options: ScanAllOptions = {}): Promise<ScanAllResult> {
  const startedAt = Date.now()

  const docRows = await query<DocRow>(`
    select id, content, hpath
    from blocks
    where type = 'd'
    order by hpath
    limit 100000
  `)

  if (docRows.length === 0) {
    return {
      docs: [],
      refs: [],
      uniqueRefs: [],
      stats: computeRefStats([], []),
      scannedAt: Date.now(),
      durationMs: Date.now() - startedAt,
    }
  }

  const titleRows = await query<DocRow>(`
    select id, ial
    from blocks
    where type = 'd'
      and ial like '%title-img%'
    limit 100000
  `)
  const titleByDoc = new Map<string, string>()
  titleRows.forEach((row) => {
    titleByDoc.set(row.id, extractTitleImageFromIal(row.ial || ''))
  })

  const blockRows = await query<BlockRow>(`
    select id, root_id, markdown
    from blocks
    where markdown like '%![%' or markdown like '%<img%'
    order by root_id, sort
    limit 200000
  `)
  const blocksByDoc = groupBlocksByDoc(blockRows)

  const docs = docRows.map(toDocMeta)
  const refs: ImageRef[] = []

  for (let index = 0; index < docs.length; index++) {
    if (options.isCancelled?.()) {
      throw new ScanCancelledError()
    }

    const doc = docs[index]
    refs.push(
      ...buildRefsForDoc(
        doc,
        blocksByDoc.get(doc.id) || [],
        titleByDoc.get(doc.id) || '',
        config
      )
    )

    options.onProgress?.({
      processed: index + 1,
      total: docs.length,
      docId: doc.id,
      docTitle: doc.title,
      docPath: doc.path,
    })

    if (index % 20 === 19) {
      await yieldToUi()
    }
  }

  const uniqueRefs = dedupeRefs(refs)

  return {
    docs,
    refs,
    uniqueRefs,
    stats: computeRefStats(refs, uniqueRefs),
    scannedAt: Date.now(),
    durationMs: Date.now() - startedAt,
  }
}

function buildRefsForDoc(
  doc: DocMeta,
  blocks: BlockRow[],
  titleImage: string,
  config: PigoConfig
): ImageRef[] {
  const refs: ImageRef[] = []
  let occurrence = 0

  blocks.forEach((block) => {
    const markdown = block.markdown || ''
    const parsedImages = [
      ...parseMarkdownImages(markdown),
      ...parseHtmlImages(markdown),
    ]

    parsedImages.forEach((parsed) => {
      const image = createParsedImage(parsed.url, parsed.alt, parsed.title, 'markdown', config.s3)
      const currentOccurrence = occurrence++
      refs.push({
        ...image,
        id: `markdown:${block.id}:${currentOccurrence}:${hashString(image.normalizedUrl)}`,
        blockId: block.id,
        docId: doc.id,
        docTitle: doc.title,
        docPath: doc.path,
        occurrence: currentOccurrence,
      })
    })
  })

  if (titleImage) {
    const parsed = parseTitleImage(titleImage)
    if (parsed) {
      const image = createParsedImage(parsed.url, parsed.alt, parsed.title, 'title', config.s3)
      refs.push({
        ...image,
        id: `title:${doc.id}:0:${hashString(image.normalizedUrl)}`,
        blockId: doc.id,
        docId: doc.id,
        docTitle: doc.title,
        docPath: doc.path,
        occurrence: 0,
      })
    }
  }

  return refs
}

function groupBlocksByDoc(blocks: BlockRow[]): Map<string, BlockRow[]> {
  const map = new Map<string, BlockRow[]>()
  blocks.forEach((block) => {
    const list = map.get(block.root_id)
    if (list) {
      list.push(block)
    }
    else {
      map.set(block.root_id, [block])
    }
  })
  return map
}

function toDocMeta(row: DocRow): DocMeta {
  return {
    id: row.id,
    title: row.content || '',
    path: row.hpath || '',
  }
}

async function query<T>(statement: string): Promise<T[]> {
  const rows = await sql(statement)
  return Array.isArray(rows) ? rows as T[] : []
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, '\'\'')
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}
