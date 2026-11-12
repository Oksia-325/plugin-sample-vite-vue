/**
 * 翻译插件核心类型定义
 *
 * 移植自 siyuan_trans/src/*.py,字段语义与 Python 版保持一致。
 * 思源插件运行在内核内,无需 siyuan_token/siyuan_url,故从配置中移除。
 */

/** 翻译结果写入模式 */
export type WriteMode = "append" | "replace" | "new_doc";

/** 翻译引擎类型 */
export type EngineType = "qwen_mt" | "llm";

/** 术语 / 翻译记忆条目 */
export interface TermPair {
  source: string;
  target: string;
}

/** 翻译配置(对应 Python config.yaml,经 plugin.loadData/saveData 持久化) */
export interface TransConfig {
  /** 翻译引擎 */
  engine: EngineType;
  /** DashScope API Key */
  api_key: string;
  /** 翻译模型名,如 qwen-mt-plus */
  model_name: string;
  /** OpenAI 兼容端点 URL */
  api_url: string;
  /** 并发翻译数 */
  concurrency: number;
  /** 最大重试次数 */
  max_retries: number;
  /** 指数退避基数(秒),上限 5s */
  backoff_base: number;
  /** 源语言,如 English */
  source_lang: string;
  /** 目标语言,如 Chinese */
  target_lang: string;
  /** 术语干预 */
  terms: TermPair[];
  /** 翻译记忆 */
  tm_list: TermPair[];
  /** 领域提示 */
  domains: string;
  /** 写入模式 */
  write_mode: WriteMode;
  /** LLM 引擎 API Key */
  llm_api_key: string;
  /** LLM 引擎 OpenAI 兼容端点 URL */
  llm_base_url: string;
  /** LLM 引擎模型名 */
  llm_model_name: string;
  /** LLM 引擎翻译 Prompt */
  llm_prompt: string;
  /** LLM 引擎并发数 */
  llm_concurrency: number;
  /** LLM 引擎历史模型名(下拉记录) */
  llm_models_history: string[];
}

/** 思源块( getChildBlocks 返回项的富类型 )
 *  思源实际返回字段为驼峰 subType;sample 的 IResGetChildBlock 只声明了部分字段,
 *  这里按 detector.py 依赖的字段自定义完整类型。 */
export interface Block {
  id: string;
  type: string; // h | p | l | i | html | m | s ...
  subType?: string; // h1 | h2 | u | o ...
  content: string;
  markdown: string;
  [key: string]: unknown;
}

/** 文档预扫描结果(不发起翻译,只统计待处理块,供工作台展示) */
export interface ScanResult {
  docId: string;
  /** 人类可读路径 /Personal/xxx */
  hpath: string;
  /** 顶层块总数 */
  totalBlocks: number;
  /** 待翻译块数 */
  translatable: number;
  /** 跳过的非文本 / 空块 */
  skippedNonText: number;
  /** 跳过的已翻译块 */
  skippedAlready: number;
  /** 正文语言推断:latin=英文类,cjk=中文类,mixed=混排,unknown=无内容 */
  sourceLangHint: "latin" | "cjk" | "mixed" | "unknown";
}

/** 翻译运行统计(对应 Python TranslationStats) */
export interface TranslationStats {
  total_blocks: number;
  translated: number;
  skipped_non_text: number;
  skipped_already_translated: number;
  api_total: number;
  api_success: number;
  api_failed: number;
  write_success: number;
  write_failed: number;
  elapsed: number; // 秒
  /** API 失败明细(含 HTTP 报错码,供前端展示) */
  api_errors: ApiErrorInfo[];
  /** 本次运行累计输入 Token(LLM 引擎,无数据为 0) */
  prompt_tokens: number;
  /** 本次运行累计输出 Token(LLM 引擎,无数据为 0) */
  completion_tokens: number;
  /** 本次运行累计缓存命中 Token(LLM 引擎,无数据为 0) */
  cached_tokens: number;
  /** 本次运行是否至少一次响应带缓存字段(无缓存数据时命中率显示 —) */
  cache_reported: boolean;
}

/** 单块翻译失败信息 */
export interface ApiErrorInfo {
  blockId: string;
  /** HTTP 状态码,网络层失败为 null */
  status: number | null;
  message: string;
}

export function emptyStats(): TranslationStats {
  return {
    total_blocks: 0,
    translated: 0,
    skipped_non_text: 0,
    skipped_already_translated: 0,
    api_total: 0,
    api_success: 0,
    api_failed: 0,
    write_success: 0,
    write_failed: 0,
    elapsed: 0,
    api_errors: [],
    prompt_tokens: 0,
    completion_tokens: 0,
    cached_tokens: 0,
    cache_reported: false,
  };
}

/** 翻译 API 调用计数(对应 Python raw_stats 字典) */
export interface ApiStats {
  total_calls: number;
  success_calls: number;
  failed_calls: number;
  /** 累计输入 Token(LLM 引擎,端点返回 usage 时累加) */
  prompt_tokens?: number;
  /** 累计输出 Token(LLM 引擎,端点返回 usage 时累加) */
  completion_tokens?: number;
  /** 累计缓存命中 Token(LLM 引擎,端点返回缓存字段时累加) */
  cached_tokens?: number;
  /** 是否至少一次响应带缓存字段 */
  cache_reported?: boolean;
}

/** 跨会话持久化的 LLM 累计统计(存 plugin.loadData("llm_stats.json")) */
export interface LlmCumulativeStats {
  /** 累计翻译次数(= 累计成功 API 调用数) */
  calls: number;
  /** 累计输入 Token */
  input_tokens: number;
  /** 累计输出 Token */
  output_tokens: number;
  /** 累计缓存命中 Token */
  cached_tokens: number;
  /** 历史是否出现过缓存字段(无则命中率显示 —) */
  cache_reported: boolean;
}

/** 单块翻译的流水日志(供工作台实时展示) */
export interface TranslationLogEntry {
  blockId: string;
  /** 展示用块类型名,如 段落 / 标题 2 / 列表项 */
  blockType: string;
  /** start=发起请求 ok=译完 err=失败 write=写回失败 skip=跳过 */
  kind: "start" | "ok" | "err" | "write" | "skip";
  /** 该块的 token 消耗(LLM 引擎可用时) */
  tokens?: number;
  message: string;
  /** 时间戳(ms) */
  ts: number;
}

/** 引擎回调类型 */
export type ProgressCallback = (done: number, total: number, stats: TranslationStats) => void;
export type BlockStartCallback = (
  block: Block,
  index: number,
  total: number,
  stats: TranslationStats,
) => void;
export type LogCallback = (entry: TranslationLogEntry) => void;
export type StatusCallback = (status: string) => void;
export type CompleteCallback = (stats: TranslationStats, cancelled: boolean) => void;

export interface EngineCallbacks {
  onProgress?: ProgressCallback;
  /** 开始处理某个块(用于「Block i of N」与当前块提示) */
  onBlockStart?: BlockStartCallback;
  /** 逐块流水日志 */
  onLog?: LogCallback;
  onStatus?: StatusCallback;
  onComplete?: CompleteCallback;
}
