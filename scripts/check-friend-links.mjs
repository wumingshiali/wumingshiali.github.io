/**
 * 友链 PR 可达性检测（配合 .github/workflows/friend-links.yml 使用）。
 *
 * 工作流由 pull_request_target 触发（标题以 [友链] 开头），本脚本：
 * 1. 读取 PR 分支上的 src/links/data.toml（单一数据源）
 * 2. 解析并校验结构（name/url 必填、priority 合法、cover 可选字符串、仅 http/https）
 * 3. 逐个请求 URL 做可达性检测（HEAD，失败回退 GET）
 * 4. 全部通过 → 评论 @wumingshiali 并告知贡献者等待人工审核
 *    任一项失败 → 评论失败详情并退出非 0，让 PR 检查变红
 *
 * 安全说明：脚本自包含、不执行 pnpm install，只读取数据文件与发起网络请求，
 * 适合在 pull_request_target 的仓库上下文中安全运行。
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** 友链数据文件（与 vite-plugin-links.ts 保持一致） */
const LINKS_FILE = "src/links/data.toml";
/** 合法优先级 */
const PRIORITIES = new Set(["high", "default", "low"]);
/** 浏览器风格 UA，降低被站点风控误伤的几率 */
const UA =
  "Mozilla/5.0 (compatible; FriendLinksBot/1.0; +https://github.com/wumingshiali/wumingshiali.github.io)";

/**
 * 解析本仓库友链 TOML 的受约束子集：
 * - [[links]] 数组表头
 * - key = "value" 基本字符串键值（字符串内容交给 JSON.parse 处理转义）
 * - # 注释与空行
 * 遇到无法识别的行直接抛错（宁可失败也不误解析）。
 */
export function parseLinksToml(raw) {
  const links = [];
  let current = null;
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed === "[[links]]") {
      current = {};
      links.push(current);
      continue;
    }
    if (!current) {
      throw new Error(`第 ${lineNo} 行：键值对必须位于 [[links]] 表格内`);
    }
    const kv = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(".*")$/);
    if (!kv) {
      throw new Error(`第 ${lineNo} 行无法解析（仅支持 key = "value" 形式）`);
    }
    const [, key, quoted] = kv;
    try {
      current[key] = JSON.parse(quoted);
    } catch {
      throw new Error(`第 ${lineNo} 行字符串值无法解析`);
    }
  }
  return links;
}

/** 校验友链结构，返回错误列表（空数组 = 通过） */
export function validateLinks(links) {
  const errors = [];
  links.forEach((link, i) => {
    const label = `第 ${i + 1} 个友链`;
    if (typeof link.name !== "string" || !link.name.trim()) {
      errors.push(`${label}缺少 name`);
    }
    if (typeof link.url !== "string" || !link.url.trim()) {
      errors.push(`${label}缺少 url`);
      return;
    }
    try {
      const u = new URL(link.url);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        errors.push(`${label} url 仅支持 http/https: ${link.url}`);
      }
    } catch {
      errors.push(`${label} url 不是合法链接: ${link.url}`);
    }
    if (
      link.priority !== undefined &&
      !PRIORITIES.has(link.priority)
    ) {
      errors.push(`${label} priority 必须是 high/default/low，收到: ${link.priority}`);
    }
    if (link.cover !== undefined && typeof link.cover !== "string") {
      errors.push(`${label} cover 必须是字符串 URL（可缺省）`);
    }
  });
  return errors;
}

/** 对单个 URL 发起一次请求，返回状态码；失败抛错 */
async function fetchStatus(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" },
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

/** 可达性：HEAD 优先，部分站点不支持 HEAD 时回退 GET（只读响应头即断开） */
export async function isReachable(url) {
  try {
    return (await fetchStatus(url, "HEAD")) < 400;
  } catch {
    try {
      return (await fetchStatus(url, "GET")) < 400;
    } catch {
      return false;
    }
  }
}

/** 评论到 PR（无 GitHub 评论环境时仅打印结果，便于本地调试） */
async function postComment(body) {
  const token = process.env.GITHUB_TOKEN;
  const pr = process.env.PR_NUMBER;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !pr || !repo) {
    console.log("（未检测到 GitHub 评论环境，仅输出结果）\n" + body);
    return;
  }
  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/${pr}/comments`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "friend-links-checker",
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) {
    throw new Error(`评论失败: ${res.status} ${await res.text()}`);
  }
}

/** 失败出口：评论 + 打印 + 退出非 0 */
async function fail(message) {
  try {
    await postComment(message);
  } catch (err) {
    console.error(err);
  }
  console.error(message);
  process.exit(1);
}

async function main() {
  let raw;
  try {
    raw = readFileSync(LINKS_FILE, "utf8");
  } catch {
    await fail(`❌ 无法读取 ${LINKS_FILE}，请确认文件存在并已提交喵～`);
  }

  let links;
  try {
    links = parseLinksToml(raw);
  } catch (err) {
    await fail(`❌ 友链 TOML 解析失败\n\n${err.message}\n\n请检查格式后重新推送喵～`);
  }
  if (links.length === 0) {
    await fail("❌ 没有找到任何 [[links]] 条目，请按格式添加后重新推送喵～");
  }

  const errors = validateLinks(links);
  if (errors.length > 0) {
    await fail(`❌ 友链格式校验未通过\n\n${errors.map((e) => `- ${e}`).join("\n")}\n\n请修正后重新推送喵～`);
  }

  // 并发检测所有链接可达性
  const results = await Promise.all(
    links.map(async (link) => ({ link, ok: await isReachable(link.url) })),
  );
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    await fail(
      `❌ 友链可达性检测未通过\n\n以下链接无法访问，请检查后修正并重新推送喵～\n\n${failed
        .map((r) => `- [${r.link.name}](${r.link.url})`)
        .join("\n")}`,
    );
  }

  const body = [
    "✅ 友链可达性检测通过！",
    "",
    "以下链接全部可以正常访问：",
    ...results.map((r) => `- [${r.link.name}](${r.link.url})`),
    "",
    "@wumingshiali 站长请进行人工审核喵～",
    "",
    "贡献者辛苦了，请耐心等待人工审核结果喵～",
  ].join("\n");
  await postComment(body);
  console.log("全部链接可达，已通知站长等待人工审核");
}

// 仅直接运行时执行检测（被 import 时只导出函数，便于单元测试）
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}
