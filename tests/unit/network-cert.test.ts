/**
 * 实时证书查询单元测试。
 *
 * 通过 mock fetch 覆盖三条路径：
 * - SSL Labs 直接 READY：解析当前生效证书
 * - SSL Labs ERROR：自动回退 crt.sh（取过期时间最新的记录）
 * - 全部失败：抛错
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLiveCertificate, queryCrtSh } from "@/lib/network/cert";

const originalFetch = globalThis.fetch;

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200 });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchLiveCertificate 实时证书查询", () => {
  it("SSL Labs READY：解析当前生效证书（来源 ssllabs）", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.ssllabs.com")) {
        return jsonResponse({
          status: "READY",
          endpoints: [
            {
              details: {
                certs: [
                  {
                    subject: "/CN=example.com",
                    commonNames: ["example.com"],
                    notBefore: Date.UTC(2026, 0, 1),
                    notAfter: Date.UTC(2027, 0, 1),
                    issuerLabel: "Let's Encrypt",
                    issuerCN: "R11",
                    sAN: [{ DNSName: "example.com" }, { DNSName: "www.example.com" }],
                  },
                ],
              },
            },
          ],
        });
      }
      throw new TypeError("unexpected request: " + url);
    }) as unknown as typeof fetch;

    const cert = await fetchLiveCertificate("example.com");
    expect(cert.source).toBe("ssllabs");
    expect(cert.subject).toBe("/CN=example.com");
    expect(cert.issuer).toBe("Let's Encrypt");
    expect(cert.subjectAltNames).toContain("www.example.com");
    expect(cert.expired).toBe(false);
    expect(cert.daysLeft).toBeGreaterThan(0);
  });

  it("SSL Labs ERROR：自动回退 crt.sh 取过期时间最新的记录", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.ssllabs.com")) {
        return jsonResponse({ status: "ERROR", statusMessage: "no handshake" });
      }
      if (url.includes("crt.sh")) {
        return jsonResponse([
          {
            id: 2,
            common_name: "example.com",
            not_before: "2026-01-01",
            not_after: "2027-01-01",
            issuer_name: "Let's Encrypt",
            name_value: "example.com\nwww.example.com",
          },
          {
            id: 1,
            common_name: "old.example.com",
            not_before: "2025-01-01",
            not_after: "2025-06-01",
            issuer_name: "Old CA",
            name_value: "old.example.com",
          },
        ]);
      }
      throw new TypeError("unexpected request: " + url);
    }) as unknown as typeof fetch;

    const cert = await fetchLiveCertificate("example.com");
    expect(cert.source).toBe("crtsh");
    expect(cert.subject).toBe("example.com");
    expect(cert.notAfter).toContain("2027");
  });

  it("全部数据源失败：抛错", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    await expect(fetchLiveCertificate("example.com")).rejects.toThrow(/SSL Labs|CT 日志|不可达/);
  });

  it("空域名：抛错", async () => {
    await expect(fetchLiveCertificate("  ")).rejects.toThrow("请输入域名");
  });
});

describe("queryCrtSh 历史证书查询", () => {
  it("解析 crt.sh 记录（含多 SAN 拆分前的原始文本）", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("crt.sh")) {
        return jsonResponse([
          {
            id: 7,
            common_name: "example.com",
            not_before: "2026-01-01",
            not_after: "2027-01-01",
            issuer_name: "Let's Encrypt",
            name_value: "example.com\nwww.example.com",
          },
        ]);
      }
      throw new TypeError("unexpected request");
    }) as unknown as typeof fetch;

    const entries = await queryCrtSh("example.com");
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(7);
    expect(entries[0].notAfter).toBe("2027-01-01");
    expect(entries[0].nameValue).toContain("www.example.com");
  });

  it("空域名抛错", async () => {
    await expect(queryCrtSh("  ")).rejects.toThrow("请输入域名");
  });
});
it("直连被 CORS 拦截时自动切换 allorigins 代理通道", async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    // 直连 api.ssllabs.com：模拟浏览器 CORS 拦截（Firefox NetworkError）
    if (url.startsWith("https://api.ssllabs.com")) {
      throw new TypeError("NetworkError when attempting to fetch resource.");
    }
    // allorigins 代理通道：返回 READY
    if (url.includes("allorigins.win")) {
      return jsonResponse({
        status: "READY",
        endpoints: [
          {
            details: {
              certs: [
                {
                  subject: "/CN=example.com",
                  commonNames: ["example.com"],
                  notBefore: Date.UTC(2026, 0, 1),
                  notAfter: Date.UTC(2027, 0, 1),
                  issuerLabel: "Let's Encrypt",
                  sAN: [{ DNSName: "example.com" }],
                },
              ],
            },
          },
        ],
      });
    }
    throw new TypeError("unexpected request: " + url);
  }) as unknown as typeof fetch;

  const cert = await fetchLiveCertificate("example.com");
  expect(cert.source).toBe("ssllabs");
  expect(cert.subject).toBe("/CN=example.com");
});
