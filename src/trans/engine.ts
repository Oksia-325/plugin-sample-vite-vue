/**
 * 翻译引擎
 *
 * 移植自 siyuan_trans/src/engine.py。流程:
 *   取 hpath → 取顶层块 → 分类收集 → 公式保护 → 并发翻译 → 还原 → 按模式写回
 *
 * 三种写入模式:
 *   - append : 双语追加(Python 原版行为),updateBlock 每块
 *   - replace: 仅译文,updateBlock 每块
 *   - new_doc: 汇总译文 markdown,在同笔记本新建"(译文)"文档
 *
 * 对于 append/replace:列表块('l')是容器,递归取子列表项('i')逐项翻译;
 * 对于 new_doc:列表块作为整体单元翻译,不递归。
 */

import { createDocWithMd, sql } from "@/api";
import type {
  Block,
  EngineCallbacks,
  ProgressCallback,
  StatusCallback,
  TransConfig,
  TranslationStats,
} from "./types";
import { emptyStats, type ApiStats } from "./types";
import {
  extractEnglishMarkdown,
  hasCjk,
  headingPrefix,
  isFormulaBlock,
  isHeadingBlock,
  isHtmlBlock,
  isImageBlock,
  isListBlock,
  isListItem,
  isParagraphBlock,
  isTranslated,
  stripListPrefix,
} from "./detector";
import { SiYuanClient } from "./siyuan";
import {
  CancelledError,
  LlmTranslationClient,
  TranslationClient,
  type TranslationProvider,
} from "./translator";

type Reason = "translate" | "already" | "non_text";

const FORMULA_RE = /\$[^$]+?\$/g;

export class TranslationEngine {
  private cfg: TransConfig;
  private cancelled = false;
  private cancelPromise?: Promise<void>;
  private resolveCancel?: () => void;

  constructor(cfg: TransConfig) {
    this.cfg = cfg;
  }

  cancel(): void {
    this.cancelled = true;
    this.resolveCancel?.();
  }

  /** 把异步操作与取消信号竞速:取消时立即抛 CancelledError,不等在途请求返回 */
  private withCancellation<T>(p: Promise<T>): Promise<T> {
    const cp = this.cancelPromise;
    if (!cp) {
      return p;
    }
    return Promise.race([
      p,
      cp.then(() => {
        throw new CancelledError();
      }),
    ]);
  }

