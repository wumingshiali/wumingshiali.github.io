/**
 * Vite 插件：构建时自动生成 Atom feed.xml。
 *
 * 数据来源：直接消费 vite-plugin-prerender-posts 在 buildStart 阶段生成的
 * src/generated/posts-data.ts（单一数据源，含构建期渲染好的正文 HTML），
 * 不重复引入 markdown-it / shiki，也不与文章渲染逻辑耦合。
 *
 * 依赖生成文件的结构约定（见 vite-plugin-prerender-posts 的写出逻辑）：
 * - 数组元素为单行 JSON.stringify 输出，行首为 "{"
 * - 数组以 "= [" 开头、以 "];" 结尾
 * 若该结构变更，需同步调整本插件解析逻辑。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

/** 站点基础 URL（生产环境） */
const SITE_URL = "https://meali.top";
/** 站点名称 */
const SITE_NAME = "VoidCat";
/** 站点描述 */
const SITE_DESC = "开源即自由，自由即万物。个人博客，记录技术与思考。";

interface FeedPost {
  id: string;
  name: string;
  desc: string;
  tag: string[];
  createTime: string;
  content: string;
}

/**
 * 从构建期生成的 posts-data.ts 中提取文章数据。
 * 生成格式固定：每个对象一行 JSON（无内嵌换行），因此按行解析即可。
 */
function loadPosts(): FeedPost[] {
  const file = resolve("src/generated/posts-data.ts");
  const text = readFileSync(file, "utf8");
  const start = text.indexOf("= [");
  const end = text.lastIndexOf("];");
  if (start < 0 || end < 0) {
    throw new Error("[generate-rss] 无法解析 src/generated/posts-data.ts 结构");
  }
  const arrayText = text.slice(start + 3, end);
  return arrayText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line.replace(/,\s*$/, "")) as FeedPost);
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

/** "YYYY-MM-DD" → RFC3339 时间戳（按 UTC 零点解释） */
function toIso(date: string): string {
  return `${date.slice(0, 10)}T00:00:00Z`;
}

/** 生成单条 <entry>（含全文 HTML，供订阅器离线阅读） */
function entryNode(post: FeedPost): string {
  const url = `${SITE_URL}/posts/${post.id}`;
  const content = post.content
    .replace(/\]\]>/g, "]]&gt;") // 防止闭合 CDATA
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const parts = [
    `  <entry>`,
    `    <title>${escapeXml(post.name)}</title>`,
    `    <link href="${escapeXml(url)}"/>`,
    `    <id>${escapeXml(url)}</id>`,
    `    <published>${toIso(post.createTime)}</published>`,
    `    <updated>${toIso(post.createTime)}</updated>`,
    ...(post.desc
      ? [`    <summary type="html">${escapeXml(post.desc)}</summary>`]
      : []),
    ...post.tag.map((t) => `    <category term="${escapeXml(t)}"/>`),
    `    <content type="html"><![CDATA[${content}]]></content>`,
    `  </entry>`,
  ];
  return parts.join("\n");
}

export function generateRssFeed(): Plugin {
  let outDir = "dist";
  let buildDate = "";

  return {
    name: "generate-rss",
    apply: "build",
    enforce: "post",

    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
      buildDate = new Date().toISOString().slice(0, 10);
    },

    closeBundle() {
      const posts = loadPosts();
      const updated = posts.length > 0 ? toIso(posts[0].createTime) : buildDate;
      const xml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<feed xmlns="http://www.w3.org/2005/Atom">`,
        `  <title>${escapeXml(SITE_NAME)} 博客</title>`,
        `  <subtitle>${escapeXml(SITE_DESC)}</subtitle>`,
        `  <link href="${SITE_URL}/feed.xml" rel="self"/>`,
        `  <link href="${SITE_URL}/"/>`,
        `  <id>${SITE_URL}/</id>`,
        `  <updated>${updated}</updated>`,
        `  <author>`,
        `    <name>${escapeXml(SITE_NAME)}</name>`,
        `    <uri>${SITE_URL}</uri>`,
        `  </author>`,
        ...posts.map(entryNode),
        `</feed>`,
        "",
      ].join("\n");

      writeFileSync(resolve(outDir, "feed.xml"), xml, "utf-8");
      console.log(`[generate-rss] 已生成 feed.xml（${posts.length} 篇文章）`);
    },
  };
}
