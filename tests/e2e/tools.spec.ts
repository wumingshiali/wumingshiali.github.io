/**
 * /tools 工具页 E2E 测试。
 *
 * 覆盖：
 * - 桌面端：悬停导航「工具」出现纵向子菜单，点击直达工具页
 * - 移动端：悬浮菜单包含「工具」入口
 * - 三个工具页：哈希计算、对称/非对称真实加解密往返
 */
import { expect, test } from "@playwright/test";
// 预置 cookie 同意状态（统计开启）：避免 Cookie 选择弹窗遮挡交互
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

test.describe("工具页入口", () => {
  test("桌面端：悬停「工具」弹出纵向子菜单并可点击进入", async ({ page, isMobile }) => {
    test.skip(isMobile, "桌面端专属交互（移动端用悬浮菜单）");
    await page.goto("/");

    const toolsLink = page.getByRole("link", { name: "工具" });
    await expect(toolsLink).toBeVisible();
    await toolsLink.hover();

    const submenu = page.locator('a[href="/tools"] ~ div');
    await expect(submenu).toBeVisible();
    await expect(submenu.getByRole("link", { name: "单向加密" })).toBeVisible();
    await expect(submenu.getByRole("link", { name: "对称加密", exact: true })).toBeVisible();
    await expect(submenu.getByRole("link", { name: "非对称加密", exact: true })).toBeVisible();

    // 真实鼠标路径：从按钮中心逐步移到第一个菜单项，途中菜单必须保持可见。
    // 回归保护：若按钮与菜单之间存在悬停死区，真实鼠标将无法选中菜单项。
    const btnBox = (await toolsLink.boundingBox())!;
    const firstItem = submenu.getByRole("link", { name: "单向加密" });
    const itemBox = (await firstItem.boundingBox())!;
    await page.mouse.move(50, 50);
    const fromX = btnBox.x + btnBox.width / 2;
    const fromY = btnBox.y + btnBox.height / 2;
    const toX = itemBox.x + itemBox.width / 2;
    const toY = itemBox.y + itemBox.height / 2;
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        fromX + (toX - fromX) * (i / steps),
        fromY + (toY - fromY) * (i / steps),
      );
      await expect(submenu).toBeVisible();
    }

    await firstItem.click();
    await expect(page).toHaveURL(/\/tools\/hash$/);
  });

  test("移动端：悬浮菜单包含「工具」入口并指向总览页", async ({ page, isMobile }) => {
    test.skip(!isMobile, "移动端专属交互");
    await page.goto("/");
    await page.getByRole("button", { name: "打开导航菜单" }).click();

    const toolsLink = page.getByRole("link", { name: "工具" });
    await expect(toolsLink).toBeVisible();
    await expect(toolsLink).toHaveAttribute("href", "/tools");
    await toolsLink.click();
    await expect(page).toHaveURL(/\/tools$/);
  });
});

test.describe("工具页功能", () => {
  test("总览页展示全部工具卡片", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByRole("heading", { name: "工具" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^单向加密/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^对称加密/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^非对称加密/ })).toBeVisible();
  });

  test("单向加密：上传文件计算 SHA-256", async ({ page }) => {
    await page.goto("/tools/hash");
    await page.getByRole("tab", { name: "文件" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "hello.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("abc"),
    });
    await expect(
      page.locator('textarea[aria-label*="SHA-256"]'),
    ).toHaveValue(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    await expect(page.getByText("hello.txt")).toBeVisible();
  });

  test("单向加密：SHA-256 计算正确", async ({ page }) => {
    await page.goto("/tools/hash");
    await page.locator("textarea").first().fill("abc");
    await expect(page.locator('textarea[aria-label*="SHA-256"]')).toHaveValue(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("对称加密：上传文件加密后可用同一密码解密", async ({ page }) => {
    await page.goto("/tools/symmetric");
    await page.getByRole("tab", { name: "文件" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("文件加密内容喵～"),
    });
    await page.locator('input[type="password"]').fill("hunter2");
    await page.getByRole("button", { name: "加密", exact: true }).click();

    const ciphertext = page.locator('textarea[aria-label="加密结果"]');
    await expect(ciphertext).toBeVisible();
    const payload = await ciphertext.inputValue();
    expect(payload.startsWith("v1:AES-256-GCM:")).toBe(true);

    await page.locator('textarea[placeholder*="粘贴本工具生成的密文"]').fill(payload);
    await page.getByRole("button", { name: "解密", exact: true }).click();
    await expect(page.locator('textarea[aria-label="解密结果"]')).toHaveValue(
      "文件加密内容喵～",
    );
  });

  test("对称加密：加密后可用同一密码解密", async ({ page }) => {
    await page.goto("/tools/symmetric");
    const plaintext = "猫娘工程师的机密喵～ 42";
    await page.locator('input[type="password"]').fill("hunter2");
    await page.locator("textarea").first().fill(plaintext);
    await page.getByRole("button", { name: "加密", exact: true }).click();

    const ciphertext = page.locator('textarea[aria-label="加密结果"]');
    await expect(ciphertext).toBeVisible();
    const payload = await ciphertext.inputValue();
    expect(payload.startsWith("v1:AES-256-GCM:")).toBe(true);

    await page.locator('textarea[placeholder*="粘贴本工具生成的密文"]').fill(payload);
    await page.getByRole("button", { name: "解密", exact: true }).click();
    await expect(page.locator('textarea[aria-label="解密结果"]')).toHaveValue(plaintext);
  });

  test("非对称加密：生成密钥对后公钥加密、私钥解密", async ({ page }) => {
    await page.goto("/tools/asymmetric");
    const plaintext = "公钥加密私钥解密喵～";
    await page.getByRole("button", { name: /生成密钥对/ }).click();

    const publicPem = page.locator('textarea[placeholder*="SPKI PEM"]');
    const privatePem = page.locator('textarea[placeholder*="PKCS#8 PEM"]');
    await expect(publicPem).toHaveValue(/-----BEGIN PUBLIC KEY-----/);
    await expect(privatePem).toHaveValue(/-----BEGIN PRIVATE KEY-----/);

    await page.locator('textarea[placeholder*="输入要加密的明文"]').fill(plaintext);
    await page.getByRole("button", { name: "加密", exact: true }).click();
    const ciphertext = page.locator('textarea[aria-label="公钥加密结果"]');
    await expect(ciphertext).toBeVisible();
    const payload = await ciphertext.inputValue();
    expect(payload.length).toBeGreaterThan(0);

    await page.locator('textarea[placeholder*="粘贴本工具生成的密文"]').fill(payload);
    await page.getByRole("button", { name: "解密", exact: true }).click();
    await expect(page.locator('textarea[aria-label="私钥解密结果"]')).toHaveValue(
      plaintext,
    );
  });
});
