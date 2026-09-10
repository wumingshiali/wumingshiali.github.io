/**
 * 友链 PR 检测脚本：diff 变更提取逻辑单元测试。
 *
 * 核心保证：只检测 PR 中新增/修改的友链，不检测存量条目。
 */
import { describe, expect, it } from "vitest";
import { extractChangedLinks } from "../../scripts/check-friend-links.mjs";

describe("extractChangedLinks（只提取新增/修改的友链）", () => {
  it("纯新增块：完整解析 name/url/priority/cover", () => {
    const patch = [
      "@@ -19,3 +19,9 @@",
      ' name = "Acofork"',
      ' url = "https://acofork.com"',
      ' priority = "high"',
      "",
      "+[[links]]",
      '+name = "Example 测试"',
      '+url = "https://example.com"',
      '+priority = "low"',
      '+cover = "https://example.com/example.png"',
    ].join("\n");
    expect(extractChangedLinks(patch)).toEqual([
      {
        name: "Example 测试",
        url: "https://example.com",
        priority: "low",
        cover: "https://example.com/example.png",
      },
    ]);
  });

  it("修改已有条目：-/+ 行与上下文行合并，且视为改动", () => {
    const patch = [
      "@@ -19,3 +19,3 @@",
      " [[links]]",
      '-name = "Acofork"',
      '+name = "Acofork 2"',
      ' url = "https://acofork.com"',
      ' priority = "high"',
    ].join("\n");
    expect(extractChangedLinks(patch)).toEqual([
      { name: "Acofork 2", url: "https://acofork.com", priority: "high" },
    ]);
  });

  it("只修改 url：块内出现 + 行即视为改动", () => {
    const patch = [
      "@@ -20,3 +20,3 @@",
      " [[links]]",
      ' name = "Acofork"',
      '-url = "https://old.example"',
      '+url = "https://new.example"',
      ' priority = "high"',
    ].join("\n");
    expect(extractChangedLinks(patch)).toEqual([
      { name: "Acofork", url: "https://new.example", priority: "high" },
    ]);
  });

  it("未改动块（仅上下文行）不返回", () => {
    const patch = [
      "@@ -19,3 +19,3 @@",
      " [[links]]",
      ' name = "Acofork"',
      ' url = "https://acofork.com"',
      ' priority = "high"',
    ].join("\n");
    expect(extractChangedLinks(patch)).toEqual([]);
  });

  it("被整体删除的块不返回（没有需要检测的新链接）", () => {
    const patch = [
      "@@ -19,4 +18,0 @@",
      "-[[links]]",
      '-name = "Acofork"',
      '-url = "https://acofork.com"',
      '-priority = "high"',
    ].join("\n");
    expect(extractChangedLinks(patch)).toEqual([]);
  });

  it("仅删除字段（无新增/修改值）不返回：链接无需重新检测", () => {
    const patch = [
      "@@ -20,3 +20,2 @@",
      " [[links]]",
      ' name = "Acofork"',
      ' url = "https://acofork.com"',
      '-priority = "high"',
    ].join("\n");
    expect(extractChangedLinks(patch)).toEqual([]);
  });

  it("无 patch 或空内容返回空数组", () => {
    expect(extractChangedLinks("")).toEqual([]);
    expect(extractChangedLinks("diff --git a/x b/x\n@@ -1 +1 @@\n")).toEqual([]);
  });
});
