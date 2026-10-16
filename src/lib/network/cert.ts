/**
 * 证书信息工具。
 *
 * 两种能力：
 * - 本地解析：粘贴 PEM 证书，用 @peculiar/x509 解析（主题、颁发者、有效期、SAN 等），纯本地可靠
 * - 在线查询：crt.sh 证书透明度日志按域名查询（可能受浏览器 CORS 限制，失败会提示）
 */
import {
  SubjectAlternativeNameExtension,
  X509Certificate,
} from "@peculiar/x509";

export interface ParsedCert {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  /** 距离过期天数（负数表示已过期） */
  daysLeft: number;
  expired: boolean;
  signatureAlgorithm: string;
  /** 主题备用名称（DNS / IP 等） */
  subjectAltNames: string[];
  /** 归一化后的 PEM（含换行） */
  pem: string;
}

/** 解析 PEM 证书文本；非法输入抛错 */
export function parseCertificatePem(pem: string): ParsedCert {
  const trimmed = pem.trim();
  if (!trimmed) throw new Error("请输入证书 PEM 内容");
  const cert = new X509Certificate(trimmed);
  let subjectAltNames: string[] = [];
  try {
    const ext = cert.getExtensions(SubjectAlternativeNameExtension)[0];
    if (ext) {
      // AsnArray 运行时是真正的 Array（TS 类型未暴露数组方法，强转）
      const names = ext.names as unknown as Array<{
        dNSName?: string;
        iPAddress?: string;
        rfc822Name?: string;
        uniformResourceIdentifier?: string;
      }>;
      subjectAltNames = names
        .map((n) =>
          n.dNSName ?? n.iPAddress ?? n.rfc822Name ?? n.uniformResourceIdentifier ?? String(n),
        )
        .filter((s) => s.length > 0);
    }
  } catch {
    subjectAltNames = [];
  }
  const now = Date.now();
  const notAfter = cert.notAfter;
  const daysLeft = Math.ceil((notAfter.getTime() - now) / 86_400_000);
  return {
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    notBefore: cert.notBefore.toISOString(),
    notAfter: notAfter.toISOString(),
    daysLeft,
    expired: notAfter.getTime() < now,
    signatureAlgorithm: cert.signatureAlgorithm.name,
    subjectAltNames,
    pem: cert.toString("pem"),
  };
}

/** crt.sh 返回的单条证书记录 */
export interface CrtShEntry {
  id: number;
  loggedAt: string;
  notBefore: string;
  notAfter: string;
  commonName: string;
  /** 可能含多个名称，分号分隔 */
  nameValue: string;
  issuerName: string;
}

// ===== 获取通道：直连 + 公共 CORS 代理回退 =====

/**
 * 证书类公开 API（SSL Labs / crt.sh）均不返回 CORS 头，浏览器直连必被拦截。
 * 因此按顺序尝试：直连 → allorigins 代理 → codetabs 代理，任一通道成功即用。
 * 注意：经公共代理转发意味着查询的域名会出现在代理服务方的日志中。
 */
const FETCH_CHANNELS: Array<{ name: string; wrap: (url: string) => string }> = [

  { name: "直连", wrap: (url) => url },
  {
    name: "allorigins 代理",
    wrap: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    name: "codetabs 代理",
    wrap: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  },
];

/** SSL Labs 通道缓存：首次成功的通道在后续轮询中复用 */
let sslLabsChannel: ((url: string) => string) | null = null;

