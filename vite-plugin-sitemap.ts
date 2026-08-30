/**
 * Vite 插件：构建时自动生成 sitemap.xml。
 *
 * 静态路由（硬编码）+ 动态博客路由（读取 src/posts 下各目录的 index.md frontmatter），
 * 按 sitemap.org 标准格式输出到 dist/sitemap.xml，并为文章封面加入图片条目
 * （google.com/schemas/sitemap-image/1.1）以提升图片搜索收录。
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { Plugin, ResolvedConfig } from "vite";

/** 站点基础 URL（生产环境） */
const SITE_URL = "https://meali.top";

/** 静态路由配置：路径 → 优先级 + 更新频率 */
const STATIC_ROUTES: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/about", priority: 0.5, changefreq: "monthly" },
  { path: "/contact", priority: 0.5, changefreq: "monthly" },
  { path: "/posts", priority: 0.8, changefreq: "daily" },
];

/** 博客文章 frontmatter 关键字段 */
interface PostFrontmatter {
  createTime?: string | Date;
  cover?: unknown;
}

/** 从 markdown 提取 YAML frontmatter */
function parseFrontmatter(raw: string): PostFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    return (parseYaml(match[1]) as PostFrontmatter) ?? {};
  } catch {
    return {};
  }
}

/**
 * 解析封面：frontmatter 里的 cover 字段为空时回退到 cover.webp，
 * 与 vite-plugin-prerender-posts 的 resolveCover 保持一致，文件不存在返回 null。
 */
function resolveCover(id: string, cover: unknown): string | null {
  if (cover === null) return null;
  const fileName =
    typeof cover === "string" && cover.length > 0 ? cover : "cover.webp";
  return existsSync(join("src/posts", id, fileName))
    ? `${SITE_URL}/posts/${id}/${fileName}`
    : null;
}

/** 格式化日期为 YYYY-MM-DD */
function formatDate(d: string | Date | undefined): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d.slice(0, 10);
}

/** XML 转义 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 生成单个 <url> 节点（images 为可选封面图绝对 URL 列表） */
function urlNode(
  loc: string,
  lastmod: string,
  priority: number,
  changefreq: string,
  images: string[] = [],
): string {
  const parts = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  parts.push(
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
  );
  for (const img of images) {
    parts.push(
      `    <image:image>`,
      `      <image:loc>${escapeXml(img)}</image:loc>`,
      `    </image:image>`,
    );
  }
  parts.push(`  </url>`);
  return parts.join("\n");
}

export function generateSitemap(): Plugin {
  let outDir = "dist";
  let buildDate = "";

  return {
    name: "generate-sitemap",
    apply: "build",
    enforce: "post",

    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
      buildDate = new Date().toISOString().slice(0, 10);
    },

    closeBundle() {
      const postsDir = resolve("src/posts");
      const urls: string[] = [];

      // 1. 静态路由
      for (const route of STATIC_ROUTES) {
        urls.push(
          urlNode(
            `${SITE_URL}${route.path}`,
            buildDate,
            route.priority,
            route.changefreq,
          ),
        );
      }

      // 2. 博客文章路由：扫描 src/posts/*/index.md
      let postDirs: string[];
      try {
        postDirs = readdirSync(postsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
      } catch {
        postDirs = [];
      }

      for (const slug of postDirs) {
        const mdPath = join(postsDir, slug, "index.md");
        let lastmod = buildDate;
        let cover: string | null = null;
        try {
          const raw = readFileSync(mdPath, "utf-8");
          const fm = parseFrontmatter(raw);
          const date = formatDate(fm.createTime);
          if (date) lastmod = date;
          cover = resolveCover(slug, fm.cover);
        } catch {
          // 读取失败则用构建日期兜底
        }
        urls.push(
          urlNode(
            `${SITE_URL}/posts/${slug}`,
            lastmod,
            0.7,
            "weekly",
            cover ? [cover] : [],
          ),
        );
      }

      // 3. 组装完整 XML
      const xml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
        ...urls,
        `</urlset>`,
        "",
      ].join("\n");

      const outPath = resolve(outDir, "sitemap.xml");
      writeFileSync(outPath, xml, "utf-8");
      console.log(`[generate-sitemap] 已生成 sitemap.xml（${urls.length} 个 URL）`);
    },
  };
}
