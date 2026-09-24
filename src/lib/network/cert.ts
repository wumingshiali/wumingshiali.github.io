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

/**
 * 按域名查询证书透明度日志（crt.sh）。
 * 该接口可能被浏览器 CORS 拦截；失败抛错由页面提示。
 */
export async function queryCrtSh(domain: string): Promise<CrtShEntry[]> {
  const trimmed = domain.trim();
  if (!trimmed) throw new Error("请输入域名");
  const res = await fetch(
    `https://crt.sh/?q=${encodeURIComponent(trimmed)}&output=json`,
    { signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) throw new Error(`crt.sh 请求失败（HTTP ${res.status}）`);
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
