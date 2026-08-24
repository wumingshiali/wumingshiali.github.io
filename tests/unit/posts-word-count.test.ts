/**
 * countWords 单元测试。
 *
 * 关注：中文字符按字计、英文/数字按 word 计、去除 markdown 标记与代码块。
 */
import { describe, expect, it } from "vitest";
import { countWords, getAllPosts } from "@/lib/posts";

describe("countWords", () => {
  it("纯中文按字符计", () => {
    expect(countWords("你好世界")).toBe(4);
    expect(countWords("浮浮酱是猫娘")).toBe(6);
  });

  it("纯英文按 word 计（连续字母数字为一个 word）", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("Vue 3 TypeScript")).toBe(3); // Vue / 3 / TypeScript
  });

  it("中英混合", () => {
    expect(countWords("Hello 世界")).toBe(3); // Hello(1) + 世(1) + 界(1)
  });

  it("空字符串返回 0", () => {
    expect(countWords("")).toBe(0);
  });

  it("围栏代码块不计入", () => {
    const md = [
      "正文开始",
      "",
      "```js",
      "const a = 1;",
      "const b = 2;",
      "```",
      "",
      "正文结束",
    ].join("\n");
    expect(countWords(md)).toBe(8); // 正文(2) + 开始(2) + 正文(2) + 结束(2) = 8
  });

  it("行内代码不计入", () => {
    expect(countWords("使用 `npm install` 安装")).toBe(4); // 使用(2) + 安装(2)
  });

  it("链接只算文本，URL 不计", () => {
    expect(countWords("参考 [Vue 官网](https://vuejs.org)")).toBe(5); // 参考(2) + Vue(1) + 官网(2)
  });

  it("图片不计入 alt 与 url", () => {
    expect(countWords("封面 ![](cover.png) 正文")).toBe(4); // 封面(2) + 正文(2)
  });

  it("HTML 标签不计入", () => {
    expect(countWords("前后 <span class=\"x\">中间</span> 文字")).toBe(6); // 前后(2) + 中间(2) + 文字(2)
  });

  it("标题标记 # 不计入", () => {
    expect(countWords("## 标题内容")).toBe(4); // 标题(2) + 内容(2)
  });

  it("列表标记 - 不计入", () => {
    expect(countWords("- 第一项\n- 第二项")).toBe(6); // 第一项(3) + 第二项(3)
  });

  it("强调标记 * _ 不计入", () => {
    expect(countWords("这是 **粗体** 和 *斜体* 文本")).toBe(9); // 这是(2)+粗体(2)+和(1)+斜体(2)+文本(2)
  });

  it("数字按 word 计", () => {
    expect(countWords("版本 1.0.0 发布")).toBe(7); // 版本(2) + 1(1) + 0(1) + 0(1) + 发布(2) = 7
  });

  it("标点和空白不计入", () => {
    expect(countWords("你好，世界！")).toBe(4); // 你好世界
  });
});

describe("getAllPosts 包含 wordCount", () => {
  it("返回的每条 PostMeta 都含正整数 wordCount", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) {
      expect(typeof p.wordCount).toBe("number");
      expect(p.wordCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("至少有一篇 wordCount > 0（真实博客不应为 0）", () => {
    const posts = getAllPosts();
    expect(posts.some((p) => p.wordCount > 0)).toBe(true);
  });
});
