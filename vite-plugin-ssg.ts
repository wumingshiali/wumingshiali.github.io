/**
 * Vite 插件：构建后静态预渲染（SSG）。
 *
 * SPA 的 SEO 短板在于内容全靠 JS 注入：Google 能渲染 JS，但百度/必应等
 * 无 JS 爬虫抓不到正文。本插件在构建完成后用 Playwright 无头浏览器逐路由
 * 渲染，把每个路由的真实 DOM 落成静态 HTML（<路由>.html，首页为 index.html），
 * 由静态托管直接返回，无需 JS 也能拿到完整内容。
 *
 * 设计要点：
 * - 复用项目已有的 @playwright/test（CI 已安装 chromium），不引入新依赖
 * - 只放行本地静态资源、abort 外部请求，渲染确定且快速
 * - 覆盖 dist/index.html 后重新生成 .br/.gz，与 vite-plugin-compression2 保持一致
 * - 浏览器不可用或单个路由渲染失败仅告警跳过，不阻塞构建
 */
import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import type { Plugin, ResolvedConfig } from "vite";
import type { Browser } from "@playwright/test";

/** 静态服务器 MIME 表（浏览器正确执行 module script 需要准确的 JS MIME） */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** 需要预渲染的路由：静态页 + 全部博客文章 */
interface Route {
  /** 站点相对路径，如 "/posts/change2cy" */
  path: string;
  /** 输出静态文件路径 */
  output: string;
}

function listRoutes(outDir: string): Route[] {
  let posts: string[] = [];
  try {
    posts = readdirSync(resolve("src/posts"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    // 无 posts 目录时仅渲染静态路由
  }
  return [
    { path: "/", output: resolve(outDir, "index.html") },
    { path: "/posts", output: resolve(outDir, "posts.html") },
    { path: "/about", output: resolve(outDir, "about.html") },
    { path: "/contact", output: resolve(outDir, "contact.html") },
    ...posts.map((id) => ({
      path: "/posts/" + id,
      output: resolve(outDir, "posts", id + ".html"),
    })),
  ];
}

/**
 * 启动一个极简静态文件服务器（含 SPA fallback）。
 * 只服务 dist 内文件，绑定 127.0.0.1 随机端口，供无头浏览器渲染。
 */
function startStaticServer(
  outDir: string,
): Promise<{ base: string; close: () => Promise<void> }> {
  const root = resolve(outDir);
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://127.0.0.1").pathname,
    );
    // 防目录穿越：解析结果必须等于 root 或在 root 内
    let filePath = resolve(root, "." + pathname);
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (!existsSync(filePath)) {
      // SPA fallback：未预渲染的路径回落到入口
      filePath = join(root, "index.html");
    } else if (statSync(filePath).isDirectory()) {
      // 目录请求（含无尾斜杠的 /posts/<id>）→ 该目录的 index.html（不存在则回落入口）
      const dirIndex = join(filePath, "index.html");
      filePath = existsSync(dirIndex) ? dirIndex : join(root, "index.html");
    }
    try {
      const body = readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      // 兜底：读文件失败返回 404，避免进程崩溃
      res.writeHead(404);
      res.end("not found");
    }
  });

  return new Promise((resolveP) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 4173;
      resolveP({
        base: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

/**
 * 轮询等待 SPA 渲染出真实内容（最多 timeoutMs）。
 * 避免 waitForFunction 的 arg/options 位置坑，逻辑与独立验证一致。
 */
async function waitForRender(
  page: import("@playwright/test").Page,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rendered = await page.evaluate(() => {
      const app = document.querySelector("#app");
      return !!app && app.textContent.trim().length > 20;
    });
    if (rendered) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

/** 逐路由渲染并写出静态 HTML */
async function prerenderRoutes(
  browser: Browser,
  base: string,
  routes: Route[],
): Promise<void> {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  // 只放行本地静态资源，abort 外部（字体 / Giscus / GitHub）→ 渲染确定且快速
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(base)) route.continue();
    else route.abort();
  });

  try {
    for (const route of routes) {
      try {
        await page.goto(`${base}${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        if (!(await waitForRender(page, 20_000))) {
          const diag = await page.evaluate(() => {
            const app = document.querySelector("#app");
            return JSON.stringify({
              title: document.title,
              readyState: document.readyState,
              appLen: app ? app.textContent.trim().length : -1,
            });
          });
          console.warn("[ssg] 渲染超时，跳过 " + route.path + " | diag=" + diag);
          continue;
        }
        // 等 unhead 完成 meta / title 注入
        await page.waitForTimeout(100);
        const html = `<!doctype html>${await page.evaluate(
          () => document.documentElement.outerHTML,
        )}`;
        mkdirSync(dirname(route.output), { recursive: true });
        writeFileSync(route.output, html, "utf8");
        console.log(`[ssg] 已预渲染 ${route.path}`);
      } catch (err) {
        console.warn(
          "[ssg] 渲染失败，跳过 " +
            route.path +
            ": " +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    }
  } finally {
    await context.close();
  }
}

export function ssgPages(): Plugin {
  let outDir = "dist";

  return {
    name: "ssg-pages",
    apply: "build",
    enforce: "post",

    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
    },

    async closeBundle() {
      const routes = listRoutes(outDir);

      // 启动无头浏览器；不可用（如未安装 chromium）时降级跳过，不阻塞构建
      let browser: Browser | null = null;
      try {
        const { chromium } = await import("@playwright/test");
        browser = await chromium.launch();
      } catch (err) {
        console.warn(
          "[ssg] Playwright chromium 不可用，跳过预渲染: " +
            (err instanceof Error ? err.message : String(err)),
        );
        return;
      }

      const server = await startStaticServer(outDir);
      try {
        await prerenderRoutes(browser, server.base, routes);
      } finally {
        await server.close();
        await browser.close();
      }

      // 首页被预渲染覆盖后，重新生成预压缩副本，保持与 vite-plugin-compression2 一致
      const indexHtml = readFileSync(resolve(outDir, "index.html"));
      writeFileSync(resolve(outDir, "index.html.br"), brotliCompressSync(indexHtml));
      writeFileSync(resolve(outDir, "index.html.gz"), gzipSync(indexHtml));
      console.log(`[ssg] 预渲染完成，共 ${routes.length} 个路由`);
    },
  };
}
