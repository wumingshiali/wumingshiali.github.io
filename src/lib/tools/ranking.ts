/**
 * 排名生成工具的编辑器状态辅助。
 *
 * 页面 /tools/other/ranking 负责 UI 与导入导出，这里收敛「空对象 / 分数处理」等
 * 纯逻辑，便于单元测试。
 */
import type { RankingCategory, RankingItem } from "@/lib/rankings/types";
import { SCORE_MAX, SCORE_MIN, slugifyId } from "@/lib/rankings/toml";

export type { RankingCategory, RankingItem };
export { parseRankingsToml, serializeRankingsToml } from "@/lib/rankings/toml";

/**
 * 新建空条目：分数给个中位默认值 70（夯），方便预览等级。
 * 可选字段（brief/comment）在编辑器里用空串表示「无」，导出时序列化器自动跳过。
 */
export function createEmptyItem(): RankingItem {
  return { name: "", brief: "", comment: "", score: 70 };
}

/** 新建空分类 */
export function createEmptyCategory(name = "新分类"): RankingCategory {
  return {
    id: slugifyId(name),
    name,
    description: "",
    items: [createEmptyItem()],
  };
}

/**
 * 归一化：把解析结果里的 null 可选字段统一为空串（编辑器状态约定），
 * 让模板可以直接 v-model，无需逐字段判空。
 */
export function normalizeEditable(categories: RankingCategory[]): RankingCategory[] {
  return categories.map((category) => ({
    ...category,
    description: category.description ?? "",
    items: category.items.map((item) => ({
      ...item,
      brief: item.brief ?? "",
      comment: item.comment ?? "",
    })),
  }));
}

/**
 * 分数输入处理：空串 / 非法输入 → 0，超出 [0,100] 钳制到边界。
 * 返回整数（TOML 分数习惯用整数）。
 */
export function sanitizeScore(raw: string): number {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return SCORE_MIN;
  return Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, n)));
}

