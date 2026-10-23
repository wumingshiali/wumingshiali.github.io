/**
 * 排名数据 TOML 解析与序列化。
 *
 * - 构建期由 vite-plugin-rankings 调用 parseRankingsToml（Node 环境）
 * - 生成工具（/tools/other/ranking）在浏览器调用 parse / serialize 实现导入导出
 *
 * smol-toml 是 isomorphic 依赖，Node 与浏览器均可运行；
 * 仅此模块引入解析器，页面本体走 virtual 虚拟模块，不打包 TOML 解析器。
 */
import { parse as parseToml } from "smol-toml";
import type { RankingCategory, RankingItem } from "./types.ts";

/** 分数合法区间 */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/** 分类 id 合法字符：小写字母 / 数字 / 连字符 */
const ID_PATTERN = /^[a-z0-9-]+$/;

/** TOML 基础字符串转义：反斜杠、双引号与常见控制字符 */
export function escapeTomlString(value: string): string {
  let out = "";
  for (const ch of value) {
    switch (ch) {
      case "\\":
        out += "\\\\";
        break;
      case '"':
        out += '\\"';
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      case "\b":
        out += "\\b";
        break;
      case "\f":
        out += "\\f";
        break;
      default:
        // 其余控制字符用 \uXXXX 转义，保证 TOML 合法
        if (ch.charCodeAt(0) < 0x20) {
          out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
        } else {
          out += ch;
        }
    }
  }
  return out;
}

/** 可选字符串字段：undefined / 空串统一为 null（保持结构稳定） */
function toNullableString(raw: unknown, field: string, index: number): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    throw new Error(`categories.items[${index}].${field} 必须是字符串（可缺省）`);
  }
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** 校验分数：必须是 0-100 的数字（构建期快速失败，不静默吞格式问题） */
function toScore(raw: unknown, index: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new Error(
      `categories.items[${index}].score 必须是 0-100 的数字，收到: ${JSON.stringify(raw)}`,
    );
  }
  if (raw < SCORE_MIN || raw > SCORE_MAX) {
    throw new Error(
      `categories.items[${index}].score 必须在 ${SCORE_MIN}-${SCORE_MAX} 之间，收到: ${raw}`,
    );
  }
  return raw;
}

/** 解析单条条目（[[categories.items]]） */
function parseItem(raw: unknown, index: number): RankingItem {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`categories.items[${index}] 必须是 [[categories.items]] 表格`);
  }
  const record = raw as Record<string, unknown>;
  const name = record.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`categories.items[${index}].name 必填且不能为空`);
  }
  return {
    name: name.trim(),
    brief: toNullableString(record.brief, "brief", index),
    comment: toNullableString(record.comment, "comment", index),
    score: toScore(record.score, index),
  };
}

/** 校验分类 id：必填且仅小写字母 / 数字 / 连字符 */
function toId(raw: unknown, index: number): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`categories[${index}].id 必填且不能为空`);
  }
  const id = raw.trim();
  if (!ID_PATTERN.test(id)) {
    throw new Error(
      `categories[${index}].id 仅允许小写字母/数字/连字符，收到: ${id}`,
    );
  }
  return id;
}

/** 解析并校验排名 TOML → 分类列表（保持 TOML 原始顺序，条目排序在展示层） */
export function parseRankingsToml(raw: string): RankingCategory[] {
  const doc = parseToml(raw) as { categories?: unknown };
  const rawCategories = doc.categories;
  if (rawCategories === undefined) return [];
  if (!Array.isArray(rawCategories)) {
    throw new Error("data.toml 需要 [[categories]] 数组表结构");
  }
  return rawCategories.map((category, index) => {
    if (typeof category !== "object" || category === null) {
      throw new Error(`categories[${index}] 必须是 [[categories]] 表格`);
    }
    const record = category as Record<string, unknown>;
    const name = record.name;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`categories[${index}].name 必填且不能为空`);
    }
    const items = record.items;
    if (items === undefined) {
      throw new Error(`categories[${index}].items 缺失（需要 [[categories.items]] 列表）`);
    }
    if (!Array.isArray(items)) {
      throw new Error(`categories[${index}].items 必须是 [[categories.items]] 数组表`);
    }
    return {
      id: toId(record.id, index),
      name: name.trim(),
      description: toNullableString(record.description, "description", index),
      items: items.map((item, itemIndex) => parseItem(item, itemIndex)),
    };
  });
}

/** 序列化单条条目为 [[categories.items]] 块 */
function serializeItem(item: RankingItem): string {
  const lines = [`  [[categories.items]]`, `  name = "${escapeTomlString(item.name)}"`];
  if (item.brief) lines.push(`  brief = "${escapeTomlString(item.brief)}"`);
  if (item.comment) lines.push(`  comment = "${escapeTomlString(item.comment)}"`);
  // 序列化时兜底钳制到 0-100，保证导出的 TOML 永远合法
  const score = Math.min(SCORE_MAX, Math.max(SCORE_MIN, item.score));
  lines.push(`  score = ${Number.isInteger(score) ? score : Number(score.toFixed(2))}`);
  return lines.join("\n");
}

/** 文件头注释（与 src/rankings/data.toml 一致，导出即开箱可用） */
const TOML_HEADER = `# ============================================================
# 排名数据（单一数据源）
# ------------------------------------------------------------
# 一个文件包含所有分类；每个 [[categories]] 是一个分类，
# 其下的 [[categories.items]] 是该分类里的排名条目。
#
# 字段说明：
# - id              : 分类唯一标识（URL 用，必填，仅小写字母/数字/连字符）
# - name            : 分类显示名（必填）
# - description     : 分类一句话描述（可选）
# - items[].name    : 条目名称（必填）
# - items[].brief   : 简洁描述（可选）
# - items[].comment : 评价（可选）
# - items[].score   : 分数 0-100（必填，决定等级展示：90 夯 / 80 顶级 / 70 人上人 / 60 NPC / 以下 拉完了）
#
# 想改排名？直接编辑本文件提交即可，无需本地构建。
# 也可以用 /tools/other/ranking 工具可视化编辑并生成 TOML。
# ============================================================
`;

/** 序列化分类列表 → TOML 文本（含文件头注释，可整体粘贴回 data.toml） */
export function serializeRankingsToml(categories: RankingCategory[]): string {
  const blocks = categories.map((category) => {
    const lines = [`[[categories]]`, `id = "${escapeTomlString(category.id)}"`, `name = "${escapeTomlString(category.name)}"`];
    if (category.description) {
      lines.push(`description = "${escapeTomlString(category.description)}"`);
    }
    for (const item of category.items) {
      lines.push("", serializeItem(item));
    }
    return lines.join("\n");
  });
  const body = blocks.length ? `\n${blocks.join("\n\n")}\n` : "";
  return `${TOML_HEADER}${body}`;
}

/** 由名称生成合法分类 id（用于工具页「新增分类」时自动填充） */
export function slugifyId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    // 仅保留 ASCII 字母数字，其余（含中文）统一替换为连字符
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // 中文名称没有可用字符时给个安全默认值，用户可手动改名
  return base || "category";
}

