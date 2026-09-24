/**
 * 本地测速。
 *
 * - 下载：读响应流累计字节数 / 耗时计算吞吐；进度按响应 Content-Length 动态计算
 *   （需目标支持 CORS 才能读到 body）
 * - 上传：no-cors POST 一个数据块，按「发出请求到完成」计时计算吞吐
 *   （no-cors 下 Content-Type 必须为简单类型，用 text/plain 数据块）
 */

export interface DownloadResult {
  bytes: number;
  /** 预期总大小（Content-Length），未知为 null */
  totalBytes: number | null;
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
  /** 预期总大小（Content-Length），未知为 null */
  totalBytes: number | null;
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
  // Content-Length 属于 CORS 安全响应头，可跨域读取；chunked 响应则为 null
  const lenHeader = res.headers.get("content-length");
  const parsedLen = lenHeader ? Number(lenHeader) : NaN;
  const totalBytes = Number.isFinite(parsedLen) && parsedLen > 0 ? parsedLen : null;
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
        totalBytes,
        mbps: (bytes * 8) / (now - start) / 1000,
      });
      lastReport = now;
    }
  }
  const ms = performance.now() - start;
  return { bytes, totalBytes, ms, mbps: ms > 0 ? (bytes * 8) / ms / 1000 : 0 };
}

/**
 * 上传测速：no-cors POST 数据块。
 * 浏览器不会给 no-cors 响应，但请求体确实被发出，按耗时计算吞吐；
 * 目标返回 4xx/5xx 不影响计时，但网络级失败（拒绝/超时）会抛错，
 * 避免把「请求瞬间失败」误算成极高的上传速度。
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
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("上传超时，请更换支持上传的测速地址");
    }
    throw new Error("上传请求失败（网络错误或被目标拦截）");
  }
  const ms = performance.now() - start;
  return { bytes: sizeBytes, ms, mbps: ms > 0 ? (sizeBytes * 8) / ms / 1000 : 0 };
}

/** 常用下载测速端点（均实测支持 CORS，国内+海外） */
export const DEFAULT_DOWNLOAD_URLS = [
  {
    label: "Cloudflare（100MB）",
    url: "https://speed.cloudflare.com/__down?bytes=104857600",
  },
  {
    label: "Cloudflare（10MB）",
    url: "https://speed.cloudflare.com/__down?bytes=10485760",
  },
  {
    label: "NPMMirror 淘宝镜像（32MB）",
    url: "https://registry.npmmirror.com/@ffmpeg/core/0.12.10/files/dist/esm/ffmpeg-core.wasm",
  },
  {
    label: "JSDMirror 国内镜像（32MB）",
    url: "https://cdn.jsdmirror.com/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
  },
];

export const DEFAULT_UPLOAD_URLS = [
  { label: "Cloudflare 上传端点", url: "https://speed.cloudflare.com/__up" },
];
