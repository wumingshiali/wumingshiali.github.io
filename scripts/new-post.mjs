#!/usr/bin/env node
/**
 * 创建新博客文章骨架。
 *
 * 用法：pnpm new:post <博客id>
 * 示例：pnpm new:post my-new-post
 *
 * 生成 src/posts/<id>/index.md，含 frontmatter 模板。
 * 创建后请编辑 frontmatter 填写标题、简介、标签，并补充正文。
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const id = process.argv[2];
if (!id) {
  console.error("用法：pnpm new:post <博客id>");
  console.error("示例：pnpm new:post my-new-post");
  process.exit(1);
}

// 简单校验 id：kebab-case，避免 URL 编码问题
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  console.error("错误：id 需为 kebab-case（小写字母、数字、连字符），如 my-new-post");
  process.exit(1);
}

const dir = path.join("src/posts", id);
if (existsSync(dir)) {
  console.error(`错误：已存在 ${dir}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const content = `---
name: ${id}
desc: ""
cover: null
tag: []
createTime: ${today}
---

`;

await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, "index.md"), content, "utf8");
console.log(`已创建：src/posts/${id}/index.md`);
console.log("下一步：编辑 frontmatter（name/desc/tag）并补充正文，可选放 cover.webp");
