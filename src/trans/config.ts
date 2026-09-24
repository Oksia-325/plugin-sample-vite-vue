/**
 * 配置加载/保存
 *
 * 对应 Python config.yaml,改为经 plugin.loadData/saveData 持久化。
 * 思源插件运行在内核内,无需 siyuan_token/siyuan_url。
 */

import type { Plugin } from "siyuan";
import type { TransConfig } from "./types";

const STORAGE_NAME = "config.json";

export const DEFAULT_CONFIG: TransConfig = {
  engine: "qwen_mt",
  api_key: "",
  model_name: "qwen-mt-plus",
  api_url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  concurrency: 4,
  max_retries: 3,
  backoff_base: 1,
  source_lang: "English",
  target_lang: "Chinese",
  terms: [],
  tm_list: [],
  domains: "",
  write_mode: "append",
  llm_api_key: "",
  llm_base_url: "https://api.vveai.com/v1",
  llm_model_name: "deepseek-v4.1-flash",
  llm_prompt:
    "You are a professional translator. Translate the user's text faithfully and fluently into the target language, preserving meaning, tone and formatting. Output only the translation, without any explanation or notes.",
  llm_concurrency: 4,
  llm_models_history: ["deepseek-v4.1-flash"],
};

/** 加载配置,合并默认值(缺失字段补默认) */
export async function loadConfig(plugin: Plugin): Promise<TransConfig> {
  const stored = await plugin.loadData(STORAGE_NAME);
  if (!stored || typeof stored !== "object") {
    return { ...DEFAULT_CONFIG };
  }
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    terms: Array.isArray(stored.terms) ? stored.terms : [],
    tm_list: Array.isArray(stored.tm_list) ? stored.tm_list : [],
    llm_models_history: Array.isArray(stored.llm_models_history)
      ? stored.llm_models_history
      : [],
  };
}

/** 保存配置 */
export async function saveConfig(plugin: Plugin, cfg: TransConfig): Promise<void> {
  await plugin.saveData(STORAGE_NAME, cfg);
}
