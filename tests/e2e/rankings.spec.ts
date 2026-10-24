/**
 * /rankings 排名页 E2E 测试（数据驱动）。
 *
 * 断言基于 src/rankings/data.toml 的实际内容推导，
 * 站长更新排名数据时无需同步修改测试。
 *
 * 覆盖：目录页分类卡片、详情页行列表 + 分数/等级切换、排名生成工具导入导出。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { expect, test } from "@playwright/test";
import { tierOf } from "../../src/lib/rankings/tiers";

// ---- 从 data.toml 推导断言样本（与页面同源） ----
interface TomlItem {
  name: string;
  brief?: string;
  comment?: string;
  score: number;
}
interface TomlCategory {
  id: string;
  name: string;
  description?: string;
  items: TomlItem[];
}
const doc = parseToml(
  readFileSync(join(process.cwd(), "src/rankings/data.toml"), "utf-8"),
) as { categories: TomlCategory[] };
const first = doc.categories[0];
const sorted = [...first.items].sort((a, b) => b.score - a.score);

// 预置 cookie 同意状态（统计开启）：避免 Cookie 选择弹窗遮挡交互
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "cookie_consent",
      value: encodeURIComponent(
        JSON.stringify({ necessary: true, statistics: { umami: true, clarity: true } }),
      ),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
});

test("排名目录页：展示分类卡片并链接到详情页", async ({ page }) => {
  await page.goto("/rankings");

  await expect(page.getByRole("heading", { name: "排名" })).toBeVisible();
  for (const category of doc.categories) {
    await expect(page.getByRole("link", { name: new RegExp(category.name) })).toBeVisible();
  }

  await page.getByRole("link", { name: new RegExp(first.name) }).click();
  await expect(page).toHaveURL(new RegExp(`/rankings/${first.id}$`));
  await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
});

test("排名详情页：行列表按分数降序，可切换分数 / 等级", async ({ page }) => {
  await page.goto(`/rankings/${first.id}`);

  // 默认分数模式：最高分条目排第一并显示分数
  const topScore = String(sorted[0].score);
  const firstRow = page.locator('[role="listitem"]').first();
  await expect(firstRow).toContainText(sorted[0].name);
  await expect(firstRow).toContainText(topScore);
  // 最低分条目在最后一行
  const lastRow = page.locator('[role="listitem"]').last();
  await expect(lastRow).toContainText(sorted[sorted.length - 1].name);

  // 切到等级：最高分条目显示对应等级文案，原始分数消失
  await page.getByRole("tab", { name: /等级/ }).click();
  const topTier = tierOf(sorted[0].score).label;
  await expect(firstRow).toContainText(topTier);
  await expect(firstRow).not.toContainText(topScore);
  // 最低分条目显示自己的等级（与最高分不同时才断言，避免同级误判）
  const lastTier = tierOf(sorted[sorted.length - 1].score).label;
  if (lastTier !== topTier) {
    await expect(lastRow).toContainText(lastTier);
  }

  // 切回分数
  await page.getByRole("tab", { name: /^分数/ }).click();
  await expect(firstRow).toContainText(topScore);
});

test("排名生成工具：编辑、导出并导入回读", async ({ page }) => {
  await page.goto("/tools/other/ranking");

  // 编辑 tab 默认展示工具内置示例分类
  await expect(page.getByRole("heading", { name: "排名生成" })).toBeVisible();
  await expect(page.getByRole("button", { name: "美食" })).toBeVisible();

  // 导出 tab：生成的 TOML 包含 [[categories]]
  await page.getByRole("tab", { name: /导入导出/ }).click();
  const exportBox = page.locator('textarea[aria-label="生成的 TOML"]');
  await expect(exportBox).toBeVisible();
  const toml = (await exportBox.inputValue()) ?? "";
  expect(toml).toContain("[[categories]]");
  expect(toml).toContain('id = "food"');

  // 导入：粘贴一份单分类 TOML 并导入
  await page.locator('textarea[aria-label="导入 TOML 内容"]').fill(
    [
      "[[categories]]",
      'id = "movies"',
      'name = "电影"',
      "",
      "  [[categories.items]]",
      '  name = "星际穿越"',
      "  score = 96",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "导入", exact: true }).click();
  await expect(page.getByText(/导入成功：1 个分类/)).toBeVisible();

  // 回到编辑：只剩电影分类
  await page.getByRole("tab", { name: /^编辑/ }).click();
  await expect(page.getByRole("button", { name: "电影" })).toBeVisible();
  await expect(page.getByRole("button", { name: "美食" })).toHaveCount(0);
});
