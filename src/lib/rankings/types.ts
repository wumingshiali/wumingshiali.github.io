/**
 * 排名数据共享类型。
 *
 * 客户端（src/lib/rankings.ts）、TOML 解析/序列化（src/lib/rankings/toml.ts）
 * 与 vite 插件（vite-plugin-rankings.ts）共用，避免重复定义。
 */

/** 排名条目 */
export interface RankingItem {
  /** 条目名称（必填） */
  name: string;
  /** 简洁描述（可选，缺省 null） */
  brief: string | null;
  /** 评价（可选，缺省 null） */
  comment: string | null;
  /** 分数 0-100（决定等级展示） */
  score: number;
}

/** 排名分类 */
export interface RankingCategory {
  /** 分类唯一标识（URL 用，仅小写字母/数字/连字符） */
  id: string;
  /** 分类显示名（必填） */
  name: string;
  /** 分类一句话描述（可选，缺省 null） */
  description: string | null;
  /** 分类下的排名条目 */
  items: RankingItem[];
}
