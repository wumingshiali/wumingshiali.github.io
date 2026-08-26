/**
 * 博客纯文本工具：与 markdown/shiki 无关的纯函数。
 *
 * 被两处共用：
 * - 构建期渲染器（vite-plugin-prerender-posts / post-render.ts）
 * - 客户端 posts.ts（透出给单元测试与目录组件）
 *
 * 不依赖任何运行时（无 glob、无 shiki、无 fs），浏览器与 Node 均可安全复用。
 */

/** 标题项，目录组件消费 */
export interface Heading {
  /** 1-6，对应 h1-h6 */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** 纯文本（去 markdown 语法后的可读标题） */
  text: string;
  /** URL 安全 slug，与 user-content- 前缀拼接成 heading id */
  slug: string;
}

/**
 * 估算 markdown 正文字数。
 * - 去除围栏代码块（```...```）和行内代码（`...`）
 * - 去除 HTML 标签、图片（![alt](url)）、链接 URL（保留链接文本）
 * - 去除 markdown 标记残留（#、>、-、*、_ 等）
 * - 中文字符按字计（CJK 范围 \p{Script=Han}）
 * - 英文/数字单词按 word 计（连续 [A-Za-z0-9_]+）
 */
export function countWords(markdown: string): number {
  const text = markdown
    // 围栏代码块（含 ```lang 起始行与 ``` 结束行）
    .replace(/```[\s\S]*?```/g, " ")
    // 行内代码
    .replace(/`[^`]*`/g, " ")
    // HTML 标签
    .replace(/<[^>]+>/g, " ")
    // 图片：![alt](url) → 去掉
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    // 链接：[text](url) → 保留 text
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    // 标题、引用、列表、无序列表项前缀
    .replace(/^\s{0,3}(#{1,6}|>+|[-*+]|\d+\.)\s+/gm, "")
    // 水平线
    .replace(/^\s{0,3}[-*_]{3,}\s*$/gm, " ")
    // 强调标记：成对 **xx** __xx__ *xx* _xx_ ~~xx~~
    .replace(/(\*\*|__|~~)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2");

  // 统计：中文字符按字计 + 英文/数字按 word 计
  const cjkMatches = text.match(/\p{Script=Han}/gu);
  const wordMatches = text.match(/[A-Za-z0-9_]+/g);
  return (cjkMatches?.length ?? 0) + (wordMatches?.length ?? 0);
}

/**
 * 标题文本 → URL slug。
 * - 保留 CJK 字符 + ASCII 字母数字
 * - 去 markdown 标记（inline code / bold / italic）
 * - 空格 / 连续标点折叠为 -
 * - 同一篇文章内重名追加 -1, -2, ...
 * - 兜底字符串 "section"（纯标点 / emoji 标题）
 */
export function slugify(text: string, scope: Map<string, number>): string {
  // 去 markdown 标记残留
  const cleaned = text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
  // 保留 unicode 字母/数字 + 空格 + -，其余替换为 -
  const base = cleaned
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "section";
  // 重名计数后缀
  const count = scope.get(base) ?? 0;
  scope.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}
