/**
 * 语言清单与展示名
 *
 * 值使用 DashScope / OpenAI 兼容端可识别的英文语言名,
 * 展示层统一映射成中文,工作台与设置页共用同一份定义。
 */

/** 支持选择的语言(值 → 端点可识别的名称) */
export const LANGUAGES = [
  'English',
  'Chinese',
  'Simplified Chinese',
  'Traditional Chinese',
  'Japanese',
  'Korean',
  'French',
  'German',
  'Spanish',
  'Russian',
  'Portuguese',
  'Italian',
  'Arabic',
  'Thai',
  'Vietnamese',
] as const

/** 中文展示名(端点语言名 → 中文) */
const LABELS: Record<string, string> = {
  English: '英文',
  Chinese: '中文',
  'Simplified Chinese': '简体中文',
  'Traditional Chinese': '繁体中文',
  Japanese: '日文',
  Korean: '韩文',
  French: '法文',
  German: '德文',
  Spanish: '西班牙文',
  Russian: '俄文',
  Portuguese: '葡萄牙文',
  Italian: '意大利文',
  Arabic: '阿拉伯文',
  Thai: '泰文',
  Vietnamese: '越南文',
}

/** 取语言的中文展示名(未知值原样返回) */
export function langLabel(value: string): string {
  return LABELS[value] ?? value
}
