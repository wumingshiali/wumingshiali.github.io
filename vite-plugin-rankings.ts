/**
 * Vite 插件：以虚拟模块暴露排名数据。
 *
 * 单一数据源 src/rankings/data.toml（分类 + 条目 + 分数）由构建期解析为
 * `virtual:rankings-data` 虚拟模块，客户端只消费解析结果，不引入 TOML 解析器。
 *
 * 与友链（vite-plugin-links）同构：贡献者/站长只需修改 TOML 提交，无需本地构建。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { parseRankingsToml } from "./src/lib/rankings/toml.ts";
import type { RankingCategory } from "./src/lib/rankings/types.ts";

/** 排名数据文件（单一数据源） */
const RANKINGS_FILE = resolve("src/rankings/data.toml");
/** 客户端消费的虚拟模块 id */
export const RANKINGS_VIRTUAL_ID = "virtual:rankings-data";

/** 读取并解析排名 TOML（构建/dev/测试按需调用，始终与数据源一致） */
export function loadRankingsData(): RankingCategory[] {
  return parseRankingsToml(readFileSync(RANKINGS_FILE, "utf-8"));
}

export function rankingsData(): Plugin {
  return {
    name: "rankings-data",
    enforce: "pre",

    resolveId(id) {
      if (id === RANKINGS_VIRTUAL_ID) return RANKINGS_VIRTUAL_ID;
    },

    load(id) {
      if (id !== RANKINGS_VIRTUAL_ID) return;
      return `export const rankingsData = ${JSON.stringify(loadRankingsData())};`;
    },
  };
}
