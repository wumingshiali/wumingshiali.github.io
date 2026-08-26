/**
 * 博客 markdown 渲染器（构建期专用）。
 *
 * 把 markdown 渲染成 HTML（markdown-it + shiki 语法高亮）的全部工作
 * 在构建期完成：客户端不再引入 shiki / markdown-it，只消费
 * vite-plugin-prerender-posts 生成的预渲染数据。
 *
 * 仅被 vite-plugin-prerender-posts 引用，不会进入客户端 bundle。
 */
import { createBundledHighlighter } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { Highlighter } from "shiki";
import type { MarkdownIt } from "markdown-it";
import { slugify, type Heading } from "./post-text.ts";

/** 正文图片 URL 解析回调：相对路径 → 可访问 URL，无法解析返回 null */
export type ImageResolver = (src: string, postId: string) => string | null;

/** markdown-it 渲染时收集 toc 的 env 形状（type 而非 interface：可隐式匹配 Env 索引签名） */
type RenderEnv = {
  postId: string;
  toc: Heading[];
};

/** 单篇文章内的 slug 计数（每次 render 前重置），用于重名标题去重 */
const seenSlugs = new Map<string, number>();

/**
 * 创建 markdown-it 渲染器（含 shiki 高亮、图片 URL 解析、标题 id/大纲收集）。
 *
 * 高亮器初始化较慢，构建期只创建一次，供所有文章复用。
 * markdown-it@15 无 default 类型导出，运行时通过动态 import 取 .default。
 */
export async function createMarkdownRenderer(
  resolveImage: ImageResolver,
): Promise<MarkdownIt> {
  // 与旧客户端实现保持一致：createBundledHighlighter + 细粒度 lazy import，
  // 只加载博客实际用到的 9 种语言 + 2 种主题（vs createHighlighter 会拉入全部 200+ 语法）
  const hl = (await createBundledHighlighter({
    langs: {
      javascript: () => import("shiki/dist/langs/javascript.mjs"),
      typescript: () => import("shiki/dist/langs/typescript.mjs"),
      vue: () => import("shiki/dist/langs/vue.mjs"),
      bash: () => import("shiki/dist/langs/bash.mjs"),
      json: () => import("shiki/dist/langs/json.mjs"),
      markdown: () => import("shiki/dist/langs/markdown.mjs"),
      html: () => import("shiki/dist/langs/html.mjs"),
      css: () => import("shiki/dist/langs/css.mjs"),
      yaml: () => import("shiki/dist/langs/yaml.mjs"),
    },
    themes: {
      "github-dark": () => import("shiki/dist/themes/github-dark.mjs"),
      "github-light": () => import("shiki/dist/themes/github-light.mjs"),
    },
    // JS 正则引擎替代 Oniguruma WASM：体积更小、初始化无 WASM 开销
    engine: () => createJavaScriptRegexEngine(),
  })({
    themes: ["github-light", "github-dark"],
    langs: [
      "javascript",
      "typescript",
      "vue",
      "bash",
      "json",
      "markdown",
      "html",
      "css",
      "yaml",
    ],
  })) as Highlighter;

  const MarkdownIt = (await import("markdown-it")).default;
  const instance = new MarkdownIt({
    html: false, // 禁内嵌 HTML，安全
    linkify: true,
    highlight(code, lang): string {
      if (lang && hl.getLoadedLanguages().includes(lang)) {
        return hl.codeToHtml(code, {
          lang,
          themes: { light: "github-light", dark: "github-dark" },
        });
      }
      return ""; // 空串 → markdown-it 默认转义
    },
  });

  // 正文图片：相对路径 → 构建期静态 URL（/posts/<id>/<file>）
  const defaultImageRender = instance.renderer.rules.image;
  instance.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    // attrGet 类型为 string | number | null，img 的 src 实际恒为 string，这里收窄
    const srcAttr = token.attrGet("src");
    const src = typeof srcAttr === "string" ? srcAttr : "";
    const postId = (env as { postId?: string } | undefined)?.postId;
    if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith("/") && postId) {
      const url = resolveImage(src, postId);
      if (url) token.attrSet("src", url);
    }
    return defaultImageRender
      ? defaultImageRender(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };

  // 覆写 heading_open：给标题注入 id，并把大纲信息收集到 env.toc
  // 让目录组件能直接拿到 { level, text, slug } 列表
  const defaultHeadingOpen =
    instance.renderer.rules.heading_open ??
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

  instance.renderer.rules.heading_open = function (
    tokens,
    idx,
    options,
    env,
    self,
  ) {
    const token = tokens[idx];
    const level = Number(token.tag.slice(1)) as Heading["level"];

    // heading_open 与 heading_close 之间的 inline token → 拼出标题纯文本
    let text = "";
    for (let i = idx + 1; i < tokens.length; i++) {
      if (tokens[i].type === "heading_close") break;
      if (tokens[i].type === "inline") text += tokens[i].content;
    }

    const rEnv = env as RenderEnv;
    // 兜底：没传 env.toc 时也能写
    if (!Array.isArray(rEnv.toc)) rEnv.toc = [];
    const slug = slugify(text, seenSlugs);
    token.attrSet("id", `user-content-${slug}`);
    rEnv.toc.push({ level, text: text.trim(), slug });

    return defaultHeadingOpen(tokens, idx, options, env, self);
  };

  return instance;
}

/** 渲染单篇 markdown（正文 + 大纲）。postId 用于图片 URL 解析与 slug 隔离 */
export function renderPostContent(
  md: MarkdownIt,
  rawContent: string,
  postId: string,
): { content: string; headings: Heading[] } {
  // 每次 render 前清空单篇 slug 计数，避免跨文章污染导致锚点冲突
  seenSlugs.clear();
  const toc: Heading[] = [];
  const env: RenderEnv = { postId, toc };
  return { content: md.render(rawContent, env), headings: env.toc };
}

