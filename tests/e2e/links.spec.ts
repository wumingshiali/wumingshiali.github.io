/**
 * /links 友链页 E2E 测试。
 *
 * 覆盖：页面可访问、友链卡片渲染、添加友链操作说明弹窗。
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

test("友链页：渲染卡片并弹出添加说明", async ({ page }) => {
  await page.goto("/links");

  // 标题与说明
  await expect(page.getByRole("heading", { name: "友链" })).toBeVisible();

  // 友链卡片：指向外部链接
  const card = page.locator('a[href="https://acofork.com"][target="_blank"]').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText("Acofork");
  // cover 封面渲染
  await expect(card.locator('img[alt="Acofork 封面"]')).toBeVisible();

  // 添加友链按钮 → 弹窗包含完整流程
  await page.getByRole("button", { name: /添加友链/ }).click();
  await expect(page.getByText("Fork 仓库")).toBeVisible();
  await expect(page.getByText("修改 TOML")).toBeVisible();
  await expect(page.getByText("提交 PR")).toBeVisible();
  await expect(page.getByText("等待审核")).toBeVisible();

  // 直接编辑 data.toml 的入口
  const editLink = page.getByRole("link", { name: /直接编辑 data\.toml/ });
  await expect(editLink).toBeVisible();
  await expect(editLink).toHaveAttribute(
    "href",
    "https://github.com/wumingshiali/wumingshiali.github.io/edit/main/src/links/data.toml",
  );
});
