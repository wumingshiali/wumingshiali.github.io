import type { RouteRecordRaw } from "vue-router";

/**
 * 补充 vue-router 生成的虚拟模块 `vue-router/auto-routes` 中
 * 运行时导出的 `routes` 值的类型声明。
 *
 * typed-router.d.ts 只声明了 RouteNamedMap 等类型（供 useRoute() 推导），
 * 未声明运行时导出的 routes 值，此处通过模块声明合并补全。
 */
declare module "vue-router/auto-routes" {
  export const routes: RouteRecordRaw[];
}
