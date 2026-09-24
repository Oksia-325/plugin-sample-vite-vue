/**
 * 块分类 + CJK 检测 + 已翻译启发式
 *
 * 逐函数移植自 siyuan_trans/src/detector.py。所有函数为纯函数,
 * CJK Unicode 范围、已翻译启发式(尾部 30% CJK 占比 ≥60%)、
 * 图片块正则、列表标记剥离正则等均保持一致。
 */

import type { Block } from "./types";

/** 判断字符是否在 CJK Unicode 范围内(对应 _is_cjk_char) */
export function isCjkChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff)      // CJK Unified Ideographs
    || (cp >= 0x3400 && cp <= 0x4dbf)    // CJK Extension A
    || (cp >= 0xf900 && cp <= 0xfaff)    // CJK Compat Ideographs
    || (cp >= 0x2f800 && cp <= 0x2fa1f)  // CJK Compat Supplement
    || (cp >= 0x3000 && cp <= 0x303f)    // CJK Symbols and Punctuation
    || (cp >= 0xff00 && cp <= 0xffef)    // Halfwidth and Fullwidth Forms
  );
}

/** 判断文本是否含任意 CJK 字符(对应 has_cjk) */
export function hasCjk(text: string): boolean {
  for (const ch of text) {
    if (isCjkChar(ch)) {
      return true;
    }
  }
  return false;
}

const ANNOTATION_RE = /\{:\s[^}]+\}/g;

/** 判断块是否已翻译(尾部 30% 文本 CJK 占比 ≥60%) */
export function isTranslated(block: Block): boolean {
  const content = block.content ?? "";
  if (!content) {
    return false;
  }

  const clean = content.replace(ANNOTATION_RE, "").trim();
  if (!clean) {
    return false;
  }

  const totalLen = clean.length;
  const tailStart = Math.floor(totalLen * 0.7);
  const tail = clean.slice(tailStart);
  if (!tail) {
    return false;
  }

  let cjkCount = 0;
  for (const ch of tail) {
    if (isCjkChar(ch)) {
      cjkCount++;
    }
  }
  const ratio = cjkCount / tail.length;
  return ratio >= 0.6;
}

const IMAGE_BLOCK_RE
  = /^!\[[^\]]*\]\([^)\s]*(?:\s+"[^"]*")?\)\s*(?:\{:[^}]*\})?\s*$/;

/** 判断段落块是否纯图片(可能带标题或思源属性注解) */
export function isImageBlock(block: Block): boolean {
  const md = (block.markdown ?? "").trim();
  return IMAGE_BLOCK_RE.test(md);
}

export function isHtmlBlock(block: Block): boolean {
  return block.type === "html";
}

export function isFormulaBlock(block: Block): boolean {
  return block.type === "m";
}

export function isHeadingBlock(block: Block): boolean {
  return block.type === "h";
}

export function isParagraphBlock(block: Block): boolean {
  return block.type === "p";
}

/** 列表块是容器,其可翻译文本在子列表项(type 'i')中 */
export function isListBlock(block: Block): boolean {
  return block.type === "l";
}

export function isListItem(block: Block): boolean {
  return block.type === "i";
}

const LIST_PREFIX_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;

/** 剥离列表标记('- '、'* '、'1. '、'1) ') */
export function stripListPrefix(text: string): string {
  return text.replace(LIST_PREFIX_RE, "");
}

/** 从 content 字段抽取英文部分
 *  标题:取第一个 CJK 字符之前的文本
 *  段落:取第一行,并剥离行尾 CJK */
export function extractEnglishContent(block: Block): string {
  const content = block.content ?? "";
  if (!content) {
    return "";
  }

  if (isHeadingBlock(block)) {
    for (let i = 0; i < content.length; i++) {
      if (isCjkChar(content[i])) {
        return content.slice(0, i).trimEnd();
      }
    }
    return content.trimEnd();
  }

  const lines = content.split("\n");
  let firstLine = lines[0];
  for (let i = 0; i < firstLine.length; i++) {
    if (isCjkChar(firstLine[i])) {
      firstLine = firstLine.slice(0, i).trimEnd();
      break;
    }
  }
  return firstLine.trim();
}

/** 从 markdown 字段抽取英文部分(保留标题前缀) */
export function extractEnglishMarkdown(block: Block): string {
  const md = block.markdown ?? "";
  if (!md) {
    return "";
  }

  if (isHeadingBlock(block)) {
    const prefix = headingPrefix(block);
    let textPart = md.slice(prefix.length);
    for (let i = 0; i < textPart.length; i++) {
      if (isCjkChar(textPart[i])) {
        textPart = textPart.slice(0, i).trimEnd();
        break;
      }
    }
    return prefix + textPart;
  }

  const lines = md.split("\n");
  return lines[0].trim();
}

/** 根据 subType 取标题前缀(h1→"# ", h2→"## ") */
export function headingPrefix(block: Block): string {
  const sub = block.subType ?? "h1";
  const levelStr = sub.slice(1);
  const level = Number.parseInt(levelStr, 10);
  const levelNum = Number.isNaN(level) ? 1 : level;
  return "#".repeat(levelNum) + " ";
}
