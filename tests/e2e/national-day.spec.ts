import { expect, test } from "@playwright/test";
import { mockDate } from "./helpers";

// 与 playwright.config.ts 的 baseURL 保持一致
const BASE = "http://127.0.0.1:4173";
/** 国庆彩蛋 class 与参数值 */
const EGG_CLASS = "egg-cn-birthday";

// 预置 cookie 同意状态：避免 Cookie 选择弹窗干扰（弹窗自身流程由 cookie-consent.spec.ts 覆盖）
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

test("?egg=cn_birthday（非国庆日期）：触发主题与横幅", async ({ page }) => {
  await mockDate(page, 2026, 0, 1); // 1 月 1 日，非国庆
  await page.goto(BASE + "/?egg=cn_birthday");

  await expect(page.locator("html")).toHaveClass(new RegExp(EGG_CLASS));
  await expect(page.getByText("国庆快乐")).toBeVisible();
  // 横幅渐变背景生效，验证样式确实加载
  const bannerBg = await page
    .locator('[role="status"]')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bannerBg).toContain("linear-gradient");
});

test("日期命中（10 月 1 日）无需参数：触发主题与横幅", async ({ page }) => {
  await mockDate(page, 2026, 9, 1); // 10 月 1 日
  await page.goto(BASE + "/");

  await expect(page.locator("html")).toHaveClass(new RegExp(EGG_CLASS));
  await expect(page.getByText("国庆快乐")).toBeVisible();
});

test("非国庆且无参数：不触发主题与横幅", async ({ page }) => {
  await mockDate(page, 2026, 5, 15); // 6 月 15 日
  await page.goto(BASE + "/");

  await expect(page.locator("html")).not.toHaveClass(new RegExp(EGG_CLASS));
  await expect(page.getByText("国庆快乐")).toHaveCount(0);
});
