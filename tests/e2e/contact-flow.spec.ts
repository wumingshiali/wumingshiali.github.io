/**
 * 完整联系页 E2E 流程（仅 desktop-chromium）。
 *
 * 路径：首页 → 联系 → 打开对话框 → 错答 → 正解 → 复制 → mailto
 *
 * 注意：本 describe 依赖 navigator.clipboard.readText，webkit (mobile-iphone-se)
 * 不支持该 API；用 describe.skip 限制只跑 desktop project。
 */
import { expect, test } from "@playwright/test";

test.describe("联系页流程", () => {
  test.skip(
    ({ isMobile }) => isMobile === true,
    "webkit 不支持 navigator.clipboard.readText，仅在 desktop 跑",
  );

  // 完整流程涉及多次 page navigation + 异步解密，移动 webkit 启动慢，30s 不够
  test.describe.configure({ mode: "default", timeout: 60_000 });

  test("完整流程：首页 → 联系 → 验证 → 复制", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // 1. 首页
    await page.goto("/");
    await expect(page).toHaveTitle(/VoidCat/);
    await expect(page.getByText("VoidCat").first()).toBeVisible();

    // 2. 导航到联系页
    await page.getByRole("link", { name: /联系/ }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByText("想和 VoidCat 说点什么")).toBeVisible();

    // 3. 打开验证对话框
    await page.getByRole("button", { name: /解密所有/ }).click();
    await expect(page.getByText("人机验证")).toBeVisible();

    // 4. 错答 '3'
    const input = page.locator('input[inputmode="numeric"]');
    await input.fill("3");
    await page.locator("form").evaluate((f) => (f as HTMLFormElement).requestSubmit());
    await expect(page.getByText("答案不对哦")).toBeVisible();

    // 5. 正解 '2'，明文显示
    await input.fill("2");
    await page.locator("form").evaluate((f) => (f as HTMLFormElement).requestSubmit());
    await expect(page.getByText("ZWj1154142014@hotmail.com")).toBeVisible();
    await expect(page.getByText("AliZhouSZ")).toBeVisible();

    // 6. 复制 Email
    await page.getByRole("button", { name: /Email/ }).click();
    await expect(page.getByText("已复制")).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe("ZWj1154142014@hotmail.com");
  });

  test("公开卡片（GitHub）无需验证直接复制", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/contact");
    await page.getByRole("button", { name: /GitHub/ }).click();
    await expect(page.getByText("已复制")).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe("wumingshiali");
  });
});
