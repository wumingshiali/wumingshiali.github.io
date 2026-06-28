/**
 * wrangler pages dev 本地模拟部署测试。
 *
 * 由于 wrangler v4 已移除 `pages deploy --dry-run`，改用 `pages dev` 在本地
 * 启动一个 Cloudflare Pages 兼容的服务器，验证 dist/ 产物能被 wrangler 接受
 * 并正确服务关键端点（SPA fallback、静态资源、自定义头）。
 *
 * 关键点：测试运行在 happy-dom 环境，跨域 fetch 被 CORS 拦截；显式用 node:http
 * 绕开 happy-dom 的全局 fetch 覆盖。
 *
 * 流程：
 *   1. spawn wrangler pages dev ./dist --port <端口> --ip 127.0.0.1
 *   2. 等待 127.0.0.1:<端口> 就绪
 *   3. 验证 /、/contact、hashed JS 都能 200
 *   4. kill 子进程
 */
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync, readdirSync } from "node:fs";
import http from "node:http";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DIST = resolve(process.cwd(), "dist");
const PORT = 8789;

interface HttpResult {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}

function httpGet(pathname: string): Promise<HttpResult> {
  return new Promise((resolveR, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port: PORT, path: pathname },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => (body += c));
        res.on("end", () =>
          resolveR({ status: res.statusCode ?? 0, body, headers: res.headers }),
        );
      },
    );
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("http timeout")));
  });
}

describe("wrangler pages dev 本地模拟部署", () => {
  let proc: ChildProcess | undefined;

  beforeAll(() => {
    if (!existsSync(DIST)) {
      throw new Error(
        `dist/ 不存在。请先执行 \`pnpm build\` 再跑 \`pnpm test:build\`。`,
      );
    }
    // 直接调用本地 devDependency 的 wrangler（pnpm 安装后暴露在 PATH 中），
    // 避免 `pnpm dlx` 每次从 npm registry 下载。Windows 上需 shell: true 解析 .cmd。
    proc = spawn(
      "wrangler",
      [
        "pages",
        "dev",
        "./dist",
        "--port",
        String(PORT),
        "--ip",
        "127.0.0.1",
        "--log-level",
        "error",
      ],
      { stdio: ["ignore", "pipe", "pipe"], env: process.env, shell: true },
    );
  }, 30_000);

  afterAll(async () => {
    if (proc) {
      // shell: true spawn 出 cmd.exe，SIGTERM 只杀 cmd 不杀孙子 wrangler；
      // 在 Windows 上用 taskkill /T /F 杀整棵进程树
      if (process.platform === "win32" && proc.pid) {
        spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } else {
        proc.kill("SIGTERM");
        await new Promise((r) => setTimeout(r, 500));
        if (!proc.killed) proc.kill("SIGKILL");
      }
      await once(proc, "exit").catch(() => undefined);
    }
  }, 30_000);

  it("wrangler 启动后 127.0.0.1 端口可连通", async () => {
    // 最多 30s 等待 wrangler 启动（首次 dlx 会下载 wrangler 包）
    const deadline = Date.now() + 30_000;
    let lastErr: unknown = null;
    while (Date.now() < deadline) {
      try {
        const r = await httpGet("/");
        if (r.status > 0) return;
      } catch (e) {
        lastErr = e;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`wrangler 启动超时: ${String(lastErr)}`);
  }, 35_000);

  it("/ 返回 200，body 含 VoidCat 标题", async () => {
    const res = await httpGet("/");
    expect(res.status).toBe(200);
    expect(res.body).toContain("VoidCat");
  });

  it("/contact 经 SPA fallback 返回 200 + index.html", async () => {
    const res = await httpGet("/contact");
    expect(res.status).toBe(200);
    // SPA fallback 直接服务 index.html
    expect(res.body).toContain("VoidCat");
  });

  it("hashed JS 资源可访问", async () => {
    const assets = readdirSync(resolve(DIST, "assets"));
    const jsFile = assets.find((f) => /^index\.[A-Za-z0-9_-]+\.js$/.test(f))!;
    const res = await httpGet(`/assets/${jsFile}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("_headers 自定义头被应用：/assets/* 应带 immutable", async () => {
    const assets = readdirSync(resolve(DIST, "assets"));
    const jsFile = assets.find((f) => /^index\.[A-Za-z0-9_-]+\.js$/.test(f))!;
    const res = await httpGet(`/assets/${jsFile}`);
    const cc = res.headers["cache-control"];
    expect(cc, "缺少 cache-control 头").toBeTruthy();
    expect(String(cc)).toMatch(/immutable/i);
  });
});
