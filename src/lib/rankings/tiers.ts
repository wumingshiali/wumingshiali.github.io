/**
 * 排名等级映射（纯逻辑，无数据依赖）。
 *
 * 独立成模块：页面、生成工具与 E2E 测试均可直接导入，
 * 不经过 virtual:rankings-data 虚拟模块（Node 环境不可用）。
 */

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
