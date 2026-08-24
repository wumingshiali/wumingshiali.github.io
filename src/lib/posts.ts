import { parse as parseYaml } from "yaml";
// shiki + markdown-it 改为动态 import：避免把高亮器 + 解析器打进初始 vendor，
// 仅在用户进入博客详情页触发 getMarkdownRenderer() 时才按需下载。
// markdown-it@15 自带类型：default 导出是构造函数值，实例类型需用 named import
import type { MarkdownIt } from "markdown-it";
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

/** 标题项，目录组件消费 */
export interface Heading {
  /** 1-6，对应 h1-h6 */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** 纯文本（去 markdown 语法后的可读标题） */
  text: string;
  /** URL 安全 slug，与 user-content- 前缀拼接成 heading id */
  slug: string;
}

/** markdown-it 渲染时收集 toc 的 env 形状（type 而非 interface：可隐式匹配 Env 索引签名） */
type RenderEnv = {
  postId: string;
  toc: Heading[];
};

/** 博客完整数据（详情页用，含渲染后正文） */
export interface Post extends PostMeta {
  /** markdown 渲染后的 HTML */
  content: string;
  /** 文章标题大纲（h1-h6），目录组件消费 */
  headings: Heading[];
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

/** 单篇文章内的 slug 计数（每次 render 前重置），用于重名标题去重 */
const seenSlugs = new Map<string, number>();

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
      // attrGet 类型为 string | number | null，img 的 src 实际恒为 string，这里收窄
      const srcAttr = token.attrGet("src");
      const src = typeof srcAttr === "string" ? srcAttr : "";
      const postId = (env as { postId?: string } | undefined)?.postId;
      if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith("/") && postId) {
        const url = imageModules[`/src/posts/${postId}/${src}`]?.default;
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
      // 兜底：getPost 没传 env.toc 时也能写
      if (!Array.isArray(rEnv.toc)) rEnv.toc = [];
      const slug = slugify(text, seenSlugs);
      token.attrSet("id", `user-content-${slug}`);
      rEnv.toc.push({ level, text: text.trim(), slug });

      return defaultHeadingOpen(tokens, idx, options, env, self);
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
  // 每次 render 前清空单篇 slug 计数，避免跨文章污染导致锚点冲突
  seenSlugs.clear();
  const toc: Heading[] = [];
  const env: RenderEnv = { postId: raw.id, toc };

  const post: Post = {
    ...raw,
    content: md.render(raw.rawContent, env),
    headings: env.toc,
  };
  renderedCache.set(id, post);
  return post;
}
