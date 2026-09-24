/**
 * 思源内核客户端(薄封装)
 *
 * 移植自 siyuan_trans/src/siyuan.py,但插件运行在内核内,
 * 同源 fetch,无需 token。直接复用 src/api.ts 的封装函数。
 */

import { getChildBlocks, getHPathByID, updateBlock } from "@/api";
import type { Block } from "./types";

export class SiYuanClient {
  /** 取块/文档的直接子块(getChildBlocks 实际返回含 content/markdown 的完整块) */
  async getChildBlocks(id: string): Promise<Block[]> {
    const data = await getChildBlocks(id as BlockId);
    return (data ?? []) as unknown as Block[];
  }

  /** 取人类可读路径 */
  async getHPath(id: string): Promise<string> {
    return await getHPathByID(id as BlockId);
  }

  /** 以 markdown 更新块 */
  async updateBlock(blockId: string, markdown: string): Promise<unknown> {
    return await updateBlock("markdown", markdown, blockId as BlockId);
  }
}
