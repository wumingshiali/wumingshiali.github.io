import { describe, it, expect } from "vitest";
import { getPost } from "@/lib/posts";

describe("getPost", () => {
  it("返回 hello-world 博客含渲染后正文", async () => {
    const post = await getPost("hello-world");
    expect(post).not.toBeNull();
    expect(post!.name).toBe("你好，世界");
    expect(post!.content).toContain("你好");
    // markdown-it 渲染出 HTML 标签
    expect(post!.content).toMatch(/<h2/);
  });

  it("不存在的 id 返回 null", async () => {
    const post = await getPost("not-exist");
    expect(post).toBeNull();
  });
});
