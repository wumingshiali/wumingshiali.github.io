/**
 * 友链：TOML 解析与排序逻辑单元测试。
 *
 * - parseLinksToml 来自 vite-plugin-links（构建期解析单一 TOML 数据源）
 * - sortLinks / getAllLinks 来自 src/lib/links（客户端排序与读取）
 */
import { describe, expect, it } from "vitest";
import { parseLinksToml } from "../../vite-plugin-links";
import { getAllLinks, sortLinks, type FriendLink } from "@/lib/links";

describe("parseLinksToml（vite-plugin-links）", () => {
  it("解析完整字段：name/url/priority/cover", () => {
    const links = parseLinksToml(`
[[links]]
name = "A"
url = "https://a.example"
priority = "high"
cover = "https://a.example/avatar.png"
`);
    expect(links).toEqual([
      {
        name: "A",
        url: "https://a.example",
        priority: "high",
        cover: "https://a.example/avatar.png",
      },
    ]);
  });

  it("priority 缺省时默认为 default，cover 缺省时为 null", () => {
    const links = parseLinksToml(`
[[links]]
name = "A"
url = "https://a.example"
`);
    expect(links[0].priority).toBe("default");
    expect(links[0].cover).toBeNull();
  });

  it("忽略注释与空行，支持多条 [[links]]", () => {
    const links = parseLinksToml(`
# 注释
[[links]]
name = "A"
url = "https://a.example"

[[links]]
name = "B"
url = "https://b.example"
priority = "low"
`);
    expect(links).toHaveLength(2);
    expect(links[1]).toEqual({
      name: "B",
      url: "https://b.example",
      priority: "low",
      cover: null,
    });
  });

  it("非法 priority 抛错", () => {
    expect(() =>
      parseLinksToml(`
[[links]]
name = "A"
url = "https://a.example"
priority = "very-high"
`),
    ).toThrow(/priority/);
  });

  it("非法 cover 抛错", () => {
    expect(() =>
      parseLinksToml(`
[[links]]
name = "A"
url = "https://a.example"
cover = 123
`),
    ).toThrow(/cover/);
  });

  it("缺少 name 抛错", () => {
    expect(() =>
      parseLinksToml(`
[[links]]
url = "https://a.example"
`),
    ).toThrow(/name/);
  });

  it("缺少 url 抛错", () => {
    expect(() =>
      parseLinksToml(`
[[links]]
name = "A"
`),
    ).toThrow(/url/);
  });

  it("空 TOML（无 [[links]]）返回空数组", () => {
    expect(parseLinksToml("# 只有注释")).toEqual([]);
  });

  it("顶层非数组表抛错", () => {
    expect(() => parseLinksToml("links = 1")).toThrow(/\[\[links\]\]/);
  });
});

describe("sortLinks（优先级 + 首字母）", () => {
  const link = (name: string, priority: FriendLink["priority"] = "default"): FriendLink => ({
    name,
    url: `https://${name}.example`,
    priority,
    cover: null,
  });

  it("第一依据优先级：high > default > low", () => {
    const input = [link("C", "low"), link("A", "default"), link("B", "high")];
    expect(sortLinks(input).map((l) => l.name)).toEqual(["B", "A", "C"]);
  });

  it("第二依据首字母：同优先级按名称排序（拉丁字母）", () => {
    const input = [link("Beta"), link("Alpha"), link("Charlie")];
    expect(sortLinks(input).map((l) => l.name)).toEqual(["Alpha", "Beta", "Charlie"]);
  });

  it("第二依据首字母：中文按拼音排序", () => {
    const input = [link("小明"), link("阿明")];
    expect(sortLinks(input).map((l) => l.name)).toEqual(["阿明", "小明"]);
  });

  it("不修改原数组（返回新数组）", () => {
    const input = [link("A", "low"), link("B", "high")];
    const before = [...input];
    sortLinks(input);
    expect(input).toEqual(before);
  });
});

describe("getAllLinks（读取构建期数据）", () => {
  it("返回已按优先级 + 首字母排序的列表", () => {
    const links = getAllLinks();
    expect(Array.isArray(links)).toBe(true);
    expect(links.length).toBeGreaterThan(0);
    // 与 sortLinks 输出一致（稳定性：再排一次应完全不变）
    expect(links).toEqual(sortLinks(links));
    // 字段完整
    for (const l of links) {
      expect(typeof l.name).toBe("string");
      expect(l.url.startsWith("http")).toBe(true);
      expect(["high", "default", "low"]).toContain(l.priority);
      expect(l.cover === null || typeof l.cover === "string").toBe(true);
    }
  });
});
