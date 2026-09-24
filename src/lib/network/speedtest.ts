/**
 * 本地测速。
 *
 * - 下载：读响应流累计字节数 / 耗时计算吞吐（需目标支持 CORS 才能读到 body）
 * - 上传：no-cors POST 一个数据块，按「发出请求到完成」计时计算吞吐
 *   （no-cors 下 Content-Type 必须为简单类型，用 text/plain 数据块）
 */

export interface DownloadResult {
  bytes: number;
  ms: number;
  /** Mbps */
  mbps: number;
}

export interface UploadResult {
  bytes: number;
  ms: number;
  mbps: number;
}

export interface SpeedProgress {
  receivedBytes: number;
  mbps: number;
}

/** 下载测速：读取整个响应流，按 500ms 间隔回调实时速度 */
export async function downloadSpeed(
  url: string,
  onProgress?: (p: SpeedProgress) => void,
): Promise<DownloadResult> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`下载请求失败（HTTP ${res.status}）`);
  if (!res.body) throw new Error("当前浏览器不支持流式下载测速");
  const reader = res.body.getReader();
  const start = performance.now();
  let bytes = 0;
  let lastReport = start;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    const now = performance.now();
    if (onProgress && now - lastReport >= 500) {
      onProgress({
        receivedBytes: bytes,
        mbps: (bytes * 8) / (now - start) / 1000,
      });
      lastReport = now;
    }
  }
  const ms = performance.now() - start;
  return { bytes, ms, mbps: ms > 0 ? (bytes * 8) / ms / 1000 : 0 };
}

/**
 * 上传测速：no-cors POST 数据块。
 * 浏览器不会给 no-cors 响应，但请求体确实被发出，按耗时计算吞吐；
 * 目标可能返回 4xx/5xx，不影响计时（超时才算失败）。
 */
export async function uploadSpeed(
  url: string,
  sizeBytes: number,
): Promise<UploadResult> {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type: "text/plain" });
  const start = performance.now();
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      cache: "no-store",
      body: blob,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    // no-cors 请求失败（目标拒绝）也会 reject 吗？opaque 响应会 resolve；
    // 只有网络级失败/超时会走到这里
    const ms = performance.now() - start;
    if (ms > 120_000) throw new Error("上传超时");
  }
  const ms = performance.now() - start;
  return { bytes: sizeBytes, ms, mbps: ms > 0 ? (sizeBytes * 8) / ms / 1000 : 0 };
}

/** 常用测速端点（支持 CORS / 可 POST） */
export const DEFAULT_DOWNLOAD_URLS = [
  {
    label: "Cloudflare（100MB）",
    url: "https://speed.cloudflare.com/__down?bytes=104857600",
  },
  {
    label: "Cloudflare（10MB）",
    url: "https://speed.cloudflare.com/__down?bytes=10485760",
  },
];

export const DEFAULT_UPLOAD_URLS = [
  { label: "Cloudflare 上传端点", url: "https://speed.cloudflare.com/__up" },
];
