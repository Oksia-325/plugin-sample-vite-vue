/**
 * LLM 引擎跨会话累计统计(与配置分离,独立持久化到 llm_stats.json)
 *
 * 数据来源:OpenAI 兼容 /chat/completions 非流式响应的 usage 对象,
 * 由 translator.ts 的 LlmTranslationClient 在每次成功调用时累加。
 * 端点不返回 usage 或缓存字段时,对应项不计入(cache_reported 保持 false,
 * 命中率显示 —)。
 */

import type { Plugin } from "siyuan";
import type { LlmCumulativeStats } from "./types";

const STORAGE_NAME = "llm_stats.json";

/** 空累计统计 */
export function emptyLlmStats(): LlmCumulativeStats {
  return {
    calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    cached_tokens: 0,
    cache_reported: false,
  };
}

/** 加载累计统计,缺失字段补默认 */
export async function loadLlmStats(plugin: Plugin): Promise<LlmCumulativeStats> {
  const stored = await plugin.loadData(STORAGE_NAME);
  if (!stored || typeof stored !== "object") {
    return emptyLlmStats();
  }
  const s = stored as Partial<LlmCumulativeStats>;
  return {
    calls: typeof s.calls === "number" ? s.calls : 0,
    input_tokens: typeof s.input_tokens === "number" ? s.input_tokens : 0,
    output_tokens: typeof s.output_tokens === "number" ? s.output_tokens : 0,
    cached_tokens: typeof s.cached_tokens === "number" ? s.cached_tokens : 0,
    cache_reported: s.cache_reported === true,
  };
}

/** 保存累计统计 */
export async function saveLlmStats(plugin: Plugin, stats: LlmCumulativeStats): Promise<void> {
  await plugin.saveData(STORAGE_NAME, stats);
}

/** 把一次翻译运行的增量并入累计统计并保存,返回新的累计值 */
export async function accumulateLlmStats(
  plugin: Plugin,
  delta: Pick<LlmCumulativeStats, "calls" | "input_tokens" | "output_tokens" | "cached_tokens" | "cache_reported">,
): Promise<LlmCumulativeStats> {
  const cur = await loadLlmStats(plugin);
  const next: LlmCumulativeStats = {
    calls: cur.calls + (delta.calls || 0),
    input_tokens: cur.input_tokens + (delta.input_tokens || 0),
    output_tokens: cur.output_tokens + (delta.output_tokens || 0),
    cached_tokens: cur.cached_tokens + (delta.cached_tokens || 0),
    cache_reported: cur.cache_reported || delta.cache_reported === true,
  };
  await saveLlmStats(plugin, next);
  return next;
}

/** 清零累计统计并保存 */
export async function resetLlmStats(plugin: Plugin): Promise<LlmCumulativeStats> {
  const next = emptyLlmStats();
  await saveLlmStats(plugin, next);
  return next;
}

/**
 * Token 数量以 M(百万)为单位显示,总长度最长 10 位(含 M),
 * 小数位 0~3 逐级尝试取满足长度的最大精度,并去掉尾部多余的 0。
 * 例:1234567 → 1.235M,10000000 → 10M,500000 → 0.5M;非法值返回 —。
 */
export function formatM(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    return "—";
  }
  const m = n / 1_000_000;
  for (let d = 3; d >= 0; d--) {
    const s = trimZeros(m.toFixed(d));
    if ((s + "M").length <= 10) {
      return `${s}M`;
    }
  }
  return `${trimZeros(m.toFixed(0))}M`;
}

/** 去掉小数的尾部 0(含纯整数时的 .0) */
function trimZeros(s: string): string {
  if (!s.includes(".")) {
    return s;
  }
  return s.replace(/\.?0+$/, "");
}

/**
 * 缓存命中率:cached / input * 100,最多 2 位小数去尾零。
 * 分母为 0 或无缓存数据时返回 —。
 */
export function formatHitRate(cached: number, input: number, cacheReported: boolean): string {
  if (!cacheReported || input <= 0) {
    return "—";
  }
  const pct = (cached / input) * 100;
  return `${trimZeros(pct.toFixed(2))}%`;
}
