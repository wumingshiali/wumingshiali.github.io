/**
 * Cookie 选择弹窗 E2E。
 *
 * 覆盖：
 * - 首次访问（无 cookie）弹出选择器
 * - 大类别（必要 / 统计）父级可选中：勾选 = 全选该类目子项；
 *   子项全部手动勾选时父级自动点亮，部分勾选时半选
 * - 接受所有 / 接受必要 / 确认 三个按钮的行为与 cookie 写入
 * - 已保存选择后再次访问不再弹窗，并按选择加载对应统计脚本
 */
import { expect, test } from "@playwright/test";

const BASE = "http://127.0.0.1:4173";
const consentValue = (statistics: { umami: boolean; clarity: boolean }) =>
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
  test("首次访问弹出选择器：必要子项勾选且不可取消，统计子项默认勾选", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    // 必要父级：默认勾选且不可取消；必要子项「状态记录」同步勾选
    const necessaryParent = page.getByRole("checkbox", { name: "必要 Cookies" });
    await expect(necessaryParent).toBeDisabled();
    await expect(necessaryParent).toBeChecked();
    const necessary = page.getByRole("checkbox", { name: "状态记录" });
    await expect(necessary).toBeDisabled();
    await expect(necessary).toBeChecked();

    // 统计父级：子项默认全勾 → 父级自动点亮
    await expect(page.getByRole("checkbox", { name: "统计 Cookies" })).toBeChecked();
    // 统计子项：默认勾选
    await expect(page.getByRole("checkbox", { name: "自建 Umami" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Microsoft Clarity" })).toBeChecked();

    // 三个按钮都在
    await expect(page.getByRole("button", { name: "接受所有 Cookies" })).toBeVisible();
    await expect(page.getByRole("button", { name: "接受必要 Cookies" })).toBeVisible();
    await expect(page.getByRole("button", { name: "确认" })).toBeVisible();
  });

  test("接受所有 Cookies：写入全部统计开启并加载两个脚本", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    await page.getByRole("button", { name: "接受所有 Cookies" }).click();
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    const cookie = await decodedCookie(page);
    expect(cookie).toContain('"statistics":{"umami":true,"clarity":true}');

    await expect
      .poll(() => statScriptLoaded(page, "https://umi.meali.top/script.js"))
      .toBe(true);
    await expect
      .poll(() => statScriptLoaded(page, "https://www.clarity.ms/tag/"))
      .toBe(true);
  });

  test("接受必要 Cookies：全部统计关闭且不加载脚本", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    await page.getByRole("button", { name: "接受必要 Cookies" }).click();
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    const cookie = await decodedCookie(page);
    expect(cookie).toContain('"statistics":{"umami":false,"clarity":false}');

    expect(await statScriptLoaded(page, "https://umi.meali.top/")).toBe(false);
    expect(await statScriptLoaded(page, "https://www.clarity.ms/")).toBe(false);
  });

  test("子项独立选择：只开 Umami，关掉 Clarity，确认后按选择加载", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    // 取消 Microsoft Clarity，保留 Umami
    await page.getByRole("checkbox", { name: "Microsoft Clarity" }).uncheck();
    await page.getByRole("button", { name: "确认" }).click();
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    const cookie = await decodedCookie(page);
    expect(cookie).toContain('"statistics":{"umami":true,"clarity":false}');

    // 只有 Umami 加载，Clarity 不加载
    await expect
      .poll(() => statScriptLoaded(page, "https://umi.meali.top/script.js"))
      .toBe(true);
    expect(await statScriptLoaded(page, "https://www.clarity.ms/")).toBe(false);
  });

  test("父级全选联动：勾选父级全选子项，取消父级全不选，子项全选自动点亮父级", async ({ page }) => {
    await page.goto(BASE + "/");
    await expect(page.getByText("Cookie 设置")).toBeVisible();

    const statsParent = page.getByRole("checkbox", { name: "统计 Cookies" });
    const umami = page.getByRole("checkbox", { name: "自建 Umami" });
    const clarity = page.getByRole("checkbox", { name: "Microsoft Clarity" });

    // 默认子项全勾 → 父级点亮
    await expect(statsParent).toBeChecked();

    // 取消父级 → 子项全部取消
    await statsParent.uncheck();
    await expect(umami).not.toBeChecked();
    await expect(clarity).not.toBeChecked();

    // 再勾选父级 → 子项全部勾选
    await statsParent.check();
    await expect(umami).toBeChecked();
    await expect(clarity).toBeChecked();

    // 手动只勾一个子项 → 父级不再点亮，进入半选（indeterminate）
    await clarity.uncheck();
    await expect(statsParent).not.toBeChecked();
    await expect(statsParent).toHaveAttribute("aria-checked", "mixed");

    // 确认按钮按当前选择保存（umami 开，clarity 关）
    await page.getByRole("button", { name: "确认" }).click();
    await expect(page.getByText("Cookie 设置")).toBeHidden();
    const cookie = await decodedCookie(page);
    expect(cookie).toContain('"statistics":{"umami":true,"clarity":false}');
  });

  test("已保存选择后再次访问不再弹窗，并按选择加载对应脚本", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "cookie_consent",
        value: consentValue({ umami: true, clarity: false }),
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.goto(BASE + "/");
    await page.waitForTimeout(600);
    await expect(page.getByText("Cookie 设置")).toBeHidden();

    // 只加载 Umami
    await expect
      .poll(() => statScriptLoaded(page, "https://umi.meali.top/script.js"))
      .toBe(true);
    expect(await statScriptLoaded(page, "https://www.clarity.ms/")).toBe(false);
  });
});
