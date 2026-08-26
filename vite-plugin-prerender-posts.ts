/**
 * Vite 插件：构建期预渲染博客文章。
 *
 * 在构建期用 markdown-it + shiki 把所有 markdown 渲染成 HTML，生成
 * src/generated/posts-data.ts 供客户端同步消费（getPost / getAllPosts），
 * 并把文章目录下的图片（封面 + 正文插图）作为静态资源发到 dist/posts/<id>/。
 *
 * 由此客户端不再执行 markdown 渲染，也不引入 shiki / markdown-it：
 * - buildStart：重新生成 posts-data.ts（构建与 dev 启动都会触发，保证与 src/posts 一致）
 * - generateBundle：把博客图片发到 dist/posts/<id>/
 * - configureServer：dev 模式把 /posts/<id>/<file> 重写到 Vite 的 @fs 静态服务
 *
 * Vitest 复用同一份 vite.config：跳过重建，直接读取提交的生成文件，
 * 避免每次测试会话都初始化 shiki。
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import type { MarkdownIt } from "markdown-it";
import type { Plugin, ResolvedConfig } from "vite";
import { countWords, type Heading } from "./src/lib/post-text.ts";
import {
  createMarkdownRenderer,
  renderPostContent,
} from "./src/lib/post-render.ts";

/** 博客源目录 */
const POSTS_DIR = resolve("src/posts");
/** 生成的预渲染数据文件（提交入库，供 typecheck / 单测在构建前直接使用） */
const GENERATED_FILE = resolve("src/generated/posts-data.ts");

/** 博客完整数据（与客户端 Post 形状一致，生成文件直接引用） */
interface GeneratedPost {
  id: string;
  name: string;
  desc: string;
  cover: string | null;
  tag: string[];
  createTime: string;
  wordCount: number;
  content: string;
  headings: Heading[];
}

/** 从 markdown 提取 YAML frontmatter 与正文（--- 包裹） */
function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const [, fm, body] = match;
  return { data: (parseYaml(fm) as Record<string, unknown>) ?? {}, content: body };
}

/**
 * 解析封面 URL：
 * - 省略 cover 字段 → 默认 cover.webp（不存在则无封面）
 * - cover: null → 显式无封面
 * - cover: "xxx.jpg" → 指定文件
 */
function resolveCover(id: string, cover: unknown): string | null {
  if (cover === null) return null;
  const fileName =
    typeof cover === "string" && cover.length > 0 ? cover : "cover.webp";
  return existsSync(join(POSTS_DIR, id, fileName))
    ? `/posts/${id}/${fileName}`
    : null;
}

/** 正文相对图片 → 静态 URL（文件存在才替换） */
function resolvePostImage(src: string, postId: string): string | null {
  return existsSync(join(POSTS_DIR, postId, src))
    ? `/posts/${postId}/${src}`
    : null;
}

/** 解析单篇 frontmatter 元数据（封面解析依赖 fs，仅构建期） */
function buildPostMeta(
  id: string,
  data: Record<string, unknown>,
  body: string,
): Omit<GeneratedPost, "content" | "headings"> | null {
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
    wordCount: countWords(body),
  };
}

/** 读取全部博客目录 id（目录不存在时返回空数组） */
function listPostIds(): string[] {
  try {
    return readdirSync(POSTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/** 渲染全部文章并写出 src/generated/posts-data.ts */
async function generatePostsData(md: MarkdownIt): Promise<void> {
  const posts: GeneratedPost[] = [];
  for (const id of listPostIds()) {
    const mdPath = join(POSTS_DIR, id, "index.md");
    if (!existsSync(mdPath)) continue;
    const raw = readFileSync(mdPath, "utf-8");
    const { data, content } = parseFrontmatter(raw);
    const meta = buildPostMeta(id, data, content);
    if (!meta) continue;
    const { content: html, headings } = renderPostContent(md, content, id);
    posts.push({ ...meta, content: html, headings });
  }
  // 排序保证生成文件确定性：createTime 降序，同日按 id 升序
  posts.sort(
    (a, b) => b.createTime.localeCompare(a.createTime) || a.id.localeCompare(b.id),
  );

  const lines = [
    "// 本文件由 vite-plugin-prerender-posts 在构建/启动时自动生成，请勿手动编辑。",
    "// 文章 markdown → HTML 的渲染在构建期完成，客户端只消费此预渲染结果。",
    "",
    "export interface GeneratedPostData {",
    "  id: string;",
    "  name: string;",
    "  desc: string;",
    "  cover: string | null;",
    "  tag: string[];",
    "  createTime: string;",
    "  wordCount: number;",
    "  /** 构建期渲染后的 HTML */",
    "  content: string;",
    "  headings: { level: 1 | 2 | 3 | 4 | 5 | 6; text: string; slug: string }[];",
    "}",
    "",
    "export const postsData: GeneratedPostData[] = [",
    ...posts.map((p) => `  ${JSON.stringify(p)},`),
    "];",
    "",
  ].join("\n");

  mkdirSync(dirname(GENERATED_FILE), { recursive: true });
  writeFileSync(GENERATED_FILE, lines, "utf-8");
}

export function prerenderPosts(): Plugin {
  // Vitest 会在同一份 vite.config 中加载插件：跳过重建，直接读提交的生成文件
  let isVitest = false;

  return {
    name: "prerender-posts",
    enforce: "pre",

    configResolved(_config: ResolvedConfig) {
      // Vitest 会设置 process.env.VITEST；普通构建/dev 不设置。
      // 注意不能用 "test" in config 判别：vite.config.ts 自带 test 键，构建时也恒为 true
      isVitest = process.env.VITEST === "true";
    },

    async buildStart() {
      if (isVitest) return;
      // 构建与 dev 启动都会触发：保证生成文件与 src/posts 一致
      const md = await createMarkdownRenderer(resolvePostImage);
      await generatePostsData(md);
    },

    generateBundle() {
      // 把博客目录下所有非 md 文件（封面 + 正文插图）发到 dist/posts/<id>/
      for (const id of listPostIds()) {
        let files: string[];
        try {
          files = readdirSync(join(POSTS_DIR, id));
        } catch {
          continue;
        }
        for (const f of files) {
          if (f === "index.md") continue;
          const abs = join(POSTS_DIR, id, f);
          if (!statSync(abs).isFile()) continue;
          this.emitFile({
            type: "asset",
            fileName: `posts/${id}/${f}`,
            source: readFileSync(abs),
          });
        }
      }
    },

    configureServer(server) {
      // dev 模式：把 /posts/<id>/<file> 重写到 Vite 的 @fs 静态服务
      // （生成数据里的封面/正文图片 URL 均为该形态，构建产物由 generateBundle 落地）
      server.middlewares.use((req, _res, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        const m = pathname.match(/^\/posts\/([^/]+)\/([^/]+)$/);
        if (m) {
          const [, id, file] = m;
          const abs = resolve(join(POSTS_DIR, id, decodeURIComponent(file)));
          // 防目录穿越：解析结果必须仍在 POSTS_DIR 内
          if (
            abs.startsWith(resolve(POSTS_DIR) + sep) &&
            existsSync(abs) &&
            statSync(abs).isFile()
          ) {
            req.url = `/@fs/${abs.split(sep).join("/")}`;
          }
        }
        next();
      });
    },
  };
}
