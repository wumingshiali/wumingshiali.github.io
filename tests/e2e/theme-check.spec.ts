import { expect, test } from "@playwright/test";
// 预置 cookie 同意状态（统计开启）：避免 Cookie 选择弹窗遮挡交互
// （弹窗自身流程由 tests/e2e/cookie-consent.spec.ts 覆盖）
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

// 与 playwright.config.ts 的 baseURL 保持一致；之前硬编码 4321 与当前 4173 不符
const BASE = "http://127.0.0.1:4173";

test("浅色模式实查", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto(BASE + "/");
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const html = document.documentElement.className;
    const cs = getComputedStyle(document.documentElement);
    const nav = document.querySelector("nav");
    return {
      htmlClass: html,
      primary: cs.getPropertyValue("--primary").trim(),
      card: cs.getPropertyValue("--card").trim(),
      background: cs.getPropertyValue("--background").trim(),
      navBg: nav ? getComputedStyle(nav).backgroundColor : "no-nav",
    };
  });
  console.log("RESULT:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "theme-light.png", fullPage: true });
});

test("暗色模式实查", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto(BASE + "/");
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      htmlClass: document.documentElement.className,
      primary: cs.getPropertyValue("--primary").trim(),
      card: cs.getPropertyValue("--card").trim(),
    };
  });
  console.log("RESULT:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "theme-dark.png", fullPage: true });
});
