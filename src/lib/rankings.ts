/**
 * 排名数据访问（客户端）。
 *
 * 单一 TOML（src/rankings/data.toml）在构建期由 vite-plugin-rankings 解析成
 * `virtual:rankings-data` 虚拟模块，客户端只同步读取，不在运行时引入 TOML 解析器。
 */
import { rankingsData } from "virtual:rankings-data";
import type { RankingCategory, RankingItem } from "./rankings/types";

export type { RankingCategory, RankingItem } from "./rankings/types";

/** 等级（由分数推导）：从高到低 */
export type Tier = "solid" | "top" | "elite" | "npc" | "done";

/** 等级定义：分数区间下限（含） + 展示文案 + 徽章样式 */
export interface TierInfo {
  id: Tier;
  /** 展示文案 */
  label: string;
  /** 徽章完整类名（静态字符串，供 Tailwind 扫描） */
  badgeClass: string;
  /** 分数区间下限（含） */
  min: number;
}

/**
 * 等级表（按分数从高到低）：
 * 夯 ≥90 / 顶级 ≥80 / 人上人 ≥70 / NPC ≥60 / 拉完了 <60
 */
export const TIERS: readonly TierInfo[] = [
  {
    id: "solid",
    label: "夯",
    badgeClass:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    min: 90,
  },
  {
    id: "top",
    label: "顶级",
    badgeClass:
      "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    min: 80,
  },
  {
    id: "elite",
    label: "人上人",
    badgeClass:
      "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    min: 70,
  },
  {
    id: "npc",
    label: "NPC",
    badgeClass:
      "border-slate-400/50 bg-slate-400/10 text-slate-500 dark:text-slate-400",
    min: 60,
  },
  {
    id: "done",
    label: "拉完了",
    badgeClass:
      "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
    min: 0,
  },
];

/** 分数 → 等级（分数越低等级越靠后） */
export function tierOf(score: number): TierInfo {
  for (const tier of TIERS) {
    if (score >= tier.min) return tier;
  }
  return TIERS[TIERS.length - 1];
}

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
