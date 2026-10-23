/**
 * /rankings 排名页 E2E 测试。
 *
 * 覆盖：目录页分类卡片、详情页行列表 + 分数/等级切换、排名生成工具导入导出。
 */
import { expect, test } from "@playwright/test";

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
  await expect(page.getByRole("link", { name: /美食/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /游戏/ })).toBeVisible();

  await page.getByRole("link", { name: /美食/ }).click();
  await expect(page).toHaveURL(/\/rankings\/food$/);
  await expect(page.getByRole("heading", { name: "美食" })).toBeVisible();
});

test("排名详情页：行列表按分数降序，可切换分数 / 等级", async ({ page }) => {
  await page.goto("/rankings/food");

  // 默认分数模式：最高分「火锅」排第一并显示 95
  const firstRow = page.locator('[role="listitem"]').first();
  await expect(firstRow).toContainText("火锅");
  await expect(firstRow).toContainText("95");
  // 最低分「沙拉」在最后一行
  const lastRow = page.locator('[role="listitem"]').last();
  await expect(lastRow).toContainText("沙拉");

  // 切到等级：95 → 人上人
  await page.getByRole("tab", { name: /等级/ }).click();
  await expect(page.locator('[role="listitem"]').first()).toContainText("夯");
  // 最后一行是拉完了（沙拉 55 < 60）
  await expect(page.locator('[role="listitem"]').last()).toContainText("拉完了");

  // 切回分数
  await page.getByRole("tab", { name: /^分数/ }).click();
  await expect(page.locator('[role="listitem"]').first()).toContainText("95");
});

test("排名生成工具：编辑、导出并导入回读", async ({ page }) => {
  await page.goto("/tools/other/ranking");

  // 编辑 tab 默认展示示例分类
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
