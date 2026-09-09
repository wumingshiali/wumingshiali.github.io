/**
 * `virtual:links-data` 虚拟模块的类型声明。
 *
 * 该模块由 vite-plugin-links 在构建/测试时按需生成（内容来自 src/links/data.toml），
 * 不存在实体文件，此处为 vue-tsc / 编辑器提供类型。
 */
declare module "virtual:links-data" {
  export interface GeneratedFriendLink {
    name: string;
    url: string;
    priority: "high" | "default" | "low";
    cover: string | null;
  }

  export const linksData: GeneratedFriendLink[];
}