  async run(
    docId: string,
    callbacks?: EngineCallbacks,
  ): Promise<TranslationStats> {
    this.cancelled = false;
    this.cancelPromise = new Promise<void>((resolve) => {
      this.resolveCancel = resolve;
    });
    const stats = emptyStats();
    const start = Date.now();
    const { onProgress, onStatus, onComplete } = callbacks ?? {};
    const notify = (cb?: StatusCallback, msg?: string) => {
      if (cb && msg) {
        try {
          cb(msg);
        } catch {
          /* ignore */
        }
      }
    };
    const notifyProgress = (cb: ProgressCallback | undefined, done: number, total: number) => {
      if (cb) {
        try {
          cb(done, total, stats);
        } catch {
          /* ignore */
        }
      }
    };

    const descendLists = this.cfg.write_mode !== "new_doc";

    try {
      notify(onStatus, "正在连接思源笔记...");
      const siyuan = new SiYuanClient();
      // 按引擎选择翻译提供方:llm 走通用 OpenAI 兼容,其余走 qwen-mt
      const provider: TranslationProvider = this.cfg.engine === "llm"
        ? new LlmTranslationClient(this.cfg)
        : new TranslationClient(this.cfg);
      const concurrency = this.cfg.engine === "llm"
        ? (this.cfg.llm_concurrency ?? this.cfg.concurrency)
        : this.cfg.concurrency;

      const hpath = await siyuan.getHPath(docId);
      let blocks = await siyuan.getChildBlocks(docId);
      stats.total_blocks = blocks.length;

      notify(onStatus, `正在分析: ${hpath}`);

      const toTranslate: Block[] = [];
      for (const block of blocks) {
        if (this.cancelled) {
          break;
        }
        await this.collectTranslatable(block, siyuan, toTranslate, stats, descendLists);
      }

      const total = toTranslate.length;
      notify(
        onStatus,
        `共需翻译 ${total} 个块 (跳过 ${stats.skipped_non_text} 非文本, ${stats.skipped_already_translated} 已翻译)`,
      );

      if (!toTranslate.length) {
        stats.elapsed = (Date.now() - start) / 1000;
        onComplete?.(stats, false);
        return stats;
      }

      // 并发翻译
      const apiStats: ApiStats = {
        total_calls: 0,
        success_calls: 0,
        failed_calls: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        cached_tokens: 0,
        cache_reported: false,
      };
      const translations = new Map<string, { translation: string | null, block: Block }>();

      await this.runConcurrent(
        toTranslate,
        concurrency,
        async (block) => {
          if (this.cancelled) {
            return;
          }
          const text = this.extractText(block);
          const { protected: protectedText, formulaMap } = this.protectFormulas(text);
          let translation: string | null = null;
          try {
            translation = await this.withCancellation(
              provider.translate(protectedText, apiStats, () => this.cancelled),
            );
          } catch (e) {
            if (e instanceof CancelledError) {
              return;
            }
            // LLM API 报错较多,记录状态码供前端展示
            const err = e instanceof Error ? e : new Error(String(e));
            const status = (e as { status?: number | null }).status ?? null;
            stats.api_errors.push({ blockId: block.id, status, message: err.message });
          }
          if (translation) {
            translation = this.restoreFormulas(translation, formulaMap);
          }
          translations.set(block.id, { translation, block });
          stats.translated = translations.size;
          stats.api_total = apiStats.total_calls;
          stats.api_success = apiStats.success_calls;
          stats.api_failed = apiStats.failed_calls;
          notifyProgress(onProgress, translations.size, total);
        },
      );

      // 并发结束后同步最终的 API 计数与 token/缓存统计(取消时也以已完成为准)
      stats.api_total = apiStats.total_calls;
      stats.api_success = apiStats.success_calls;
      stats.api_failed = apiStats.failed_calls;
      stats.prompt_tokens = apiStats.prompt_tokens ?? 0;
      stats.completion_tokens = apiStats.completion_tokens ?? 0;
      stats.cached_tokens = apiStats.cached_tokens ?? 0;
      stats.cache_reported = apiStats.cache_reported ?? false;

      // 写回
      if (!this.cancelled && translations.size) {
        notify(onStatus, "正在回写翻译结果...");
        if (this.cfg.write_mode === "new_doc") {
          await this.writeNewDoc(docId, blocks, translations, stats, onStatus);
        } else {
          for (const [, { translation, block }] of translations) {
            if (this.cancelled) {
              break;
            }
            if (!translation) {
              continue;
            }
            try {
              const newMd = this.buildMarkdown(block, translation);
              await siyuan.updateBlock(block.id, newMd);
              stats.write_success++;
            } catch {
              stats.write_failed++;
            }
          }
        }
      }
    } catch (e) {
      notify(onStatus, `错误: ${(e as Error).message}`);
    } finally {
      stats.elapsed = (Date.now() - start) / 1000;
      const cancelled = this.cancelled;
      try {
        onComplete?.(stats, cancelled);
      } catch {
        /* ignore */
      }
    }
    return stats;
  }

  /** 分类单个块(对应 _classify_block) */
  private classifyBlock(block: Block): Reason {
    if (isHtmlBlock(block) || isImageBlock(block) || isFormulaBlock(block)) {
      return "non_text";
    }
    if (!(isHeadingBlock(block) || isParagraphBlock(block) || isListItem(block))) {
      return "non_text";
    }
    if (isTranslated(block)) {
      return "already";
    }
    if (!(block.content ?? "").trim()) {
      return "non_text";
    }
    if (isHeadingBlock(block) && hasCjk(block.content ?? "")) {
      return "already";
    }
    return "translate";
  }

  /** 收集可翻译块(对应 _collect_translatable) */
  private async collectTranslatable(
    block: Block,
    siyuan: SiYuanClient,
    out: Block[],
    stats: TranslationStats,
    descendLists: boolean,
  ): Promise<void> {
    if (isListBlock(block) && descendLists) {
      const children = await siyuan.getChildBlocks(block.id);
      for (const child of children) {
        await this.collectTranslatable(child, siyuan, out, stats, descendLists);
      }
      return;
    }
    // new_doc 模式:列表块作为整体单元翻译(不递归),classifyBlock 本会把
    // 列表块归为 non_text,这里对有内容且未翻译的列表块直接入队
    if (isListBlock(block) && !descendLists) {
      if (!(block.markdown ?? "").trim()) {
        stats.skipped_non_text++;
        return;
      }
      if (isTranslated(block)) {
        stats.skipped_already_translated++;
        return;
      }
      out.push(block);
      return;
    }
    const reason = this.classifyBlock(block);
    if (reason === "translate") {
      out.push(block);
    } else if (reason === "already") {
      stats.skipped_already_translated++;
    } else {
      stats.skipped_non_text++;
    }
  }

