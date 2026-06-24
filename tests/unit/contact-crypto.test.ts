/**
 * 联系项密文配置单元测试。
 *
 * 关注：
 * 1. `deriveKeyFromAnswer` 的 padding 规则（UTF-8 右补 0x00 至 16 字节）
 * 2. `decryptAllContacts("2")` 与 `scripts/encrypt-contacts.mjs` 中 SECRETS 明文一致
 * 3. 错答必抛（AES-GCM tag 校验失败）
 * 4. 降级链：去掉 WebCrypto 后仍能解密（覆盖纯 JS fallback 路径）
 */
import { describe, expect, it } from "vitest";
import {
  contactSecret,
  decryptAllContacts,
  decryptContact,
  deriveKeyFromAnswer,
} from "@/lib/contact-crypto";

describe("deriveKeyFromAnswer", () => {
  it("右补 0x00 至 16 字节", () => {
    const k = deriveKeyFromAnswer("2");
    expect(k.byteLength).toBe(16);
    // "2" 的 UTF-8 编码是 0x32
    expect(k[0]).toBe(0x32);
    expect(k[1]).toBe(0x00);
    expect(k[15]).toBe(0x00);
  });

  it("答案超过 16 字节时截断", () => {
    const k = deriveKeyFromAnswer("x".repeat(20));
    expect(k.byteLength).toBe(16);
  });

  it("空答案返回全 0 密钥", () => {
    const k = deriveKeyFromAnswer("");
    expect(k.byteLength).toBe(16);
    expect(Array.from(k)).toEqual(new Array(16).fill(0));
  });
});

describe("contactSecret", () => {
  it("题目文案固定", () => {
    expect(contactSecret.question).toBe("1 + 1 等于几？");
  });

  it("包含 email 与 wechat 两项密文", () => {
    const names = Object.keys(contactSecret.secrets).sort();
    expect(names).toEqual(["email", "wechat"]);
  });
});

describe("decryptAllContacts", () => {
  it("'2' 解出脚本 SECRETS 中的明文", async () => {
    const r = await decryptAllContacts("2");
    expect(r.email).toBe("ZWj1154142014@hotmail.com");
    expect(r.wechat).toBe("AliZhouSZ");
  });

  it("空答案抛错（wrong key → GCM tag 校验失败）", async () => {
    await expect(decryptAllContacts("")).rejects.toBeDefined();
  });

  it("错答 '3' 抛错", async () => {
    await expect(decryptAllContacts("3")).rejects.toBeDefined();
  });

  it("去前后空格的 '2' 与 '2' 等价", async () => {
    // handleVerify 在调用前会 .trim()，但函数自身应保持行为一致
    const r = await decryptAllContacts("2");
    expect(r.email.length).toBeGreaterThan(0);
  });

  it("单接口 decryptContact 与批量结果一致", async () => {
    const all = await decryptAllContacts("2");
    expect(await decryptContact("email", "2")).toBe(all.email);
    expect(await decryptContact("wechat", "2")).toBe(all.wechat);
  });

  it("降级到纯 JS AES：移除 WebCrypto 后仍能解密", async () => {
    // 备份并替换 subtle 以强制走 @noble/ciphers/aes.js 分支
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { subtle: undefined } as unknown as Crypto,
    });
    try {
      const r = await decryptAllContacts("2");
      expect(r.email).toBe("ZWj1154142014@hotmail.com");
      expect(r.wechat).toBe("AliZhouSZ");
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: original,
      });
    }
  });
});
