/**
 * IP 归属查询（联网）。
 *
 * 数据源：
 * - 主：百度 opendata（JSONP，不受 CORS 限制，返回国内省市 + ISP）
 * - 备：ipwho.is（HTTPS + CORS，返回国家/地区/城市）
 * 两个都失败时返回空结果并带错误说明。
 * 支持批量查询（并发）。
 */

export interface IpLocation {
  ip: string;
  /** 归属文本（如「广东省深圳市 电信」）；查询失败为空 */
  location: string;
  /** 实际命中的数据源 */
  source: "baidu" | "ipwho" | null;
  error?: string;
}

/** 简单的 IP 格式校验（IPv4） */
export function isValidIp(ip: string): boolean {
  const parts = ip.trim().split(".");
  return (
    parts.length === 4 &&
    parts.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)
  );
}

/**
 * JSONP 请求：动态插入 script 跨域取数（不受 CORS 限制）。
 * 仅浏览器环境可用；超时 / 加载失败 reject。
 */
function jsonp(url: string, timeoutMs = 8000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const cbName = `__ipjsonp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    let settled = false;
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("查询超时"));
    }, timeoutMs);
    (window as unknown as Record<string, unknown>)[cbName] = (data: unknown) => {
      if (settled) return;
      cleanup();
      resolve(data as Record<string, unknown>);
    };
    function cleanup() {
      settled = true;
      window.clearTimeout(timer);
      // 保留 noop 回调：脚本可能仍会在超时后执行，直接 delete 会抛 TypeError
      (window as unknown as Record<string, unknown>)[cbName] = () => {};
      script.remove();
    }
    script.src = `${url}${url.includes("?") ? "&" : "?"}cb=${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("请求失败"));
    };
    document.head.appendChild(script);
  });
}

/** 百度 opendata：返回省市 + ISP 文本 */
async function queryBaidu(ip: string): Promise<string | null> {
  try {
    const data = await jsonp(
      `https://opendata.baidu.com/api.php?query=${encodeURIComponent(ip)}&co=&resource_id=6006&oe=utf8`,
    );
    const list = (data as { data?: Array<{ location?: unknown }> }).data;
    const location = list?.[0]?.location;
    return typeof location === "string" && location.trim()
      ? location.trim()
      : null;
  } catch {
    return null;
  }
}

/** ipwho.is：返回国家 / 地区 / 城市 */
async function queryIpwho(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      region?: string;
      city?: string;
    };
    if (data.success === false) return null;
    const parts = [data.country, data.region, data.city].filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );
    return parts.length ? parts.join(" ") : null;
  } catch {
    return null;
  }
}

/** 查询单个 IP 归属 */
export async function lookupIp(ip: string): Promise<IpLocation> {
  const normalized = ip.trim();
  const baidu = await queryBaidu(normalized);
  if (baidu) return { ip: normalized, location: baidu, source: "baidu" };
  const ipwho = await queryIpwho(normalized);
  if (ipwho) return { ip: normalized, location: ipwho, source: "ipwho" };
  return {
    ip: normalized,
    location: "",
    source: null,
    error: "查询失败：接口不可达或无结果",
  };
}

/**
 * 批量查询（批处理）。
 * JSONP 走 script 标签、不受浏览器连接数限流，因此用固定并发池（默认 5）
 * 控制请求量，避免一次输入上百 IP 时狂发请求被接口限流。
 */
export async function lookupIps(
  ips: string[],
  concurrency = 5,
): Promise<IpLocation[]> {
  const valid = ips.map((s) => s.trim()).filter(Boolean);
  const results: IpLocation[] = new Array(valid.length);
  let next = 0;
  async function worker() {
    while (next < valid.length) {
      const index = next++;
      results[index] = await lookupIp(valid[index]);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, valid.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
