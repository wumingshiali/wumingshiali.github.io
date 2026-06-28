/**
 * 构建产物完整性测试。
 *
 * 必须先 `pnpm build` 生成 dist/。
 * 关注：Cloudflare Pages 部署需要的文件是否齐全：
 * - index.html（入口）
 * - _headers（Cloudflare 自定义头）
 * - 至少一个 hashed JS 资源，且 index.html 正确引用
 * - 资源文件有兄弟 .br 或 .gz 预压缩副本（vite-plugin-compression2 产物）
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const DIST = resolve(process.cwd(), "dist");
const ASSETS = resolve(DIST, "assets");

function listDir(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir) : [];
}

describe("dist/ 构建产物完整性", () => {
  beforeAll(() => {
    if (!existsSync(DIST)) {
      throw new Error(
        `dist/ 不存在。请先执行 \`pnpm build\` 再跑 \`pnpm test:build\`。`,
      );
    }
  });

  it("包含 dist/index.html", () => {
    expect(listDir(DIST)).toContain("index.html");
  });

  it("包含 dist/_headers（Cloudflare 自定义头）", () => {
    expect(listDir(DIST)).toContain("_headers");
  });

  it("dist/assets/ 至少存在一个 hashed JS 入口", () => {
    const assets = listDir(ASSETS);
    const hashed = assets.filter((f) => /^index\.[A-Za-z0-9_-]+\.js$/.test(f));
    expect(hashed.length).toBeGreaterThanOrEqual(1);
  });

  it("index.html 引用了 hashed JS 入口", () => {
    const html = readFileSync(resolve(DIST, "index.html"), "utf8");
    const assets = listDir(ASSETS);
    const jsFile = assets.find((f) => /^index\.[A-Za-z0-9_-]+\.js$/.test(f));
    expect(jsFile).toBeTruthy();
    expect(html).toContain(`/assets/${jsFile}`);
  });

  it("hashed 资源都有兄弟 .br 或 .gz 预压缩副本", () => {
    const assets = listDir(ASSETS);
    // 排除预压缩副本本身与已压缩格式（vite.config.ts 的 compression.exclude），
    // webp / woff / woff2 本身已是压缩格式，重复压缩无收益，不应要求预压缩副本
    const hashed = assets.filter(
      (f) =>
        /\.[A-Za-z0-9_-]{6,}\./.test(f) &&
        !/\.(br|gz)$/.test(f) &&
        !/\.(webp|woff2?)$/i.test(f),
    );
    expect(hashed.length).toBeGreaterThan(0);
    for (const f of hashed) {
      const full = resolve(ASSETS, f);
      // 跳过很小的文件（compression2 阈值 1KB 以下不压缩）
      if (statSync(full).size < 1024) continue;
      const hasBr = existsSync(`${full}.br`);
      const hasGz = existsSync(`${full}.gz`);
      expect(hasBr || hasGz, `${f} 缺少预压缩副本`).toBe(true);
    }
  });
});
