import { expect, test } from "@playwright/test";
import { mockDate } from "./helpers";

// 与 playwright.config.ts 的 baseURL 保持一致
const BASE = "http://127.0.0.1:4173";
/** 劳动节彩蛋 class */
const LABOR_CLASS = "egg-labor-day";

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

test("?egg=cn_labor_day（任意日期）：触发主题与横幅", async ({ page }) => {
  await mockDate(page, 2026, 0, 1); // 非劳动节
  await page.goto(BASE + "/?egg=cn_labor_day");

  await expect(page.locator("html")).toHaveClass(new RegExp(LABOR_CLASS));
  await expect(page.getByText("劳动人民万岁")).toBeVisible();
});

test("日期命中（5 月 1 日）无需参数：触发主题与横幅", async ({ page }) => {
  await mockDate(page, 2026, 4, 1); // 5 月 1 日
  await page.goto(BASE + "/");

  await expect(page.locator("html")).toHaveClass(new RegExp(LABOR_CLASS));
  await expect(page.getByText("劳动人民万岁")).toBeVisible();
});

test("非劳动节且无参数：不触发主题与横幅", async ({ page }) => {
  await mockDate(page, 2026, 5, 15); // 6 月 15 日
  await page.goto(BASE + "/");

  await expect(page.locator("html")).not.toHaveClass(new RegExp(LABOR_CLASS));
  await expect(page.getByText("劳动人民万岁")).toHaveCount(0);
});
