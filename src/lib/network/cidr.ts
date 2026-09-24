/**
 * CIDR 展开工具核心。
 *
 * 引擎选择：
 * - 首选 Rust 编译的 wasm（public/cidr.wasm，约 19KB，无外部依赖），
 *   加载失败（网络 / 不支持 wasm）时自动回退到下方的纯 JS 实现。
 * - 无论哪种引擎，输入都先经 JS 侧校验，保证非法 CIDR 有准确的行级提示。
 *
 * 安全限制：单条 CIDR 展开数量上限 2^20（1048576），总结果上限同样受控，
 * 避免 /8 之类超大范围把浏览器卡死。
 */

const MAX_IPS_PER_CIDR = 1 << 20; // 单条上限
const MAX_TOTAL_IPS = 1_000_000; // 总结果上限

export interface ExpandResult {
  /** 展开后的全部 IP（每行一个） */
  text: string;
  /** 总 IP 数 */
  count: number;
  /** 有效 CIDR 行数 */
  lineCount: number;
  /** 实际使用的引擎 */
  engine: "wasm" | "js";
  /** 行级警告（非法/超限行），空数组表示全部合法 */
  errors: string[];
}

interface CidrEntry {
  start: number;
  count: number;
  source: string;
}

export interface ParsedCidr {
  entries: CidrEntry[];
  total: number;
  errors: string[];
}

/** 解析多行 CIDR 文本：返回条目 + 总 IP 数 + 逐行错误 */
export function parseCidrList(input: string): ParsedCidr {
  const entries: CidrEntry[] = [];
  const errors: string[] = [];
  let total = 0;
  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const entry = parseCidr(line);
    if (!entry) {
      errors.push(`第 ${i + 1} 行「${line}」不是合法的 CIDR（应为 a.b.c.d/prefix）`);
      continue;
    }
    if (entry.count > MAX_IPS_PER_CIDR) {
      errors.push(
        `第 ${i + 1} 行「${line}」展开数量（${entry.count.toLocaleString()}）超过单条上限 ${MAX_IPS_PER_CIDR.toLocaleString()}`,
      );
      continue;
    }
    if (total + entry.count > MAX_TOTAL_IPS) {
      errors.push(`展开总数量超过上限 ${MAX_TOTAL_IPS.toLocaleString()}，请缩小范围`);
      break;
    }
    entries.push(entry);
    total += entry.count;
  }
  return { entries, total, errors };
}

/** 解析单条 CIDR，返回（网络起始 IP、主机数量）；非法返回 null */
export function parseCidr(line: string): CidrEntry | null {
  const m = line.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return null;
  const octets = [m[1], m[2], m[3], m[4]].map(Number);
  const prefix = Number(m[5]);
  if (prefix > 32 || octets.some((o) => o > 255)) return null;
  const start =
    (((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0) &
    (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);
  const count = prefix === 0 ? 2 ** 32 : 2 ** (32 - prefix);
  return { start: start >>> 0, count, source: line };
}

// ===== wasm 引擎 =====

interface CidrWasm {
  memory: WebAssembly.Memory;
  alloc: (size: number) => number;
  cidr_expand: (inPtr: number, inLen: number, outPtr: number, outCap: number) => bigint;
}

let wasmPromise: Promise<CidrWasm | null> | null = null;

/** 加载 CIDR wasm（单例；失败返回 null 走 JS 回退） */
export async function loadCidrWasm(): Promise<CidrWasm | null> {
  wasmPromise ??= (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}cidr.wasm`);
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return instance.exports as unknown as CidrWasm;
    } catch {
      return null;
    }
  })();
  const wasm = await wasmPromise;
  // 失败（网络抖动等）不永久缓存，允许下次调用重试；成功则复用单例
  if (wasm === null) wasmPromise = null;
  return wasm;
}

/** 用 wasm 展开；失败（wasm 不可用 / 超限）返回 null */
async function expandWithWasm(entries: CidrEntry[], inputText: string): Promise<string | null> {
  const wasm = await loadCidrWasm();
  if (!wasm) return null;
  try {
    const enc = new TextEncoder();
    const inputBytes = enc.encode(inputText);
    const inPtr = wasm.alloc(inputBytes.length);
    if (!inPtr) return null;
    new Uint8Array(wasm.memory.buffer, inPtr, inputBytes.length).set(inputBytes);
    let cap = Math.max(4096, entries.reduce((s, e) => s + e.count * 16, 0) + 64);
    let outPtr = wasm.alloc(cap);
    if (!outPtr) return null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = Number(wasm.cidr_expand(inPtr, inputBytes.length, outPtr, cap));
      if (result >= 0) {
        return new TextDecoder().decode(
          new Uint8Array(wasm.memory.buffer, outPtr, result),
        );
      }
      if (result === -2) {
        cap *= 2;
        if (cap > 512 * 1024 * 1024) return null;
        outPtr = wasm.alloc(cap);
        continue;
      }
      // -1 / -3：JS 已预校验，正常不会发生
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/** 纯 JS 回退展开 */
function expandWithJs(entries: CidrEntry[]): string {
  const parts: string[] = [];
  for (const e of entries) {
    for (let i = 0; i < e.count; i++) {
      const ip = (e.start + i) >>> 0;
      parts.push(`${(ip >>> 24) & 0xff}.${(ip >>> 16) & 0xff}.${(ip >>> 8) & 0xff}.${ip & 0xff}`);
    }
  }
  return parts.join("\n");
}

/**
 * 展开 CIDR 列表（批处理，每行一个）。
 * @throws 输入全部非法或超限时抛错（含行级信息）
 */
/**
 * 展开 CIDR 列表（批处理，每行一个）。
 * 部分行非法时：合法行仍展开，非法行信息放入 errors（不中断）。
 * 全部非法/空输入时返回空结果并在 errors 给出说明。
 */
export async function expandCidrs(input: string): Promise<ExpandResult> {
  const { entries, total, errors } = parseCidrList(input);
  if (entries.length === 0) {
    return {
      text: "",
      count: 0,
      lineCount: 0,
      engine: "js",
      errors: errors.length ? errors : ["请输入至少一个 CIDR"],
    };
  }
  const wasmText = await expandWithWasm(entries, input);
  if (wasmText !== null) {
    return { text: wasmText, count: total, lineCount: entries.length, engine: "wasm", errors };
  }
  return {
    text: expandWithJs(entries),
    count: total,
    lineCount: entries.length,
    engine: "js",
    errors,
  };
}
