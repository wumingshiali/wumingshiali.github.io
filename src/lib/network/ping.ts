/**
 * 本地 Ping（HTTP 时延近似）。
 *
 * 浏览器无法发送 ICMP，这里测量「请求发出到响应到达」的 HTTP 时延：
 * 对目标发起 no-cors fetch，无论是否可读响应都能计时；请求失败或超时计为丢包。
 * 支持批量目标（批处理），每个目标可发多个样本统计 min / avg / max。
 */

export interface PingStats {
  url: string;
  /** 成功样本 RTT（ms） */
  samples: number[];
  min: number;
  avg: number;
  max: number;
  /** 丢包数（失败/超时样本） */
  loss: number;
  /** 丢包率 0~1 */
  lossRate: number;
}

/** 补全 URL 协议（无协议时默认 https://） */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** 单次 HTTP 时延（ms）；请求失败或超时返回 null（计为丢包） */
export async function pingOnce(
  url: string,
  timeoutMs = 5000,
): Promise<number | null> {
  const start = performance.now();
  try {
    await fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    // 连接失败 / 超时 → 丢包
    return null;
  }
  return performance.now() - start;
}

/** 对单个目标发 count 次样本并统计 */
export async function pingHost(
  url: string,
  count = 4,
  timeoutMs = 5000,
): Promise<PingStats> {
  const samples: number[] = [];
  let loss = 0;
  for (let i = 0; i < count; i++) {
    const rtt = await pingOnce(url, timeoutMs);
    if (rtt === null) loss++;
    else samples.push(rtt);
  }
  const min = samples.length ? Math.min(...samples) : 0;
  const max = samples.length ? Math.max(...samples) : 0;
  const avg = samples.length
    ? samples.reduce((a, b) => a + b, 0) / samples.length
    : 0;
  return { url, samples, min, avg, max, loss, lossRate: count ? loss / count : 0 };
}

/** 批量 Ping（目标之间并行，样本内部串行） */
export async function pingHosts(
  urls: string[],
  count = 4,
  timeoutMs = 5000,
): Promise<PingStats[]> {
  const targets = urls.map(normalizeUrl).filter(Boolean);
  return Promise.all(targets.map((u) => pingHost(u, count, timeoutMs)));
}
