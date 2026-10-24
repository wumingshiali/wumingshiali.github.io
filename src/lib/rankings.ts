/**
 * 排名数据访问（客户端）。
 *
 * 单一 TOML（src/rankings/data.toml）在构建期由 vite-plugin-rankings 解析成
 * `virtual:rankings-data` 虚拟模块，客户端只同步读取，不在运行时引入 TOML 解析器。
 */
import { rankingsData } from "virtual:rankings-data";
import type { RankingCategory, RankingItem } from "./rankings/types";

/** 等级映射（纯逻辑，独立模块便于 E2E / 工具复用） */
export { TIERS, tierOf } from "./rankings/tiers";
export type { Tier, TierInfo } from "./rankings/tiers";
export type { RankingCategory, RankingItem } from "./rankings/types";

/** 条目排序器：按分数从高到低（同分保持原始顺序） */
export function sortRankingItems(items: RankingItem[]): RankingItem[] {
  return [...items].sort((a, b) => b.score - a.score);
}

/** 获取全部排名分类（保持 TOML 顺序，同步读取构建期数据） */
export function getAllRankings(): RankingCategory[] {
  return rankingsData;
}

/** 按 id 查找分类（未命中返回 undefined） */
export function getRankingById(id: string): RankingCategory | undefined {
  return rankingsData.find((category) => category.id === id);
}
