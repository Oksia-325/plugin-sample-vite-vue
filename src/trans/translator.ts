/**
 * 翻译客户端(DashScope qwen-mt + 通用 LLM,OpenAI 兼容)
 *
 * 移植自 siyuan_trans/src/translator.py。原版用 openai SDK 直连,
 * 这里经思源 forwardProxy 内核转发以规避浏览器 CORS。
 *
 * qwen-mt 通过 extra_body.translation_options 传递源/目标语言及术语、
 * 翻译记忆、领域提示;此处等价放在请求体顶层 translation_options 字段
 * (DashScope OpenAI 兼容模式支持该字段)。
 *
 * LLM 客户端走标准 OpenAI /chat/completions 格式,仅传 system prompt + 用户内容。
 * 两类客户端共用重试逻辑;最终失败抛出 ApiError(携带 HTTP 状态码),
 * 由引擎捕获并记录到 stats.api_errors 供前端展示报错码。
 */

import { forwardProxy } from "@/api";
import type { ApiStats, TransConfig } from "./types";

export interface TestResult {
  ok: boolean;
  message: string;
}

/** 翻译提供方统一接口 */
export interface TranslationProvider {
  translate(text: string, stats: ApiStats, isCancelled?: () => boolean): Promise<string | null>;
  testConnection(): Promise<TestResult>;
}

/** 带 HTTP 状态码的 API 错误 */
export class ApiError extends Error {
  status: number | null;

  constructor(status: number | null, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 用户取消翻译时抛出的错误(不计入 api_errors) */
export class CancelledError extends Error {
  constructor() {
    super("翻译已取消");
    this.name = "CancelledError";
  }
}

/** 从 forwardProxy 响应构造 ApiError,优先取响应体内的 error.message */
function apiErrorFromResponse(
  resp: { status: number, body: string },
  fallback: string,
): ApiError {
  let detail = "";
  try {
    const j = JSON.parse(resp.body);
    detail = j?.error?.message || j?.message || "";
  } catch {
    /* ignore */
  }
  const msg = detail
    ? `HTTP ${resp.status}: ${detail}`
    : `HTTP ${resp.status}: ${resp.body?.slice(0, 200) || fallback}`;
  return new ApiError(resp.status, msg);
}

/** 指数退避重试包装:成功后返回内容,耗尽重试后抛 ApiError;
 *  取消后立即抛 CancelledError,不再发起后续重试 */
async function withRetry(
  cfg: TransConfig,
  stats: ApiStats,
  call: () => Promise<string>,
  isCancelled?: () => boolean,
): Promise<string> {
  const maxRetries = cfg.max_retries ?? 3;
  const backoffBase = cfg.backoff_base ?? 1;
  let lastErr: ApiError | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (isCancelled?.()) {
      throw new CancelledError();
    }
    try {
      stats.total_calls++;
      const result = await call();
      stats.success_calls++;
      return result;
    } catch (e) {
      if (isCancelled?.()) {
        throw new CancelledError();
      }
      stats.failed_calls++;
      lastErr = e instanceof ApiError
        ? e
        : new ApiError(null, (e as Error)?.message || String(e));
      if (attempt < maxRetries) {
        const wait = Math.min(backoffBase * 2 ** attempt, 5);
        await cancellableSleep(wait * 1000, isCancelled);
      }
    }
  }
  throw lastErr ?? new ApiError(null, "翻译请求失败");
}

/** 可被取消打断的延时(轮询 isCancelled,取消时立即返回) */
function cancellableSleep(ms: number, isCancelled?: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    const poll = setInterval(() => {
      if (isCancelled?.()) {
        done();
      }
    }, 50);
    function done() {
      clearTimeout(timer);
      clearInterval(poll);
      resolve();
    }
  });
}

export class TranslationClient implements TranslationProvider {
  constructor(private cfg: TransConfig) {}

  /** 翻译一段文本,失败抛 ApiError,取消抛 CancelledError */
  async translate(text: string, stats: ApiStats, isCancelled?: () => boolean): Promise<string | null> {
    return withRetry(this.cfg, stats, async () => {
      const body = this.buildBody(text);
      const resp = await this.post(body);
      if (resp.status < 200 || resp.status >= 300) {
        throw apiErrorFromResponse(resp, "翻译接口返回异常状态码");
      }
      let parsed: any;
      try {
        parsed = JSON.parse(resp.body);
      } catch {
        throw new ApiError(resp.status, `响应解析失败: ${resp.body?.slice(0, 200)}`);
      }
      const content = parsed?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new ApiError(resp.status, "响应缺少 choices[0].message.content");
      }
      return content.trim();
    }, isCancelled);
  }

  /** 测试连通性(发 max_tokens=5 的 ping) */
  async testConnection(): Promise<TestResult> {
    try {
      const body = this.buildBody("ping", 5);
      const resp = await this.post(body);
      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, message: "API Key 无效,请检查配置中的 api_key" };
      }
      if (resp.status === 429) {
        return { ok: true, message: `API 可用(限流中,认证有效) (model: ${this.cfg.model_name})` };
      }
      if (resp.status < 200 || resp.status >= 300) {
        return { ok: false, message: `HTTP ${resp.status}: ${resp.body.slice(0, 200)}` };
      }
      return { ok: true, message: `API 可用 (model: ${this.cfg.model_name})` };
    } catch (e) {
      return { ok: false, message: `连接失败: ${(e as Error).message}` };
    }
  }

  /** 构造 OpenAI 兼容请求体 */
  private buildBody(text: string, maxTokens?: number): any {
    const translationOptions: any = {
      source_lang: this.cfg.source_lang,
      target_lang: this.cfg.target_lang,
    };
    if (this.cfg.terms?.length) {
      translationOptions.terms = this.cfg.terms;
    }
    if (this.cfg.tm_list?.length) {
      translationOptions.tm_list = this.cfg.tm_list;
    }
    if (this.cfg.domains?.trim()) {
      translationOptions.domains = this.cfg.domains.trim();
    }
    const body: any = {
      model: this.cfg.model_name,
      messages: [{ role: "user", content: text }],
      extra_body: { translation_options: translationOptions },
      // DashScope OpenAI 兼容模式同时接受顶层 translation_options
      translation_options: translationOptions,
    };
    if (maxTokens !== undefined) {
      body.max_tokens = maxTokens;
    }
    return body;
  }

  /** 经 forwardProxy 发送 POST,返回解析后的响应 */
  private async post(body: any): Promise<{ status: number, body: string }> {
    const headers = [{ Authorization: `Bearer ${this.cfg.api_key}` }];
    const res = await forwardProxy(
      this.cfg.api_url,
      "POST",
      JSON.stringify(body),
      headers,
      30000,
      "application/json",
    );
    if (!res) {
      throw new ApiError(null, "forwardProxy 无响应(请确认思源内核可访问外网)");
    }
    return { status: res.status, body: res.body ?? "" };
  }
}

