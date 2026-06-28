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
  // 60s 覆盖 webkit 冷启动 page 慢的场景；CI ubuntu + webkit 二进制首启可能 30s+ 不够
  timeout: 60_000,
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
    // --host 127.0.0.1 强制 IPv4 绑定：Windows 上 localhost 默认解析为 ::1（IPv6），
    // 与 baseURL 的 127.0.0.1 不匹配会让 Playwright 60s 都拿不到 200。
    // ubuntu CI 上虽多解析为 IPv4，显式指定让行为跨平台一致。
    command: "pnpm preview --port 4173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
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
