/**
 * 排名：TOML 解析 / 序列化 / 等级映射 / 排序单元测试。
 *
 * - parseRankingsToml / serializeRankingsToml 来自 src/lib/rankings/toml
 *   （构建期插件与生成工具共用）
 * - tierOf / sortRankingItems / getAllRankings 来自 src/lib/rankings
 */
import { describe, expect, it } from "vitest";
import {
  escapeTomlString,
  parseRankingsToml,
  serializeRankingsToml,
  slugifyId,
} from "@/lib/rankings/toml";
import {
  getAllRankings,
  sortRankingItems,
  tierOf,
  type RankingCategory,
} from "@/lib/rankings";

describe("parseRankingsToml（src/lib/rankings/toml）", () => {
  it("解析完整字段：id/name/description + 嵌套 items", () => {
    const categories = parseRankingsToml(`
[[categories]]
id = "food"
name = "美食"
description = "好吃的东西"

  [[categories.items]]
  name = "火锅"
  brief = "麻辣鲜香"
  comment = "聚会首选"
  score = 92

  [[categories.items]]
  name = "沙拉"
  score = 65
`);
    expect(categories).toEqual([
      {
        id: "food",
        name: "美食",
        description: "好吃的东西",
        items: [
          { name: "火锅", brief: "麻辣鲜香", comment: "聚会首选", score: 92 },
          { name: "沙拉", brief: null, comment: null, score: 65 },
        ],
      },
    ]);
  });

  it("可选字段缺省时为 null，支持多个 [[categories]]", () => {
    const categories = parseRankingsToml(`
[[categories]]
id = "games"
name = "游戏"

  [[categories.items]]
  name = "塞尔达"
  score = 98

[[categories]]
id = "movies"
name = "电影"

  [[categories.items]]
  name = "星际穿越"
  score = 96
`);
    expect(categories).toHaveLength(2);
    expect(categories[0].description).toBeNull();
    expect(categories[0].items[0]).toEqual({
      name: "塞尔达",
      brief: null,
      comment: null,
      score: 98,
    });
    expect(categories[1].id).toBe("movies");
  });

  it("忽略注释与空行", () => {
    const categories = parseRankingsToml(`
# 注释
[[categories]]
id = "a"
name = "A"

  # 条目注释
  [[categories.items]]
  name = "x"
  score = 50
`);
    expect(categories[0].items).toHaveLength(1);
  });

  it("空 TOML（无 [[categories]]）返回空数组", () => {
    expect(parseRankingsToml("# 只有注释")).toEqual([]);
  });

  it("顶层非数组表抛错", () => {
    expect(() => parseRankingsToml("categories = 1")).toThrow(/\[\[categories\]\]/);
  });

  it("非法 id（大写 / 空格 / 中文）抛错", () => {
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "Food"\nname = "x"\nitems = []`),
    ).toThrow(/id/);
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "my food"\nname = "x"\nitems = []`),
    ).toThrow(/id/);
  });

  it("缺少 name 抛错", () => {
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "a"\nitems = []`),
    ).toThrow(/name/);
  });

  it("缺少 items 或 items 非数组抛错", () => {
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "a"\nname = "A"`),
    ).toThrow(/items/);
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "a"\nname = "A"\nitems = 1`),
    ).toThrow(/items/);
  });

  it("非法分数抛错：非数字 / 超出 0-100", () => {
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "a"\nname = "A"\n\n  [[categories.items]]\n  name = "x"\n  score = "high"`),
    ).toThrow(/score/);
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "a"\nname = "A"\n\n  [[categories.items]]\n  name = "x"\n  score = 101`),
    ).toThrow(/score/);
  });

  it("条目缺少 name 抛错", () => {
    expect(() =>
      parseRankingsToml(`[[categories]]\nid = "a"\nname = "A"\n\n  [[categories.items]]\n  score = 50`),
    ).toThrow(/name/);
  });
});

describe("serializeRankingsToml（导出 → 再解析 往返一致）", () => {
  const sample: RankingCategory[] = [
    {
      id: "food",
      name: "美食",
      description: "好吃的东西",
      items: [
        { name: "火锅", brief: "麻辣鲜香", comment: "聚会首选", score: 92 },
        { name: "沙拉", brief: "", comment: null, score: 65 },
      ],
    },
    {
      id: "games",
      name: "游戏",
      description: "",
      items: [{ name: "塞尔达", brief: "开放世界", comment: "时间杀手", score: 98 }],
    },
  ];

  it("round-trip：parse(serialize(x)) 深等于 x（空可选字段被归一为 null）", () => {
    const toml = serializeRankingsToml(sample);
    const reparsed = parseRankingsToml(toml);
    expect(reparsed).toEqual([
      {
        id: "food",
        name: "美食",
        description: "好吃的东西",
        items: [
          { name: "火锅", brief: "麻辣鲜香", comment: "聚会首选", score: 92 },
          { name: "沙拉", brief: null, comment: null, score: 65 },
        ],
      },
      {
        id: "games",
        name: "游戏",
        description: null,
        items: [{ name: "塞尔达", brief: "开放世界", comment: "时间杀手", score: 98 }],
      },
    ]);
  });

  it("包含文件头注释，且跳过空可选字段", () => {
    const toml = serializeRankingsToml(sample);
    expect(toml).toContain("排名数据");
    expect(toml).toContain('[[categories]]');
    expect(toml).toContain('id = "food"');
    expect(toml).toContain('brief = "麻辣鲜香"');
    // 空的可选字段不应出现在导出的 TOML 里
    expect(toml).not.toContain('brief = ""');
    expect(toml).not.toContain('description = ""');
    expect(toml).not.toContain('comment = ""');
  });

  it("空数组导出只有文件头", () => {
    const toml = serializeRankingsToml([]);
    expect(toml).toContain("排名数据");
    // 文件头注释里含 [[categories]] 字样，这里应检查正文没有独立的分类表行
    expect(toml).not.toMatch(/^\[\[categories\]\]$/m);
  });

  it("字符串转义：引号 / 反斜杠 / 换行", () => {
    const categories: RankingCategory[] = [
      {
        id: "x",
        name: "带\"引号\"",
        description: null,
        items: [
          { name: "a\\b", brief: '说"你好"\n换行', comment: null, score: 70 },
        ],
      },
    ];
    const toml = serializeRankingsToml(categories);
    // 转义后可被 smol-toml 正确解析回来
    const reparsed = parseRankingsToml(toml);
    expect(reparsed[0].name).toBe('带"引号"');
    expect(reparsed[0].items[0].name).toBe("a\\b");
    expect(reparsed[0].items[0].brief).toBe('说"你好"\n换行');
  });

  it("escapeTomlString 直接验证常见字符", () => {
    expect(escapeTomlString('a"b\\c')).toBe('a\\"b\\\\c');
    expect(escapeTomlString("a\nb")).toBe("a\\nb");
  });
});

describe("slugifyId（工具页自动生成 id）", () => {
  it("英文转小写、非法字符转连字符", () => {
    expect(slugifyId("My Food List!")).toBe("my-food-list");
  });
  it("中文名称没有可用字符时回退默认值", () => {
    expect(slugifyId("美食排行")).toBe("category");
  });
  it("空名称回退默认值", () => {
    expect(slugifyId("  ")).toBe("category");
  });
});

describe("tierOf（分数 → 等级）", () => {
  it("边界值映射正确：90 夯 / 80 顶级 / 70 人上人 / 60 NPC / 59 拉完了", () => {
    expect(tierOf(100).label).toBe("夯");
    expect(tierOf(90).label).toBe("夯");
    expect(tierOf(89).label).toBe("顶级");
    expect(tierOf(80).label).toBe("顶级");
    expect(tierOf(79).label).toBe("人上人");
    expect(tierOf(70).label).toBe("人上人");
    expect(tierOf(69).label).toBe("NPC");
    expect(tierOf(60).label).toBe("NPC");
    expect(tierOf(59).label).toBe("拉完了");
    expect(tierOf(0).label).toBe("拉完了");
  });
});

describe("sortRankingItems（分数从高到低）", () => {
  it("按分数降序，同分保持原始顺序（稳定排序）", () => {
    const input = [
      { name: "A", brief: null, comment: null, score: 70 },
      { name: "B", brief: null, comment: null, score: 95 },
      { name: "C", brief: null, comment: null, score: 70 },
      { name: "D", brief: null, comment: null, score: 60 },
    ];
    expect(sortRankingItems(input).map((i) => i.name)).toEqual([
      "B",
      "A",
      "C",
      "D",
    ]);
  });

  it("不修改原数组", () => {
    const input = [
      { name: "A", brief: null, comment: null, score: 70 },
      { name: "B", brief: null, comment: null, score: 95 },
    ];
    const before = [...input];
    sortRankingItems(input);
    expect(input).toEqual(before);
  });
});

describe("getAllRankings（读取构建期数据）", () => {
  it("返回非空分类列表，字段完整合法", () => {
    const rankings = getAllRankings();
    expect(Array.isArray(rankings)).toBe(true);
    expect(rankings.length).toBeGreaterThan(0);
    for (const category of rankings) {
      expect(/^[a-z0-9-]+$/.test(category.id)).toBe(true);
      expect(typeof category.name).toBe("string");
      expect(category.name.length).toBeGreaterThan(0);
      expect(Array.isArray(category.items)).toBe(true);
      for (const item of category.items) {
        expect(typeof item.name).toBe("string");
        expect(item.name.length).toBeGreaterThan(0);
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(100);
        expect(item.brief === null || typeof item.brief === "string").toBe(true);
        expect(item.comment === null || typeof item.comment === "string").toBe(true);
      }
    }
  });
});
