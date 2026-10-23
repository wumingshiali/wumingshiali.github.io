/**
 * `virtual:rankings-data` 虚拟模块的类型声明。
 *
 * 该模块由 vite-plugin-rankings 在构建/测试时按需生成（内容来自 src/rankings/data.toml），
 * 不存在实体文件，此处为 vue-tsc / 编辑器提供类型。
 */
declare module "virtual:rankings-data" {
  export interface GeneratedRankingItem {
    name: string;
    brief: string | null;
    comment: string | null;
    score: number;
  }

  export interface GeneratedRankingCategory {
    id: string;
    name: string;
    description: string | null;
    items: GeneratedRankingItem[];
  }

  export const rankingsData: GeneratedRankingCategory[];
}
