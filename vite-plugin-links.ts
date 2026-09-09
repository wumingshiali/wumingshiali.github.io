/**
 * Vite 插件：以虚拟模块暴露友链数据。
 *
 * 单一数据源 src/links/data.toml（name/url/priority/cover）由构建期解析为 `virtual:links-data` 虚拟模块，
 * 客户端只消费解析结果，不引入 TOML 解析器，也不在运行时解析。
 *
 * 与博客（vite-plugin-prerender-posts 提交生成文件）不同：友链面向外部贡献者，
 * 贡献者只需修改 TOML 提交 PR，无需本地构建、无需提交生成文件；
 * 因此采用按需解析的虚拟模块，天然保持与 TOML 一致。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { Plugin } from "vite";

/** 友链数据文件（单一数据源） */
const LINKS_FILE = resolve("src/links/data.toml");
/** 客户端消费的虚拟模块 id */
export const LINKS_VIRTUAL_ID = "virtual:links-data";

export type LinkPriority = "high" | "default" | "low";

export interface FriendLink {
  name: string;
  url: string;
  priority: LinkPriority;
  /** 封面图 URL（可选，缺省 null 时页面显示占位图标） */
  cover: string | null;
}

/** 合法优先级集合 */
const PRIORITIES: readonly LinkPriority[] = ["high", "default", "low"];

/** 校验优先级：缺省为 default，非法值抛错（构建期快速失败，不静默吞格式问题） */
function toPriority(raw: unknown, index: number): LinkPriority {
  if (raw === undefined) return "default";
  if (typeof raw !== "string" || !PRIORITIES.includes(raw as LinkPriority)) {
    throw new Error(
      `links[${index}].priority 必须是 high/default/low 之一，收到: ${JSON.stringify(raw)}`,
    );
  }
  return raw as LinkPriority;
}

/** 校验封面：缺省为 null，非空字符串才合法（构建期快速失败） */
function toCover(raw: unknown, index: number): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`links[${index}].cover 必须是字符串 URL（可缺省）`);
  }
  return raw.trim();
}

/** 解析并校验友链 TOML → 友链列表（保持 TOML 原始顺序，排序在客户端） */
export function parseLinksToml(raw: string): FriendLink[] {
  const doc = parseToml(raw) as { links?: unknown };
  const rawLinks = doc.links;
  if (rawLinks === undefined) return [];
  if (!Array.isArray(rawLinks)) {
    throw new Error("data.toml 需要 [[links]] 数组表结构");
  }
  return rawLinks.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`links[${index}] 必须是 [[links]] 表格`);
    }
    const { name, url } = item as Record<string, unknown>;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`links[${index}].name 必填且不能为空`);
    }
    if (typeof url !== "string" || url.trim() === "") {
      throw new Error(`links[${index}].url 必填且不能为空`);
    }
    return {
      name: name.trim(),
      url: url.trim(),
      priority: toPriority((item as Record<string, unknown>).priority, index),
      cover: toCover((item as Record<string, unknown>).cover, index),
    };
  });
}

/** 读取并解析友链 TOML（构建/dev/测试按需调用，始终与数据源一致） */
export function loadLinksData(): FriendLink[] {
  return parseLinksToml(readFileSync(LINKS_FILE, "utf-8"));
}

export function linksData(): Plugin {
  return {
    name: "links-data",
    enforce: "pre",

    resolveId(id) {
      if (id === LINKS_VIRTUAL_ID) return LINKS_VIRTUAL_ID;
    },

    load(id) {
      if (id !== LINKS_VIRTUAL_ID) return;
      // 按需解析：构建、dev、测试都拿到与 TOML 一致的最新数据
      return `export const linksData = ${JSON.stringify(loadLinksData())};`;
    },
  };
}
