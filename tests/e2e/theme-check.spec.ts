import { test } from "@playwright/test";

const BASE = "http://localhost:4321";

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
