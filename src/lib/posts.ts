import { parse as parseYaml } from "yaml";
// shiki + markdown-it 改为动态 import：避免把高亮器 + 解析器打进初始 vendor，
// 仅在用户进入博客详情页触发 getMarkdownRenderer() 时才按需下载。
import type MarkdownIt from "markdown-it";
import type { Highlighter } from "shiki";

/** 博客元数据（列表页用） */
export interface PostMeta {
  /** 博客 id，即目录名与 url 路径 */
  id: string;
  /** 人类可读名称 */
  name: string;
  /** 描述/摘要（可选，空字符串表示无） */
  desc: string;
  /** 封面图 URL，无则 null */
  cover: string | null;
  /** 标签 */
  tag: string[];
  /** 创建时间 YYYY-MM-DD */
  createTime: string;
}

/** 博客完整数据（详情页用，含渲染后正文） */
export interface Post extends PostMeta {
  /** markdown 渲染后的 HTML */
  content: string;
}

interface PostRaw extends PostMeta {
  /** 未渲染的 markdown 原文 */
  rawContent: string;
}

// glob 所有博客 markdown 原文（构建时静态收集）
const mdModules = import.meta.glob("/src/posts/*/index.md", {
  eager: true,
  query: "?raw",
}) as Record<string, { default: string }>;

// glob 博客目录下所有图片 → Vite 处理后的 URL（cover + 正文插图）
const imageModules = import.meta.glob(
  "/src/posts/*/*.{webp,png,jpg,jpeg,gif,svg,avif}",
  { eager: true, query: "?url" },
) as Record<string, { default: string }>;

/** 从 glob 路径提取博客 id：/src/posts/<id>/index.md → <id> */
function idFromPath(path: string): string | null {
  const m = path.match(/^\/src\/posts\/(.+)\/index\.md$/);
  return m ? m[1] : null;
}

/**
 * 解析 YAML frontmatter（--- 包裹）。
 * 用 yaml 包替代 gray-matter，避免 js-yaml 在浏览器访问 buffer.Buffer 的问题。
 */
function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const [, fm, body] = match;
  return { data: parseYaml(fm) ?? {}, content: body };
}

/**
 * 解析封面：
 * - 省略 cover 字段 → 默认 cover.webp（不存在则无封面）
 * - cover: null → 显式无封面
 * - cover: "xxx.jpg" → 指定文件
 */
function resolveCover(id: string, cover: unknown): string | null {
  if (cover === null) return null;
  const fileName =
    typeof cover === "string" && cover.length > 0 ? cover : "cover.webp";
  return imageModules[`/src/posts/${id}/${fileName}`]?.default ?? null;
}

/** 解析单篇 frontmatter（不渲染正文，保持列表页轻量） */
function parsePost(path: string, raw: string): PostRaw | null {
  const id = idFromPath(path);
  if (!id) return null;

  let data: Record<string, unknown>;
  let content: string;
  try {
    const parsed = parseFrontmatter(raw);
    data = parsed.data;
    content = parsed.content;
  } catch {
    return null;
  }

  const { name, cover, tag, desc } = data;
  if (typeof name !== "string") return null;
  const descStr = typeof desc === "string" ? desc : "";

  // createTime：YAML 会把裸日期（2026-07-04）解析成 Date 对象，统一转成 YYYY-MM-DD 字符串
  const createTimeRaw = data.createTime;
  let createTime: string;
  if (createTimeRaw instanceof Date) {
    createTime = createTimeRaw.toISOString().slice(0, 10);
  } else if (typeof createTimeRaw === "string") {
    createTime = createTimeRaw;
  } else {
    return null;
  }

  const tagList = Array.isArray(tag)
    ? tag.filter((t): t is string => typeof t === "string")
    : [];

  return {
    id,
    name,
    desc: descStr,
    cover: resolveCover(id, cover),
    tag: tagList,
    createTime,
    rawContent: content,
  };
}

// 全量解析 frontmatter，按创建时间降序
const allPostsRaw: PostRaw[] = (() => {
  const posts: PostRaw[] = [];
  for (const [path, mod] of Object.entries(mdModules)) {
    const p = parsePost(path, mod.default);
    if (p) posts.push(p);
  }
  posts.sort((a, b) => b.createTime.localeCompare(a.createTime));
  return posts;
})();

/** 获取所有博客元数据（列表页用，不加载 shiki） */
export function getAllPosts(): PostMeta[] {
  return allPostsRaw.map(({ id, name, desc, cover, tag, createTime }) => ({
    id,
    name,
    desc,
    cover,
    tag,
    createTime,
  }));
}

// --- markdown 渲染（懒加载 shiki，仅详情页触发） ---

let mdPromise: Promise<MarkdownIt> | null = null;
const renderedCache = new Map<string, Post>();

function getMarkdownRenderer(): Promise<MarkdownIt> {
  if (mdPromise) return mdPromise;
  // 动态 import：触发代码分割，shiki 核心 + markdown-it 单独成 chunk
  // 使用 createBundledHighlighter 配合细粒度 lazy import：只打包博客实际用到的
  // 9 种语言 + 2 种主题（vs createHighlighter 会把全部 200+ 语法打进 bundle）
  mdPromise = Promise.all([
    // 从 shiki/core 导入：避免主入口拉入全部 200+ 语法
    import("shiki/core").then(({ createBundledHighlighter }) =>
      import("shiki/engine/javascript").then(({ createJavaScriptRegexEngine }) =>
        // createBundledHighlighter 返回工厂函数，调用时才会真正加载语法/主题
        createBundledHighlighter({
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
        }),
      ),
    ),
    import("markdown-it"),
  ]).then(([hl, MarkdownItMod]) => {
    const hlResolved = hl as Highlighter;
    const MarkdownIt = MarkdownItMod.default;
    const instance = new MarkdownIt({
      html: false, // 禁内嵌 HTML，安全
      linkify: true,
      highlight(code, lang): string {
        if (lang && hlResolved.getLoadedLanguages().includes(lang)) {
          return hlResolved.codeToHtml(code, {
            lang,
            themes: { light: "github-light", dark: "github-dark" },
          });
        }
        return ""; // 空串 → markdown-it 默认转义
      },
    });

    // 正文图片：相对路径 → Vite URL
    const defaultImageRender = instance.renderer.rules.image;
    instance.renderer.rules.image = function (
      tokens,
      idx,
      options,
      env,
      self,
    ) {
      const token = tokens[idx];
      const src = token.attrGet("src") ?? "";
      const postId = (env as { postId?: string } | undefined)?.postId;
      if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith("/") && postId) {
        const url = imageModules[`/src/posts/${postId}/${src}`]?.default;
        if (url) token.attrSet("src", url);
      }
      return defaultImageRender
        ? defaultImageRender(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    };

    return instance;
  });
  return mdPromise;
}

/** 获取单篇博客（含渲染后正文，首次调用加载 shiki） */
export async function getPost(id: string): Promise<Post | null> {
  const cached = renderedCache.get(id);
  if (cached) return cached;

  const raw = allPostsRaw.find((p) => p.id === id);
  if (!raw) return null;

  const md = await getMarkdownRenderer();
  const post: Post = {
    ...raw,
    content: md.render(raw.rawContent, { postId: raw.id }),
  };
  renderedCache.set(id, post);
  return post;
}
