import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 配置。
 *
 * - testDir: tests/e2e
 * - baseURL: vite preview 默认端口 4173
 * - webServer: 自动启动 `pnpm preview`，CI 下不会复用
 * - 两个 projects:
 *   - desktop-chromium: 桌面流程覆盖
 *   - mobile-iphone-se: 375×667 移动端，回归保护 contact 对话框输入框宽度
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },

  webServer: {
    command: "pnpm preview --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-iphone-se",
      use: { ...devices["iPhone SE"] },
    },
  ],
});
