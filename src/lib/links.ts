/**
 * 友链数据访问（客户端）。
 *
 * 单一 TOML（src/links/data.toml）在构建期由 vite-plugin-links 解析成
 * `virtual:links-data` 虚拟模块，客户端只同步读取，不在运行时引入 TOML 解析器。
 */
import { linksData } from "virtual:links-data";

/** 友链优先级：排序权重 high > default > low */
export type LinkPriority = "high" | "default" | "low";

/** 友链条目 */
export interface FriendLink {
  /** 显示名称 */
  name: string;
  /** 跳转链接 */
  url: string;
  /** 排序优先级（缺省为 default） */
  priority: LinkPriority;
  /** 封面图 URL（可选，缺省 null 时显示占位图标） */
  cover: string | null;
}

/** 优先级权重：数值越小越靠前 */
const PRIORITY_WEIGHT: Record<LinkPriority, number> = {
  high: 0,
  default: 1,
  low: 2,
};

/** 名称排序器：中文按拼音、拉丁按字母（sensitivity: base 忽略大小写） */
const nameCollator = new Intl.Collator("zh-Hans-CN", { sensitivity: "base" });

/**
 * 友链排序：第一依据优先级（high > default > low），
 * 第二依据名称首字母（中文拼音 / 拉丁字母）。
 */
export function sortLinks(links: FriendLink[]): FriendLink[] {
  return [...links].sort(
    (a, b) =>
      PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
      nameCollator.compare(a.name, b.name),
  );
}

/** 获取全部友链（已按优先级 + 首字母排序，同步读取构建期数据） */
export function getAllLinks(): FriendLink[] {
  return sortLinks(linksData);
}
