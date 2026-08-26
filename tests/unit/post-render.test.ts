/**
 * 构建期 markdown 渲染器（post-render.ts）单元测试。
 *
 * 渲染已从客户端迁移到构建期（vite-plugin-prerender-posts 在构建时调用），
 * 这里直接锁定渲染行为：shiki 高亮、标题 id/大纲、正文图片 URL 解析。
 */
import { describe, expect, it } from "vitest";
import {
  createMarkdownRenderer,
  renderPostContent,
} from "@/lib/post-render";

describe("构建期渲染器 post-render", () => {
  it("代码块渲染为 shiki 高亮 HTML（含明暗双主题类）", async () => {
    const md = await createMarkdownRenderer(() => null);
    const { content } = renderPostContent(
      md,
      "```ts\nconst x: number = 1;\n```",
      "test-post",
    );
    expect(content).toContain("shiki");
    expect(content).toContain("github-dark");
    expect(content).toContain("github-light");
    // 代码内容本身不被转义丢失（去标签后校验，shiki 会把代码拆进带样式的 span）
    expect(content.replace(/<[^>]*>/g, "")).toContain("const x: number = 1;");
  });

  it("标题注入 user-content- id 并收集大纲", async () => {
    const md = await createMarkdownRenderer(() => null);
    const { content, headings } = renderPostContent(
      md,
      "# 标题一\n\n## 标题二",
      "test-post",
    );
    expect(content).toContain('id="user-content-标题一"');
    expect(content).toContain('id="user-content-标题二"');
    expect(headings.map((h) => [h.level, h.slug])).toEqual([
      [1, "标题一"],
      [2, "标题二"],
    ]);
  });

  it("相对图片路径经 resolveImage 重写为静态 URL", async () => {
    const md = await createMarkdownRenderer(
      (src, postId) => `/posts/${postId}/${src}`,
    );
    const { content } = renderPostContent(md, "![图](a.webp)", "p1");
    expect(content).toContain('src="/posts/p1/a.webp"');
  });

  it("resolveImage 返回 null 时保留原相对路径", async () => {
    const md = await createMarkdownRenderer(() => null);
    const { content } = renderPostContent(md, "![图](missing.webp)", "p1");
    expect(content).toContain('src="missing.webp"');
  });

  it("绝对/远程图片 URL 不被重写", async () => {
    const md = await createMarkdownRenderer(
      (src) => `/rewritten/${src}`,
    );
    const { content } = renderPostContent(
      md,
      "![a](/abs.png) ![b](https://x.com/c.png)",
      "p1",
    );
    expect(content).toContain('src="/abs.png"');
    expect(content).toContain('src="https://x.com/c.png"');
    expect(content).not.toContain("/rewritten/");
  });

  it("跨文章 slug 计数互不污染（结果 / 结果-1 独立）", async () => {
    const md = await createMarkdownRenderer(() => null);
    const render = (id: string) =>
      renderPostContent(md, "# 结果\n\n# 结果", id);
    const a = render("a");
    const b = render("b");
    // 每篇内部重名 → -1；不同文章互不影响
    expect(a.headings.map((h) => h.slug)).toEqual(["结果", "结果-1"]);
    expect(b.headings.map((h) => h.slug)).toEqual(["结果", "结果-1"]);
  });
});

