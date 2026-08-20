import { describe, it, expect } from "vitest";
import { getPost } from "@/lib/posts";

describe("getPost", () => {
  it("返回 change2cy 博客含渲染后正文", async () => {
    const post = await getPost("change2cy");
    expect(post).not.toBeNull();
    expect(post!.name).toBe("又迁移了，这次改了啥，又加了啥？？？");
    expect(post!.content).toContain("shadcn");
    // markdown-it 渲染出 HTML 标签
    expect(post!.content).toMatch(/<h1/);
  });

  it("不存在的 id 返回 null", async () => {
    const post = await getPost("not-exist");
    expect(post).toBeNull();
  });

  it("提取 headings 字段，渲染 HTML 注入 user-content- id", async () => {
    const post = await getPost("change2cy");
    expect(post).not.toBeNull();
    expect(Array.isArray(post!.headings)).toBe(true);
    expect(post!.headings.length).toBeGreaterThan(0);
    // level 必须在 1-6 范围
    for (const h of post!.headings) {
      expect([1, 2, 3, 4, 5, 6]).toContain(h.level);
      expect(typeof h.text).toBe("string");
      expect(h.text.length).toBeGreaterThan(0);
      expect(typeof h.slug).toBe("string");
    }
    // 渲染后的 HTML 必须含 user-content- id
    expect(post!.content).toMatch(/id="user-content-[^"]+"/);
  });

  it("slugify 保留 CJK 字符", async () => {
    const post = await getPost("change2cy");
    expect(post).not.toBeNull();
    const slugs = post!.headings.map((h) => h.slug);
    // change2cy 含大量中文 h1（"这次改了什么？"等），应保留 CJK
    expect(slugs.some((s) => /[一-鿿]/.test(s))).toBe(true);
  });

  it("重名标题 slug 自动追加计数后缀", async () => {
    // best-opt-ever-how 文中出现两个 # 结果（line 12, line 31）
    const post = await getPost("best-opt-ever-how");
    expect(post).not.toBeNull();
    const slugs = post!.headings.map((h) => h.slug);
    const resultSlugs = slugs.filter((s) => s === "结果" || s === "结果-1");
    expect(resultSlugs).toContain("结果");
    expect(resultSlugs).toContain("结果-1");
    // 整体 slug 唯一性
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
