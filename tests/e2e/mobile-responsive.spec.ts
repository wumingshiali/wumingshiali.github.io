/**
 * 移动端响应式回归测试（仅 mobile-iphone-se 375×667）。
 *
 * 保护 commit ff13632 修复的 contact 对话框输入框溢出问题：
 * - input 宽度不能超出视口
 * - 页面不能出现横向滚动
 * - 提交按钮可见
 */
import { expect, test } from "@playwright/test";

test.describe("移动端响应式", () => {
  // 断言依赖 375 视口宽度；desktop project 视口 1280+ 必然失败。
  // 用 isMobile 限制只在 mobile-iphone-se project 跑。
  test("联系页对话框输入框在 375px 视口下不溢出", async ({ page, isMobile }) => {
    test.skip(!isMobile, "仅在 mobile 视口运行（375px 断言）");
    await page.goto("/contact");
    await page.getByRole("button", { name: /解密所有/ }).click();

    const input = page.locator('input[inputmode="numeric"]');
    await expect(input).toBeVisible();

    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    // input 必须在视口宽度内
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);

    // 页面不应有横向滚动
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);

    // 提交按钮可见
    await expect(page.getByRole("button", { name: /提交/ })).toBeVisible();
  });
});