/** 按通道顺序尝试获取目标 URL（返回首个 ok 的 Response）；全部失败抛最后一个错误 */
async function fetchViaChannels(
  url: string,
  channels: Array<{ name: string; wrap: (url: string) => string }>,
  timeoutMs = 15_000,
): Promise<{ res: Response; wrap: (url: string) => string }> {
  let lastErr: unknown;
  for (const channel of channels) {
    try {
      const res = await fetch(channel.wrap(url), {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return { res, wrap: channel.wrap };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("所有获取通道均失败");
}

/**
 * 按域名查询证书透明度日志（crt.sh）。
 * 该接口可能被浏览器 CORS 拦截；失败抛错由页面提示。
 */
export async function queryCrtSh(domain: string): Promise<CrtShEntry[]> {
  const trimmed = domain.trim();
  if (!trimmed) throw new Error("请输入域名");
  const crtUrl = `https://crt.sh/?q=${encodeURIComponent(trimmed)}&output=json`;
  const { res } = await fetchViaChannels(crtUrl, FETCH_CHANNELS, 20_000);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data)) throw new Error("crt.sh 返回数据格式异常");
  return data.map((d) => ({
    id: Number(d.id ?? 0),
    loggedAt: String(d.logged_at ?? ""),
    notBefore: String(d.not_before ?? ""),
    notAfter: String(d.not_after ?? ""),
    commonName: String(d.common_name ?? ""),
    nameValue: String(d.name_value ?? ""),
    issuerName: String(d.issuer_name ?? ""),
  }));
}

// ===== 实时证书查询（SSL Labs API）=====

/** 实时证书统一结果 */
export interface LiveCert {
  domain: string;
  subject: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  /** 距过期天数（负数表示已过期） */
  daysLeft: number;
  expired: boolean;
  signatureAlgorithm: string;
  subjectAltNames: string[];
  /** 数据来源：ssllabs 实时分析 / crt.sh 证书透明度日志 */
  source: "ssllabs" | "crtsh";
}

interface SslLabsCerts {
  subject?: string;
  commonNames?: string[];
  notBefore?: number;
  notAfter?: number;
  issuerLabel?: string;
  issuerCN?: string;
  issuerOrg?: string;
  sAN?: Array<Record<string, unknown>>;
}

interface SslLabsEndpoint {
  statusMessage?: string;
  details?: {
    status?: string;
    certs?: SslLabsCerts[];
  };
}

interface SslLabsResult {
  status?: string;
  statusMessage?: string;
  endpoints?: SslLabsEndpoint[];
}

/** 毫秒时间戳 → ISO 字符串；非法返回空串 */
function msToIso(ms: unknown): string {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : "";
}

function daysFromIso(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

/** 调用一次 SSL Labs analyze（startNew 可选：强制重新分析而非读缓存） */
async function sslLabsAnalyze(
  domain: string,
  startNew: boolean,
  onStatus?: (status: string) => void,
): Promise<SslLabsResult> {
  const params = new URLSearchParams({
    host: domain,
    all: "done",
    ignoreMismatch: "on",
  });
  if (startNew) params.set("startNew", "on");
  const url = `https://api.ssllabs.com/api/v3/analyze?${params}`;
  const channels = sslLabsChannel
    ? [{ name: "已缓存通道", wrap: sslLabsChannel }, ...FETCH_CHANNELS]
    : FETCH_CHANNELS;
  const { res, wrap } = await fetchViaChannels(url, channels);
  if (!sslLabsChannel) {
    sslLabsChannel = wrap;
    onStatus?.("SSL Labs 通道建立成功");
  }
  return (await res.json()) as SslLabsResult;
}

/** 从 SSL Labs 结果中提取叶子证书；未就绪返回 null */
function pickSslLabsCert(result: SslLabsResult): LiveCert | null {
  if (result.status === "ERROR") {
    throw new Error(`SSL Labs 分析失败：${result.statusMessage || "未知原因"}`);
  }
  const cert = result.endpoints?.[0]?.details?.certs?.[0];
  if (!cert) return null;
  const notBefore = msToIso(cert.notBefore);
  const notAfter = msToIso(cert.notAfter);
  const san = (cert.sAN ?? [])
    .map((n) => String(n.DNSName ?? n.iPAddress ?? ""))
    .filter((s) => s.length > 0);
  const domain = cert.commonNames?.[0] ?? san[0] ?? "";
  return {
    domain,
    subject: cert.subject ?? domain,
    issuer:
      cert.issuerLabel ??
      [cert.issuerOrg, cert.issuerCN].filter(Boolean).join(" ") ??
      "",
    notBefore,
    notAfter,
    daysLeft: daysFromIso(notAfter),
    expired: new Date(notAfter).getTime() < Date.now(),
    signatureAlgorithm: "",
    subjectAltNames: san,
    source: "ssllabs",
  };
}

/**
 * 实时查询域名当前生效的 TLS 证书。
 *
 * 主路径：SSL Labs API 实时分析（轮询至 READY，首次约 30~90 秒，信息最全）；
 * 回退：SSL Labs 不可达（CORS / 网络 / 超时）时改用 crt.sh 最新记录（近似当前证书）。
 * 注意：浏览器无 API 可直接读取任意站点 TLS 证书，必须依赖第三方服务。
 */
export async function fetchLiveCertificate(
  domain: string,
  opts?: { onStatus?: (status: string) => void; startNew?: boolean },
): Promise<LiveCert> {
  const trimmed = domain.trim();
  if (!trimmed) throw new Error("请输入域名");
  const onStatus = opts?.onStatus;
  const startNew = opts?.startNew ?? true;
  let sslLabsError: unknown;

  try {
    onStatus?.("已提交 SSL Labs 分析任务…");
    await sslLabsAnalyze(trimmed, startNew, onStatus);
    for (let i = 0; i < 24; i++) {
      onStatus?.(`SSL Labs 分析中…（第 ${i + 1} 次轮询，首次约需 30~90 秒）`);
      const result = await sslLabsAnalyze(trimmed, false, onStatus);
      const cert = pickSslLabsCert(result);
      if (cert) {
        return {
          ...cert,
          domain: trimmed,
          signatureAlgorithm: cert.signatureAlgorithm || "—",
        };
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error("SSL Labs 分析超时，请稍后重试或使用「历史证书查询」");
  } catch (err) {
    // SSL Labs 全线不可达（CORS / 网络 / 超时）→ 回退 crt.sh 取最新记录（近似当前）
    onStatus?.("SSL Labs 不可达，改用 crt.sh 最新记录（近似当前证书）…");
  }

  // ---- 回退：crt.sh 取过期时间最新的记录 ----
  const sslLabsReason = sslLabsError instanceof Error ? sslLabsError.message : "未知错误";
  let entries: CrtShEntry[];
  try {
    entries = await queryCrtSh(trimmed);
  } catch {
    throw new Error(`SSL Labs 不可达（${sslLabsReason}），CT 日志也不可用`);
  }
  if (!entries.length) {
    throw new Error(`SSL Labs 不可达（${sslLabsReason}），且 CT 日志无记录`);
  }
  const latest = [...entries].sort(
    (a, b) => new Date(b.notAfter).getTime() - new Date(a.notAfter).getTime(),
  )[0];
  const notAfter = latest.notAfter ? new Date(latest.notAfter).toISOString() : "";
  const daysLeft = daysFromIso(notAfter);
  return {
    domain: trimmed,
    subject: latest.commonName || trimmed,
    issuer: latest.issuerName || "",
    notBefore: latest.notBefore ? new Date(latest.notBefore).toISOString() : "",
    notAfter,
    daysLeft,
    expired: new Date(notAfter).getTime() < Date.now(),
    signatureAlgorithm: "",
    subjectAltNames: latest.nameValue
      ? latest.nameValue.split(/\s+/).filter(Boolean)
      : [],
    source: "crtsh",
  };
}