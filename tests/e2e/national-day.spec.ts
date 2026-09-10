import { expect, test, type Page } from "@playwright/test";

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

/**
 * 把浏览器内 Date 固定到指定日期（无参 new Date() / Date.now() 均返回该日），
 * 让「日期命中」类用例可确定性地测试（不依赖真实运行日期）。
 */
async function mockDate(page: Page, year: number, month: number, day: number) {
  await page.addInitScript(
    ({ y, m, d }) => {
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) super(y, m, d);
          else super(...args);
        }
        static now() {
          return new RealDate(y, m, d).getTime();
        }
      }
      (window as unknown as { Date: typeof Date }).Date = MockDate;
    },
    { y: year, m: month, d: day },
  );
}

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
