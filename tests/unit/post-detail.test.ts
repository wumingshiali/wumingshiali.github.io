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
});
