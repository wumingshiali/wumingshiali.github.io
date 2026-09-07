/**
 * Cookie 选择弹窗 E2E。
 *
 * 覆盖：
 * - 首次访问（无 cookie）弹出选择器
 * - 接受所有 / 接受必要 / 确认 三个按钮的行为与 cookie 写入
 * - 已保存选择后再次访问不再弹窗，并按选择加载统计脚本
 */
import { expect, test } from "@playwright/test";

const BASE = "http://127.0.0.1:4173";
const consentValue = (statistics: boolean) =>
  encodeURIComponent(JSON.stringify({ necessary: true, statistics }));

// 返回当前 document.cookie 的解码值
function decodedCookie(page: import("@playwright/test").Page) {
  return page.evaluate(() => decodeURIComponent(document.cookie));
}

// 判断统计脚本是否已注入
function statScriptLoaded(page: import("@playwright/test").Page, prefix: string) {
  return page.evaluate(
    (p) => !!document.querySelector(`script[src^="${p}"]`),
    prefix,
  );
}

test.describe("Cookie 选择弹窗", () => {
  test("首次访问弹出选择器", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();
    // 两个选项都在（exact：避免匹配到按钮文本）
    await expect(page.getByText("必要 Cookies", { exact: true })).toBeVisible();
    await expect(page.getByText("统计 Cookies", { exact: true })).toBeVisible();
    // 三个按钮都在
    await expect(page.getByRole("button", { name: "接受所有 Cookies" })).toBeVisible();
    await expect(page.getByRole("button", { name: "接受必要 Cookies" })).toBeVisible();
    await expect(page.getByRole("button", { name: "确认" })).toBeVisible();
  });

  test("接受所有 Cookies：写入 cookie 并加载统计脚本", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    await page.getByRole("button", { name: "接受所有 Cookies" }).click();
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    const cookie = await decodedCookie(page);
    expect(cookie).toContain("cookie_consent");
    expect(cookie).toContain('"statistics":true');

    await expect
      .poll(() => statScriptLoaded(page, "https://umi.meali.top/script.js"))
      .toBe(true);
    await expect
      .poll(() => statScriptLoaded(page, "https://www.clarity.ms/tag/"))
      .toBe(true);
  });

  test("接受必要 Cookies：保存且不加载统计脚本", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    await page.getByRole("button", { name: "接受必要 Cookies" }).click();
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    const cookie = await decodedCookie(page);
    expect(cookie).toContain('"statistics":false');

    expect(await statScriptLoaded(page, "https://umi.meali.top/")).toBe(false);
    expect(await statScriptLoaded(page, "https://www.clarity.ms/")).toBe(false);
  });

  test("确认按钮按当前勾选保存（默认统计开启）", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    await page.getByRole("button", { name: "确认" }).click();
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    const cookie = await decodedCookie(page);
    expect(cookie).toContain('"statistics":true');
  });

  test("已保存选择后再次访问不再弹窗，并按选择加载统计脚本", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "cookie_consent",
        value: consentValue(true),
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.goto(BASE + "/");
    await page.waitForTimeout(600);
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    await expect
      .poll(() => statScriptLoaded(page, "https://umi.meali.top/script.js"))
      .toBe(true);
  });
});