  /** 抽取待翻译文本(对应 _extract_text) */
  private extractText(block: Block): string {
    if (hasCjk(block.content ?? "")) {
      return extractEnglishMarkdown(block);
    }
    if (isListItem(block)) {
      return stripListPrefix(block.markdown ?? "");
    }
    if (isHeadingBlock(block)) {
      return block.content ?? "";
    }
    return block.markdown ?? "";
  }

  /** 公式保护:$...$ → [Fn] 占位 */
  private protectFormulas(text: string): { protected: string, formulaMap: Map<string, string> } {
    const formulaMap = new Map<string, string>();
    let idx = 0;
    const protectedText = text.replace(FORMULA_RE, (m) => {
      const key = `[F${idx}]`;
      formulaMap.set(key, m);
      idx++;
      return key;
    });
    return { protected: protectedText, formulaMap };
  }

  /** 还原公式占位 */
  private restoreFormulas(text: string, formulaMap: Map<string, string>): string {
    let result = text;
    for (const [key, formula] of formulaMap) {
      result = result.split(key).join(formula);
    }
    return result;
  }

  /** 构建写回 markdown(append 模式,对应 _build_markdown) */
  private buildMarkdown(block: Block, translation: string): string {
    if (hasCjk(block.content ?? "")) {
      const englishMd = extractEnglishMarkdown(block);
      const sep = isHeadingBlock(block) ? " " : "\n";
      return `${englishMd}${sep}${translation}`;
    }
    if (isHeadingBlock(block)) {
      return `${headingPrefix(block)}${block.content} ${translation}`;
    }
    return `${block.markdown}\n${translation}`;
  }

  /** 有界并发执行器 */
  private async runConcurrent(
    items: Block[],
    concurrency: number,
    worker: (block: Block) => Promise<void>,
  ): Promise<void> {
    const limit = Math.max(1, concurrency);
    let cursor = 0;
    const runners: Promise<void>[] = [];
    const next = async (): Promise<void> => {
      while (cursor < items.length) {
        if (this.cancelled) {
          return;
        }
        const item = items[cursor++];
        await worker(item);
      }
    };
    for (let i = 0; i < limit; i++) {
      runners.push(next());
    }
    await Promise.all(runners);
  }

  /** new_doc 模式:汇总译文为 markdown,在同笔记本新建"(译文)"文档 */
  private async writeNewDoc(
    docId: string,
    topBlocks: Block[],
    translations: Map<string, { translation: string | null, block: Block }>,
    stats: TranslationStats,
    onStatus?: StatusCallback,
  ): Promise<void> {
    // 顶层块按原顺序拼接;已翻译块用译文,其余用原 markdown
    const parts: string[] = [];
    for (const block of topBlocks) {
      if (this.cancelled) {
        break;
      }
      const entry = translations.get(block.id);
      if (entry?.translation) {
        const t = entry.translation;
        if (isHeadingBlock(block)) {
          parts.push(`${headingPrefix(block)}${t}`);
        } else {
          parts.push(t);
        }
      } else {
        parts.push(block.markdown ?? "");
      }
    }
    const md = parts.join("\n\n");
    if (this.cancelled) {
      return;
    }

    // 取源文档所在笔记本 id 与 hpath,推导新文档路径
    const rows = await sql(
      `SELECT box, hpath FROM blocks WHERE id='${docId}' AND type='d'`,
    );
    const row = rows?.[0];
    if (!row?.box) {
      throw new Error("无法解析源文档笔记本,新建译文文档失败");
    }
    const hpath: string = row.hpath || "";
    const lastSlash = hpath.lastIndexOf("/");
    const parentPath = lastSlash >= 0 ? hpath.slice(0, lastSlash) : "";
    const title = lastSlash >= 0 ? hpath.slice(lastSlash + 1) : "未命名";
    const newPath = `${parentPath}/${title} (译文)`;

    onStatus?.(`正在新建文档: ${newPath}`);
    const newId = await createDocWithMd(row.box as NotebookId, newPath as DocumentId, md);
    if (newId) {
      stats.write_success++;
    } else {
      stats.write_failed++;
    }
  }
}