/** LLM 引擎客户端(标准 OpenAI /chat/completions 格式) */
export class LlmTranslationClient implements TranslationProvider {
  constructor(private cfg: TransConfig) {}

  /** 翻译一段文本,失败抛 ApiError,取消抛 CancelledError */
  async translate(text: string, stats: ApiStats, isCancelled?: () => boolean): Promise<string | null> {
    return withRetry(this.cfg, stats, async () => {
      const body = this.buildBody(text);
      const resp = await this.post(body);
      if (resp.status < 200 || resp.status >= 300) {
        throw apiErrorFromResponse(resp, "LLM 接口返回异常状态码");
      }
      let parsed: any;
      try {
        parsed = JSON.parse(resp.body);
      } catch {
        throw new ApiError(resp.status, `响应解析失败: ${resp.body?.slice(0, 200)}`);
      }
      const content = parsed?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new ApiError(resp.status, "响应缺少 choices[0].message.content");
      }
      this.accumulateUsage(parsed?.usage, stats);
      return content.trim();
    }, isCancelled);
  }

  /** 从 OpenAI 兼容响应的 usage 提取 token/缓存统计,累加到 stats
   *  端点不返回 usage 或缓存字段时对应项不计入(cache_reported 保持 false) */
  private accumulateUsage(usage: any, stats: ApiStats): void {
    if (!usage || typeof usage !== "object") {
      return;
    }
    const prompt = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0;
    const completion = typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0;
    const details = usage.prompt_tokens_details;
    // 各家缓存字段不同,兜底取第一个存在的数值
    const cached = [
      details?.cached_tokens,
      details?.prompt_cache_hit_tokens,
      usage.prompt_cache_hit_tokens,
    ].find((v) => typeof v === "number" && v > 0) ?? 0;
    stats.prompt_tokens = (stats.prompt_tokens ?? 0) + prompt;
    stats.completion_tokens = (stats.completion_tokens ?? 0) + completion;
    stats.cached_tokens = (stats.cached_tokens ?? 0) + cached;
    if (cached > 0) {
      stats.cache_reported = true;
    }
  }

  /** 测试连通性(发 max_tokens=5 的 ping) */
  async testConnection(): Promise<TestResult> {
    try {
      const body = this.buildBody("ping", 5);
      const resp = await this.post(body);
      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, message: "API Key 无效,请检查 LLM 配置中的 api_key" };
      }
      if (resp.status === 429) {
        return { ok: true, message: `API 可用(限流中,认证有效) (model: ${this.cfg.llm_model_name})` };
      }
      if (resp.status < 200 || resp.status >= 300) {
        return { ok: false, message: `HTTP ${resp.status}: ${resp.body.slice(0, 200)}` };
      }
      return { ok: true, message: `API 可用 (model: ${this.cfg.llm_model_name})` };
    } catch (e) {
      return { ok: false, message: `连接失败: ${(e as Error).message}` };
    }
  }

  /** 构造 OpenAI 兼容请求体:system = 翻译 Prompt,user = 待翻译文本 */
  private buildBody(text: string, maxTokens?: number): any {
    const body: any = {
      model: this.cfg.llm_model_name,
      messages: [
        {
          role: "system",
          content: this.cfg.llm_prompt?.trim() || "You are a professional translator. Translate the user's text faithfully and fluently into the target language, preserving meaning, tone and formatting. Output only the translation.",
        },
        { role: "user", content: text },
      ],
    };
    if (maxTokens !== undefined) {
      body.max_tokens = maxTokens;
    }
    return body;
  }

  /** 经 forwardProxy 发送 POST;base_url 自动补全 /chat/completions 路径 */
  private async post(body: any): Promise<{ status: number, body: string }> {
    const base = (this.cfg.llm_base_url ?? "").replace(/\/+$/, "");
    const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
    const headers = [{ Authorization: `Bearer ${this.cfg.llm_api_key}` }];
    const res = await forwardProxy(
      url,
      "POST",
      JSON.stringify(body),
      headers,
      30000,
      "application/json",
    );
    if (!res) {
      throw new ApiError(null, "forwardProxy 无响应(请确认思源内核可访问外网)");
    }
    return { status: res.status, body: res.body ?? "" };
  }
}
