import { expect, test, type Page } from "@playwright/test";
import { mockDate } from "./helpers";

// 与 playwright.config.ts 的 baseURL 保持一致
const BASE = "http://127.0.0.1:4173";
/** 中秋彩蛋 class */
const MID_AUTUMN_CLASS = "egg-mid-autumn";
/** 香港天文台农历 API（e2e 一律 route mock，不依赖外网） */
const HKO_LUNAR_API_PATTERN = "**/lunardate.php*";

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

/** mock 香港天文台农历 API 的返回值。 */
async function mockLunarApi(page: Page, lunarDate: string) {
  await page.route(HKO_LUNAR_API_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ LunarYear: "丙午年，馬", LunarDate: lunarDate }),
    }),
  );
}

test("?egg=cn_mid_autumn（任意日期）：触发主题与横幅，标注数据来源", async ({ page }) => {
  await mockDate(page, 2026, 0, 1); // 非中秋
  await mockLunarApi(page, "八月初一");
  await page.goto(BASE + "/?egg=cn_mid_autumn");

  await expect(page.locator("html")).toHaveClass(new RegExp(MID_AUTUMN_CLASS));
  await expect(page.getByText("中秋快乐")).toBeVisible();
  await expect(page.getByText("农历数据来源：香港天文台")).toBeVisible();
});

test("日期命中（农历八月十五）：无需参数触发", async ({ page }) => {
  await mockDate(page, 2026, 8, 25); // 2026-09-25 为农历八月十五
  await mockLunarApi(page, "八月十五");
  await page.goto(BASE + "/");

  await expect(page.locator("html")).toHaveClass(new RegExp(MID_AUTUMN_CLASS));
  await expect(page.getByText("中秋快乐")).toBeVisible();
});

test("非中秋且无参数：不触发", async ({ page }) => {
  await mockDate(page, 2026, 8, 11); // 2026-09-11 为农历八月初一
  await mockLunarApi(page, "八月初一");
  await page.goto(BASE + "/");

  await expect(page.locator("html")).not.toHaveClass(new RegExp(MID_AUTUMN_CLASS));
  await expect(page.getByText("中秋快乐")).toHaveCount(0);
});
